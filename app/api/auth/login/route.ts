import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { NextRequest, NextResponse } from 'next/server'; // Import NextRequest/Response
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User'; // Use path alias

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  // Consider logging this instead of throwing, as it can crash the server process
  console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
  // Optionally return an error response immediately if preferred
  // return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
}

// Define the POST handler using named export
export async function POST(req: NextRequest) {

  let body;
  try {
      body = await req.json(); // Use req.json() for App Router
  } catch (error) {
      console.error('Failed to parse request body:', error);
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ message: 'Missing required fields: email, password' }, { status: 400 });
  }

  // Check if JWT_SECRET is actually missing after the initial check
  if (!JWT_SECRET) {
    console.error('Login attempt failed: JWT_SECRET is not configured.');
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }

  try {
    await connectDB();

    // Find user by email and explicitly select the password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      // Generic message for security (don't reveal if email exists)
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // Compare provided password with the stored hash
    // user.password will exist here because we used .select('+password')
    const isMatch = await bcrypt.compare(password, user.password!); 

    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // If credentials are valid, create JWT payload
    const payload = {
      userId: user.id,
      // Add other relevant user info if needed (e.g., name, roles), but keep it minimal
    };

    // Sign the token
    const token = jwt.sign(
      payload,
      JWT_SECRET, // Already checked it exists
      { expiresIn: '1d' } // Token expires in 1 day (adjust as needed)
    );

    // Create the response *without* the token in the body
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      }
    }, { status: 200 });

    // Set the JWT as an HTTP-only cookie
    response.cookies.set('jwt_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day in seconds
      sameSite: 'lax' 
    });

    return response; // Return the response with the cookie set

  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}

// Remove default export
// export default async function handler(...) { ... } 