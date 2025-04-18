import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
// Removed: import { verifyToken } from '@/lib/authUtils'; // Import shared verify function
// Removed: import { Buffer } from 'buffer';

// Removed: export const runtime = 'nodejs'; // No longer forcing Node.js

const SECRET_KEY = process.env.JWT_SECRET;

// Helper to decode Base64 URL (using atob for Edge compatibility)
function base64UrlDecode(input: string): Uint8Array {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(input);
  const buffer = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    buffer[i] = decoded.charCodeAt(i);
  }
  return buffer;
}

// Helper to decode JWT payload (using atob for Edge compatibility)
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Decode Base64 URL string using atob
    const decoded = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    // Convert decoded string to UTF-8
    const utf8Decoded = new TextDecoder().decode(
      Uint8Array.from(decoded, c => c.charCodeAt(0))
    );
    return JSON.parse(utf8Decoded);
  } catch (error) {
    console.error('Error decoding JWT payload:', error);
    return null;
  }
}

// Function to verify JWT using Web Crypto API (HS256)
async function verifyToken(token: string): Promise<any> {
  if (!SECRET_KEY) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid token structure');
      return null;
    }

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(SECRET_KEY),
      { name: 'HMAC', hash: 'SHA-256' },
      false, // not extractable
      ['verify']
    );

    const dataToVerify = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = base64UrlDecode(parts[2]); // Use updated decoder

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      dataToVerify
    );

    if (!isValid) {
      console.error('JWT signature verification failed');
      return null;
    }

    // If signature is valid, decode and return the payload
    return decodeJwtPayload(token); // Use updated decoder

  } catch (error) {
    console.error('JWT Verification Error (Web Crypto):', error);
    return null; // Token is invalid or error occurred
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // During development, allow access to home page
  if (pathname === '/') {
    return NextResponse.next();
  }
  
  // Get token from cookies 
  // **IMPORTANT**: Assumes login sets an httpOnly cookie named 'jwt_token'. 
  // Current implementation uses localStorage, which middleware CANNOT access.
  // Login flow needs refactoring to set cookie for this middleware to work.
  const token = request.cookies.get('jwt_token')?.value;

  let isAuthenticated = false;
  if (token) {
    const payload = await verifyToken(token); // Use shared function
    isAuthenticated = !!payload;
  }

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  // If user is authenticated
  if (isAuthenticated) {
    // If trying to access login/register page, redirect to home
    if (isAuthPage) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    // Otherwise, allow access to requested page
    return NextResponse.next();
  }

  // If user is NOT authenticated
  // If trying to access an auth page, allow access
  if (isAuthPage) {
    return NextResponse.next();
  }
  
  // If trying to access a protected page, redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * -images (image files)
     */
    '/((?!_next/static|_next/image|favicon.ico|images).*)\'',
    // Match the root path explicitly if needed
    '/', // Ensure root path is explicitly matched
  ],
}; 