import express, { Request, Response } from 'express';
import PumpLog from '../../models/PumpLog';
import Settings from '../../models/Setting';
import WaterLevel from '../../models/WaterLevel';
import { protect } from '../../middleware/auth';
import { broadcastPumpStatus } from '../../services/wsService';

const router = express.Router();

// Store current pump state in memory
let pumpState = {
  isActive: false,
  mode: 'auto' as 'auto' | 'manual',
  lastActivated: null as string | null
};

// @route   GET /api/pump/status
// @desc    Get current pump status
// @access  Public
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Get the settings to return the current mode
    const settings = await Settings.findOne().lean();
    
    if (!settings) {
      res.status(404).json({ message: 'Settings not found' });
      return;
    }
    
    // Get the latest pump log entry to determine current state
    const latestPumpLog = await PumpLog.findOne()
      .sort({ createdAt: -1 })
      .lean();
    
    // Update pump state from database
    if (latestPumpLog) {
      pumpState.isActive = latestPumpLog.isActive;
      pumpState.mode = settings.pumpMode;
      pumpState.lastActivated = latestPumpLog.startTime ? latestPumpLog.startTime.toISOString() : null;
    }
    
    res.json(pumpState);
  } catch (error) {
    console.error('Error fetching pump status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/pump/control
// @desc    Control the pump (turn on/off)
// @access  Public (could be secured with auth in production)
router.post('/control', async (req: Request, res: Response) => {
  try {
    const { isActive } = req.body;
    
    if (isActive === undefined || typeof isActive !== 'boolean') {
      res.status(400).json({ message: 'Invalid pump control data' });
      return;
    }
    
    // Get current settings to check if manual control is allowed
    const settings = await Settings.findOne();
    
    if (!settings) {
      res.status(404).json({ message: 'Settings not found' });
      return;
    }
    
    if (settings.pumpMode === 'auto' && isActive !== pumpState.isActive) {
      res.status(400).json({ 
        message: 'Cannot manually control pump in auto mode',
        currentMode: 'auto'
      });
      return;
    }
    
    // If turning pump on and it's not already on
    if (isActive && !pumpState.isActive) {
      // Get current water level
      const currentLevel = await WaterLevel.findOne().sort({ createdAt: -1 });
      
      // Create a new pump log entry
      const pumpLog = new PumpLog({
        isActive: true,
        startTime: new Date(),
        activatedBy: settings.pumpMode,
        waterLevelAtActivation: currentLevel ? currentLevel.level : undefined
      });
      
      await pumpLog.save();
      
      // Update in-memory state
      pumpState = {
        isActive: true,
        mode: settings.pumpMode,
        lastActivated: new Date().toISOString()
      };
    } 
    // If turning pump off and it's currently on
    else if (!isActive && pumpState.isActive) {
      // Find the latest active pump log entry
      const latestActivePumpLog = await PumpLog.findOne({ 
        isActive: true, 
        endTime: { $exists: false } 
      }).sort({ startTime: -1 });
      
      if (latestActivePumpLog && latestActivePumpLog.startTime) {
        // Update the pump log entry
        const now = new Date();
        const duration = (now.getTime() - latestActivePumpLog.startTime.getTime()) / 1000; // in seconds
        
        latestActivePumpLog.isActive = false;
        latestActivePumpLog.endTime = now;
        latestActivePumpLog.duration = duration;
        
        await latestActivePumpLog.save();
      }
      
      // Create a deactivation log
      const pumpLog = new PumpLog({
        isActive: false,
        activatedBy: settings.pumpMode
      });
      
      await pumpLog.save();
      
      // Update in-memory state
      pumpState = {
        isActive: false,
        mode: settings.pumpMode,
        lastActivated: pumpState.lastActivated
      };
    }
    
    // Broadcast the pump status to WebSocket clients
    broadcastPumpStatus(pumpState);
    
    res.json(pumpState);
  } catch (error) {
    console.error('Error controlling pump:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/pump/mode
// @desc    Set pump mode (auto/manual)
// @access  Public (could be secured with auth in production)
router.post('/mode', async (req: Request, res: Response) => {
  try {
    const { mode } = req.body;
    
    if (!mode || (mode !== 'auto' && mode !== 'manual')) {
      res.status(400).json({ message: 'Invalid pump mode. Must be "auto" or "manual"' });
      return;
    }
    
    // Update settings
    const settings = await Settings.findOne();
    
    if (!settings) {
      res.status(404).json({ message: 'Settings not found' });
      return;
    }
    
    settings.pumpMode = mode;
    await settings.save();
    
    // Update in-memory state
    pumpState.mode = mode;
    
    // Handle auto mode activation logic
    if (mode === 'auto') {
      // Get the latest water level
      const currentLevel = await WaterLevel.findOne().sort({ createdAt: -1 });
      
      if (currentLevel) {
        // Check if pump should be activated based on current level
        const shouldActivate = currentLevel.level >= settings.thresholds.pumpActivationLevel;
        const shouldDeactivate = currentLevel.level <= settings.thresholds.pumpDeactivationLevel;
        
        // If water level is above activation threshold and pump is not active
        if (shouldActivate && !pumpState.isActive) {
          // Create a new pump log entry
          const pumpLog = new PumpLog({
            isActive: true,
            startTime: new Date(),
            activatedBy: 'auto',
            waterLevelAtActivation: currentLevel.level
          });
          
          await pumpLog.save();
          
          // Update in-memory state
          pumpState = {
            isActive: true,
            mode: 'auto',
            lastActivated: new Date().toISOString()
          };
          
          // Broadcast the pump status
          broadcastPumpStatus(pumpState);
        }
        // If water level is below deactivation threshold and pump is active
        else if (shouldDeactivate && pumpState.isActive) {
          // Find the latest active pump log entry
          const latestActivePumpLog = await PumpLog.findOne({ 
            isActive: true, 
            endTime: { $exists: false } 
          }).sort({ startTime: -1 });
          
          if (latestActivePumpLog && latestActivePumpLog.startTime) {
            // Update the pump log entry
            const now = new Date();
            const duration = (now.getTime() - latestActivePumpLog.startTime.getTime()) / 1000; // in seconds
            
            latestActivePumpLog.isActive = false;
            latestActivePumpLog.endTime = now;
            latestActivePumpLog.duration = duration;
            
            await latestActivePumpLog.save();
          }
          
          // Create a deactivation log
          const pumpLog = new PumpLog({
            isActive: false,
            activatedBy: 'auto'
          });
          
          await pumpLog.save();
          
          // Update in-memory state
          pumpState = {
            isActive: false,
            mode: 'auto',
            lastActivated: pumpState.lastActivated
          };
          
          // Broadcast the pump status
          broadcastPumpStatus(pumpState);
        }
      }
    }
    
    res.json({ mode: pumpState.mode });
  } catch (error) {
    console.error('Error setting pump mode:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;