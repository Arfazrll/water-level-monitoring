import { NextResponse } from 'next/server';

// In a real app, this would interact with IoT device APIs
// For demo purposes, we'll just track the state in memory
let pumpMode = 'auto'; // 'auto' or 'manual'

export async function GET() {
  try {
    return NextResponse.json({ mode: pumpMode });
  } catch (error) {
    console.error('Error fetching pump mode:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pump mode' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate the request
    if (!body.mode || (body.mode !== 'auto' && body.mode !== 'manual')) {
      return NextResponse.json(
        { error: 'Invalid pump mode. Must be "auto" or "manual"' },
        { status: 400 }
      );
    }
    
    // Update the pump mode
    pumpMode = body.mode;
    
    // In a real implementation, this would send a command to the IoT device
    
    return NextResponse.json({ mode: pumpMode });
  } catch (error) {
    console.error('Error setting pump mode:', error);
    return NextResponse.json(
      { error: 'Failed to set pump mode' },
      { status: 500 }
    );
  }
}