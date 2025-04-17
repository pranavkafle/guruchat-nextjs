import { GoogleGenerativeAI } from '@google/generative-ai';
// Import core streamText and the Google provider
import { streamText } from 'ai';
import { google } from '@ai-sdk/google'; // Import the google provider instance
import { NextRequest } from 'next/server'; // Vercel uses Next.js types for Request/Response
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb'; // Assuming your DB connect function is here
import User from '@/lib/models/User'; // Assuming your User model path
import Chat from '@/lib/models/Chat'; // Assuming your Chat model path
import Guru from '@/lib/models/Guru'; // Assuming your Guru model path

// Ensure environment variables are loaded (especially for local dev)
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const JWT_SECRET = process.env.JWT_SECRET;
// GOOGLE_API_KEY is implicitly used by the provider instance if set as env var

// No need to initialize genAI manually if using the provider
// const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY!);

export async function POST(req: NextRequest) {
  console.log('POST /api/chat hit (Simplified)');
  try {
    // --- 1. Authentication (Keep this part) ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing token' }), { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    if (!JWT_SECRET) {
        console.error('JWT_SECRET is not defined');
        return new Response(JSON.stringify({ error: 'Internal Server Error: JWT configuration missing' }), { status: 500 });
    }
    let decodedToken: any;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('JWT verification failed:', error);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), { status: 401 });
    }
    const userId = decodedToken.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
         console.error('Invalid user ID in token:', userId);
         return new Response(JSON.stringify({ error: 'Unauthorized: Invalid user ID in token' }), { status: 401 });
    }
    console.log('Authenticated user ID (Simplified):', userId);

    // --- TEMPORARILY COMMENTED OUT ---
    /*
    // --- 2. Parse Request Body ---
    const body = await req.json();
    const { messages, guruId } = body; 
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Bad Request: Missing or invalid messages array' }), { status: 400 });
    }
    const userMessageContent = messages[messages.length - 1].content;
    // --- 3. Connect to DB ---
    await connectDB();
    // --- 4. Fetch Guru System Prompt ---
    let systemPrompt = "You are a helpful assistant."; 
    if (guruId && mongoose.Types.ObjectId.isValid(guruId)) { // ... fetch logic ... }
    // --- 5. Call AI using Vercel AI SDK streamText ---
    const result = await streamText({ // ... streamText call ... });
    // --- 6. Return Streaming Response ---
    return result.toDataStreamResponse(); 
    */
    // --- END TEMPORARILY COMMENTED OUT ---

    // Return a simple success response for testing
    return new Response(JSON.stringify({ message: 'Simplified route reached successfully', userId: userId }), { status: 200 });

  } catch (error: any) {
    console.error("Error in /api/chat (Simplified):", error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}

// Optional: Handle GET requests or other methods if needed,
// otherwise they default to 405 Method Not Allowed
export async function GET(req: NextRequest) {
     return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
} 