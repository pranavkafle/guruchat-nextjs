import { NextRequest, NextResponse } from 'next/server'; // Import NextRequest/Response for App Router
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

// Remove VercelRequest/Response imports
// import type { VercelRequest, VercelResponse } from '@vercel/node';

// Removed ResponseData type, NextResponse handles JSON structure

// Define the POST handler using named export
export async function POST(req: NextRequest) {
  // Ensure this route only accepts POST requests (implicit with named export)
  // No need for explicit method check if only POST is defined

  let body;
  try {
      body = await req.json(); // Use req.json() for App Router
  } catch (error) {
      console.error('Failed to parse request body:', error);
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }
  
  const { name, email, password } = body;

  // Basic input validation
  if (!name || !email || !password) {
    return NextResponse.json({ message: 'Missing required fields: name, email, password' }, { status: 400 });
  }

  // Add more robust email/password validation if needed

  try {
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 }); // Use NextResponse
    }

    // Hash password
    const salt = await bcrypt.genSalt(10); // Generate salt with 10 rounds
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // Respond with success (don't send back the password)
    // Use NextResponse.json()
    return NextResponse.json({
      message: 'User registered successfully',
      userId: newUser.id,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Registration Error:', error);
     // Handle Mongoose validation errors specifically if desired
    if (error.name === 'ValidationError') {
         return NextResponse.json({ message: 'Validation failed', error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}

// Remove the default export
// export default async function handler(...) { ... } 