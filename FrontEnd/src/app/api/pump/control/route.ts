import { NextResponse } from 'next/server';

// In a real app, this would interact with IoT device APIs
// For demo purposes, we'll just track the state in memory
let pumpState = {
  isActive: false,
  mode: 'auto',
  lastActivated: null as string | null
};

export async function GET() {
  try {
    return NextResponse.json(pumpState);
  } catch (error) {
    console.error('Error fetching pump status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pump status' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate the request
    if (body.isActive === undefined || typeof body.isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid pump control data' },
        { status: 400 }
      );
    }
    
    // Update the pump state
    pumpState = {
      ...pumpState,
      isActive: body.isActive,
      lastActivated: body.isActive ? new Date().toISOString() : pumpState.lastActivated
    };
    
    // In a real implementation, this would send a command to the IoT device
    
    return NextResponse.json(pumpState);
  } catch (error) {
    console.error('Error controlling pump:', error);
    return NextResponse.json(
      { error: 'Failed to control pump' },
      { status: 500 }
    );
  }
}