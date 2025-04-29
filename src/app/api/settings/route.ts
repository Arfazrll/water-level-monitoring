import { NextResponse } from 'next/server';
import { ThresholdSettings } from '@/lib/types';

// Default settings for demonstration
const defaultSettings: ThresholdSettings = {
  warningLevel: 70,
  dangerLevel: 90,
  maxLevel: 100,
  minLevel: 0,
  pumpActivationLevel: 80,
  pumpDeactivationLevel: 40,
  unit: 'cm'
};

// In a real app, this would be stored in a database
let currentSettings = { ...defaultSettings };

export async function GET() {
  try {
    return NextResponse.json(currentSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate the settings
    if (!isValidSettings(body)) {
      return NextResponse.json(
        { error: 'Invalid settings data' },
        { status: 400 }
      );
    }
    
    // Update the settings
    currentSettings = {
      ...currentSettings,
      ...body
    };
    
    return NextResponse.json(currentSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// Helper function to validate settings
function isValidSettings(settings: Partial<ThresholdSettings>): boolean {
  // Check if the required fields are present and are numbers
  const requiredNumericFields: (keyof ThresholdSettings)[] = [
    'warningLevel',
    'dangerLevel',
    'maxLevel',
    'minLevel',
    'pumpActivationLevel',
    'pumpDeactivationLevel'
  ];
  
  for (const field of requiredNumericFields) {
    if (settings[field] !== undefined && typeof settings[field] !== 'number') {
      return false;
    }
  }
  
  // Check that warning level is less than danger level
  if (
    settings.warningLevel !== undefined && 
    settings.dangerLevel !== undefined && 
    settings.warningLevel >= settings.dangerLevel
  ) {
    return false;
  }
  
  // Check that pump deactivation level is less than pump activation level
  if (
    settings.pumpDeactivationLevel !== undefined && 
    settings.pumpActivationLevel !== undefined && 
    settings.pumpDeactivationLevel >= settings.pumpActivationLevel
  ) {
    return false;
  }
  
  // Check that thresholds are within min/max range
  if (settings.minLevel !== undefined && settings.maxLevel !== undefined) {
    if (settings.minLevel >= settings.maxLevel) {
      return false;
    }
    
    if (settings.warningLevel !== undefined && 
        (settings.warningLevel < settings.minLevel || settings.warningLevel > settings.maxLevel)) {
      return false;
    }
    
    if (settings.dangerLevel !== undefined && 
        (settings.dangerLevel < settings.minLevel || settings.dangerLevel > settings.maxLevel)) {
      return false;
    }
    
    if (settings.pumpActivationLevel !== undefined && 
        (settings.pumpActivationLevel < settings.minLevel || settings.pumpActivationLevel > settings.maxLevel)) {
      return false;
    }
    
    if (settings.pumpDeactivationLevel !== undefined && 
        (settings.pumpDeactivationLevel < settings.minLevel || settings.pumpDeactivationLevel > settings.maxLevel)) {
      return false;
    }
  }
  
  return true;
}