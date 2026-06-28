import { NextResponse } from 'next/server';

export async function GET() {
  const apiEndpoint = process.env.NEXT_PUBLIC_API_URL || 'https://api.salonsflow.in';
  
  try {
    const res = await fetch(`${apiEndpoint}/`, { cache: 'no-store' });
    const text = await res.text();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      backendResponse: text
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message
    }, { status: 500 });
  }
}
