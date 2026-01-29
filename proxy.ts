import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET_KEY = process.env.JWT_SECRET;

// Verify JWT using jose (Edge-compatible)
async function verifyToken(token: string): Promise<any> {
  if (!SECRET_KEY) {
    console.error('JWT_SECRET environment variable is not set');
    return null;
  }
  try {
    const secret = new TextEncoder().encode(SECRET_KEY);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return null;
  }
}


export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`[Proxy] Pathname: ${pathname}`);

  console.log(`[Proxy] Method: ${request.method}`);


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
  const isLoginPage = pathname.startsWith('/login');
  const isRegisterPage = pathname.startsWith('/register');
  const isLoginApi = pathname.startsWith('/api/auth/login');
  const isRegisterApi = pathname.startsWith('/api/auth/register');



  // Allow access to login/register pages and their corresponding API endpoints
  if (isLoginPage || isRegisterPage || isLoginApi || isRegisterApi) {

    return NextResponse.next();
  }

  // For all other routes, redirect unauthenticated users to the login page

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
    '/api/(.*)', // Try regex equivalent for API routes
    // Match page routes, excluding the specific assets/folders
    '/((?!_next/static|_next/image|favicon.ico|images).*)',
    // Match the root path explicitly if needed
    '/', // Ensure root path is explicitly matched
  ],
}; 