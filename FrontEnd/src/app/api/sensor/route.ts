// FrontEnd/src/app/api/sensor/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function POST(request: NextRequest) {
  try {
    // Parse request body dengan lebih banyak logging
    const bodyText = await request.text();
    console.log('Raw body received:', bodyText);
    
    let body;
    try {
      body = JSON.parse(bodyText);
      console.log('Parsed request body:', body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { success: false, message: 'Format data tidak valid, JSON tidak dapat diparse' },
        { status: 400 }
      );
    }
    
    // Verifikasi format data
    if (body.distance === undefined && (!body.device || !body.device.id)) {
      console.log('Invalid data format:', body);
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Format data tidak valid, distance diperlukan',
          receivedData: body
        },
        { status: 400 }
      );
    }
    
    // Log data untuk debugging
    console.log('Data valid dari ESP32:', body);
    
    // Forward data ke backend
    console.log(`Forwarding data to: ${BACKEND_URL}/esp32/data`);
    
    const response = await fetch(`${BACKEND_URL}/esp32/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    // Parse response
    const responseText = await response.text();
    console.log('Raw response from backend:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing backend response:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Error parsing backend response',
          error: responseText
        },
        { status: 500 }
      );
    }
    
    // Return response ke ESP32
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error memproses data sensor:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error memproses data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}