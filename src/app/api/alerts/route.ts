import { NextResponse } from 'next/server';
import { AlertData } from '@/lib/types';

// Mock data for demonstration
const mockAlerts: AlertData[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    level: 75.5,
    type: 'warning',
    message: 'Water level has reached warning threshold (75.5 cm)',
    acknowledged: true
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    level: 92.3,
    type: 'danger',
    message: 'Water level has reached danger threshold (92.3 cm)',
    acknowledged: false
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    level: 72.1,
    type: 'warning',
    message: 'Water level has reached warning threshold (72.1 cm)',
    acknowledged: true
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    level: 89.7,
    type: 'danger',
    message: 'Water level has reached danger threshold (89.7 cm)',
    acknowledged: true
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    level: 74.3,
    type: 'warning',
    message: 'Water level has reached warning threshold (74.3 cm)',
    acknowledged: true
  }
];

export async function GET(request: Request) {
  try {
    // Get the URL parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const acknowledged = searchParams.get('acknowledged');
    
    // Filter alerts based on query parameters
    let filteredAlerts = [...mockAlerts];
    
    if (type === 'warning' || type === 'danger') {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
    }
    
    if (acknowledged === 'true') {
      filteredAlerts = filteredAlerts.filter(alert => alert.acknowledged);
    } else if (acknowledged === 'false') {
      filteredAlerts = filteredAlerts.filter(alert => !alert.acknowledged);
    }
    
    // Sort by timestamp (newest first)
    filteredAlerts.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    return NextResponse.json(filteredAlerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // In a real implementation, this would create a new alert
    const body = await request.json();
    
    // Validate required fields
    if (!body.level || !body.type || !body.message) {
      return NextResponse.json(
        { error: 'Invalid alert data' },
        { status: 400 }
      );
    }
    
    // Create a new alert
    const newAlert: AlertData = {
      id: (mockAlerts.length + 1).toString(),
      timestamp: new Date().toISOString(),
      level: body.level,
      type: body.type,
      message: body.message,
      acknowledged: false
    };
    
    // In a real app, you would save this to a database
    mockAlerts.unshift(newAlert);
    
    return NextResponse.json(
      { message: 'Alert created successfully', data: newAlert },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}