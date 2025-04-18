import { NextRequest, NextResponse } from 'next/server'; // Import NextRequest/Response for App Router
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

// Remove VercelRequest/Response imports
// import type { VercelRequest, VercelResponse } from '@vercel/node';

// Removed ResponseData type, NextResponse handles JSON structure

// Define the POST handler using named export
export async function POST(request: Request) {
  // Ensure this route only accepts POST requests (implicit with named export)
  // No need for explicit method check if only POST is defined

  try {
    await connectDB();
    const { name, email, password } = await request.json();

    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds = 10

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    return NextResponse.json({ message: 'User registered successfully' }, { status: 201 });

  } catch (error) {
    console.error('[API Register Error]', error);
    // Check if it's a validation error from Mongoose
    if (error instanceof Error && error.name === 'ValidationError') {
        return NextResponse.json({ message: 'Validation Error', errors: (error as any).errors }, { status: 400 });
    }    
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}

// Remove the default export
// export default async function handler(...) { ... } 