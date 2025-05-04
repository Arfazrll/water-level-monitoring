import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method; // Mengakses method dari request langsung
  
  // Intercept POST requests ke /dashboard dan mengarahkan ke /api/sensor
  if (pathname === '/dashboard' && method === 'POST') {
    const url = request.nextUrl.clone();
    url.pathname = '/api/sensor'; // Menulis ulang URL ke /api/sensor
    return NextResponse.rewrite(url); // Melakukan rewrite URL
  }
  
  // Jika bukan POST ke /dashboard, lanjutkan ke handler berikutnya
  return NextResponse.next();
}

// Konfigurasi middleware untuk intercept hanya rute yang diperlukan
export const config = {
  matcher: ['/dashboard'], // Menerapkan middleware hanya untuk /dashboard
};
