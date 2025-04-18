import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Create a response object
    const response = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );

    // Clear the cookie by setting its Max-Age to 0 or deleting it
    response.cookies.set('jwt_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0, // Expire the cookie immediately
      sameSite: 'lax'
    });
    
    // Alternatively, use delete:
    // response.cookies.delete('jwt_token', { path: '/' });

    return response;

  } catch (error: any) {
    console.error('Logout Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message },
      { status: 500 }
    );
  }
} 