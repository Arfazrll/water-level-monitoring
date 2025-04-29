import { NextResponse } from 'next/server';
import { WaterLevelData } from '@/lib/types';

// Mock data for demonstration
const generateMockData = (count: number): WaterLevelData[] => {
  const data: WaterLevelData[] = [];
  const now = new Date();
  
  for (let i = count - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 3600000); // hourly data
    // Generate a wave pattern with some randomness
    const baseLevel = 50 + 20 * Math.sin(i / 4);
    const randomness = Math.random() * 10 - 5;
    const level = Math.max(0, Math.min(100, baseLevel + randomness));
    
    data.push({
      timestamp: timestamp.toISOString(),
      level: Math.round(level * 10) / 10, // Round to 1 decimal place
      unit: 'cm'
    });
  }
  
  return data;
};

export async function GET(request: Request) {
  try {
    // Get the URL parameters
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    
    // Parse the limit parameter
    const limit = limitParam ? parseInt(limitParam, 10) : 24;
    
    // Generate mock data (in a real app, this would fetch from a database)
    const data = generateMockData(limit);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching water level data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch water level data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // In a real implementation, this would validate and store
    // a new water level reading from an IoT device
    const body = await request.json();
    
    // Validate required fields
    if (!body.level || typeof body.level !== 'number') {
      return NextResponse.json(
        { error: 'Invalid water level data' },
        { status: 400 }
      );
    }
    
    // Create a new reading
    const newReading: WaterLevelData = {
      timestamp: new Date().toISOString(),
      level: body.level,
      unit: body.unit || 'cm'
    };
    
    // In a real app, you would save this to a database
    
    return NextResponse.json(
      { message: 'Water level data recorded successfully', data: newReading },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error recording water level data:', error);
    return NextResponse.json(
      { error: 'Failed to record water level data' },
      { status: 500 }
    );
  }
}