// FrontEnd/src/app/api/sensor/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Log data dari ESP32
    console.log('Data dari ESP32:', body);
    
    // Verifikasi format data
    if (!body.distance && typeof body.distance !== 'number') {
      return NextResponse.json(
        { success: false, message: 'Format data tidak valid, distance diperlukan' },
        { status: 400 }
      );
    }
    
    // Forward data ke backend
    const response = await fetch(`${BACKEND_URL}/esp32/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    // Parse response
    const result = await response.json();
    
    // Return response ke ESP32
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error memproses data sensor:', error);
    return NextResponse.json(
      { success: false, message: 'Error memproses data' },
      { status: 500 }
    );
  }
}