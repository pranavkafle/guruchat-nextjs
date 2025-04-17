import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '../../lib/mongodb';
import User from '../../lib/models/User'; // Adjust path as necessary

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Missing required fields: email, password' });
  }

  try {
    await connectDB();

    // Find user by email and explicitly select the password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      // Generic message for security (don't reveal if email exists)
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare provided password with the stored hash
    // user.password will exist here because we used .select('+password')
    const isMatch = await bcrypt.compare(password, user.password!); 

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // If credentials are valid, create JWT payload
    const payload = {
      userId: user.id,
      // Add other relevant user info if needed (e.g., name, roles), but keep it minimal
    };

    // Sign the token
    const token = jwt.sign(
      payload,
      JWT_SECRET!,
      { expiresIn: '1d' } // Token expires in 1 day (adjust as needed)
    );

    // Respond with the token
    return res.status(200).json({
      message: 'Login successful',
      token: token,
      // Optionally send back some non-sensitive user info
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      }
    });

  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
} 