import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method; // Mengakses method dari request langsung
  
  if (pathname === '/dashboard' && method === 'POST') {
    const url = request.nextUrl.clone();
    url.pathname = '/api/sensor'; 
    return NextResponse.rewrite(url); 
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard'], 
};
