import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import connectDB from '../../lib/mongodb';
import User from '../../lib/models/User';

type ResponseData = {
  message: string;
  userId?: string;
  error?: string;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Ensure this route only accepts POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const { name, email, password } = req.body;

  // Basic input validation
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields: name, email, password' });
  }

  // Add more robust email/password validation if needed

  try {
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
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
    return res.status(201).json({
      message: 'User registered successfully',
      userId: newUser.id,
    });

  } catch (error: any) {
    console.error('Registration Error:', error);
     // Handle Mongoose validation errors specifically if desired
    if (error.name === 'ValidationError') {
         return res.status(400).json({ message: 'Validation failed', error: error.message });
    }
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
} 