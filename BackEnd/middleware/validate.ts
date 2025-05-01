import { Request, Response, NextFunction } from 'express';
import { ThresholdSettings } from '../models/Setting';

export const validateThresholdSettings = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const settings: Partial<ThresholdSettings> = req.body;
    
    // Check required fields dengan pesan error yang lebih spesifik
    const requiredFields = ['warningLevel', 'dangerLevel', 'minLevel', 'maxLevel', 'pumpActivationLevel', 'pumpDeactivationLevel'];
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (settings[field as keyof ThresholdSettings] === undefined) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      res.status(400).json({ 
        success: false, 
        message: `Field berikut diperlukan: ${missingFields.join(', ')}`,
        error: 'VALIDATION_ERROR'
      });
      return; // Just return without the 'return res.status' pattern
    }
    
    // Validasi tipe data - pastikan values berupa angka
    const numericFields = requiredFields;
    const invalidTypeFields = [];
    
    for (const field of numericFields) {
      const value = settings[field as keyof ThresholdSettings];
      if (value !== undefined && (typeof value !== 'number' || isNaN(value))) {
        invalidTypeFields.push(field);
      }
    }
    
    if (invalidTypeFields.length > 0) {
      res.status(400).json({ 
        success: false, 
        message: `Field berikut harus berupa angka: ${invalidTypeFields.join(', ')}`,
        error: 'VALIDATION_ERROR' 
      });
      return;
    }
    
    // Logic validation dengan pesan error yang lebih spesifik
    if (settings.warningLevel! >= settings.dangerLevel!) {
      res.status(400).json({ 
        success: false,
        message: 'Level peringatan harus lebih rendah dari level bahaya',
        error: 'VALIDATION_ERROR'
      });
      return;
    }
    
    if (settings.pumpDeactivationLevel! >= settings.pumpActivationLevel!) {
      res.status(400).json({ 
        success: false,
        message: 'Level deaktivasi pompa harus lebih rendah dari level aktivasi pompa',
        error: 'VALIDATION_ERROR'
      });
      return;
    }
    
    if (settings.minLevel! >= settings.maxLevel!) {
      res.status(400).json({ 
        success: false,
        message: 'Level minimum harus lebih rendah dari level maksimum',
        error: 'VALIDATION_ERROR'
      });
      return;
    }
    
    // Check that all thresholds are within min/max range
    const outOfRangeFields = [];
    
    if (settings.warningLevel! < settings.minLevel! || settings.warningLevel! > settings.maxLevel!) {
      outOfRangeFields.push('warningLevel');
    }
    
    if (settings.dangerLevel! < settings.minLevel! || settings.dangerLevel! > settings.maxLevel!) {
      outOfRangeFields.push('dangerLevel');
    }
    
    if (settings.pumpActivationLevel! < settings.minLevel! || settings.pumpActivationLevel! > settings.maxLevel!) {
      outOfRangeFields.push('pumpActivationLevel');
    }
    
    if (settings.pumpDeactivationLevel! < settings.minLevel! || settings.pumpDeactivationLevel! > settings.maxLevel!) {
      outOfRangeFields.push('pumpDeactivationLevel');
    }
    
    if (outOfRangeFields.length > 0) {
      res.status(400).json({ 
        success: false,
        message: `Field berikut harus berada di antara minLevel dan maxLevel: ${outOfRangeFields.join(', ')}`,
        error: 'VALIDATION_ERROR'
      });
      return;
    }
    
    next();
  } catch (error) {
    // Validasi error handling yang lebih baik
    console.error('Validation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Terjadi kesalahan saat validasi pengaturan',
      error: error instanceof Error ? error.message : 'Unknown validation error'
    });
    // No return statement needed here
  }
};

export const validateWaterLevelData = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { level, unit } = req.body;
    
    // Validasi level: harus ada dan berupa angka yang valid
    if (level === undefined) {
      res.status(400).json({ 
        success: false,
        message: 'Nilai level air harus disediakan',
        error: 'VALIDATION_ERROR'
      });
      return;
    }
    
    if (typeof level !== 'number' || isNaN(level)) {
      res.status(400).json({ 
        success: false,
        message: 'Nilai level air harus berupa angka',
        error: 'VALIDATION_ERROR'
      });
      return;
    }
    
    // Validasi level: nilai tidak boleh negatif
    if (level < 0) {
      res.status(400).json({ 
        success: false,
        message: 'Nilai level air tidak boleh negatif',
        error: 'VALIDATION_ERROR'
      });
      return;
    }
    
    // Validasi unit jika ada
    if (unit !== undefined && typeof unit !== 'string') {
      res.status(400).json({ 
        success: false,
        message: 'Unit harus berupa string',
        error: 'VALIDATION_ERROR'
      });
      return;
    }
    
    // Set unit default jika tidak disediakan
    if (!unit) {
      req.body.unit = 'cm'; // Default unit if not provided
    }
    
    next();
  } catch (error) {
    // Validasi error handling
    console.error('Water level validation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Terjadi kesalahan saat validasi data level air',
      error: error instanceof Error ? error.message : 'Unknown validation error'
    });
    // No return statement needed here
  }
};