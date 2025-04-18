import { GoogleGenerativeAI } from '@google/generative-ai';
// Import core streamText and the Google provider
import { streamText } from 'ai';
// Import createGoogleGenerativeAI instead of the default instance
import { createGoogleGenerativeAI } from '@ai-sdk/google'; 
import { NextRequest, NextResponse } from 'next/server'; // Use App Router types
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
// Use path aliases for imports from lib/
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Chat from '@/lib/models/Chat';
import Guru from '@/lib/models/Guru';

// Ensure environment variables are loaded (especially for local dev)
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY;

// Create a custom Google provider instance, explicitly passing the API key
if (!GOOGLE_API_KEY) {
  console.error("FATAL ERROR: GOOGLE_AI_API_KEY environment variable is not set.");
  // Avoid throwing here to prevent server crash, handle error in POST
}
const googleProvider = createGoogleGenerativeAI({
    apiKey: GOOGLE_API_KEY, // Pass API key during provider creation
});

// Export named POST function
export async function POST(req: NextRequest) {
  console.log('POST /api/chat hit');
  
  // Check if GOOGLE_API_KEY is missing (checked at module load, but double-check)
  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: "Server configuration error: Missing AI API key" }, { status: 500 });
  }
  
  try {
    // --- 1. Authentication (Read from Cookie) ---
    const tokenCookie = req.cookies.get('jwt_token');
    if (!tokenCookie) {
      console.error('Missing jwt_token cookie');
      return NextResponse.json({ error: 'Unauthorized: Missing token cookie' }, { status: 401 }); 
    }
    const token = tokenCookie.value;
    
    // const authHeader = req.headers.get('Authorization'); // Removed header check
    // if (!authHeader || !authHeader.startsWith('Bearer ')) { ... }
    // const token = authHeader.split(' ')[1]; // Removed header check
    
    if (!JWT_SECRET) {
        console.error('JWT_SECRET is not defined');
        return NextResponse.json({ error: 'Internal Server Error: JWT configuration missing' }, { status: 500 }); 
    }
    let decodedToken: any;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('JWT verification failed:', error);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 }); 
    }
    const userId = decodedToken.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
         console.error('Invalid user ID in token:', userId);
         return NextResponse.json({ error: 'Unauthorized: Invalid user ID in token' }, { status: 401 }); 
    }
    console.log('Authenticated user ID:', userId);

    // --- Restore Original Logic ---
    
    // --- 2. Parse Request Body ---
    const body = await req.json(); // Use req.json()
    const { messages, guruId } = body; 
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid or missing messages in request body');
      return NextResponse.json({ error: 'Bad Request: Missing or invalid messages array' }, { status: 400 }); // Use NextResponse
    }
    const userMessageContent = messages[messages.length - 1].content;
    // --- 3. Connect to DB ---
    await connectDB();
    // --- 4. Fetch Guru System Prompt ---
    let systemPrompt = "You are a helpful assistant."; 
    if (guruId && mongoose.Types.ObjectId.isValid(guruId)) {
        const guru = await Guru.findById(guruId);
        if (guru && guru.systemPrompt) {
            systemPrompt = guru.systemPrompt;
             console.log(`Using system prompt for Guru ID: ${guruId}`);
        } else {
             console.warn(`Guru not found or has no system prompt for ID: ${guruId}. Using default.`);
        }
    } else if (guruId) {
         console.warn(`Invalid Guru ID provided: ${guruId}. Using default system prompt.`);
    } else {
         console.log('No Guru ID provided. Using default system prompt.');
    }
    // --- 5. Call AI using Vercel AI SDK streamText ---
    console.log('Calling streamText with model:', 'models/gemini-2.0-flash');
    console.log('System Prompt:', systemPrompt);
    console.log('Messages:', JSON.stringify(messages, null, 2)); // Log the messages being sent

    const result = await streamText({
      // Use the custom provider instance
      model: googleProvider('models/gemini-2.0-flash'), 
      messages: messages, 
      system: systemPrompt,
      // Add onError callback for detailed logging
      onError: (error) => {
        console.error("Error during streamText execution:", error);
      },
      onFinish: async ({ text, toolCalls, toolResults, usage, finishReason, logprobs }) => {
         // --- 7. Save Chat History ---
         console.log('Gemini full response received (onFinish):', text);
         try {
             console.log('Attempting to save chat history to DB...');
             const newChat = new Chat({
                 userId: new mongoose.Types.ObjectId(userId),
                 userMessage: userMessageContent, 
                 assistantMessage: text, 
                 guruId: guruId && mongoose.Types.ObjectId.isValid(guruId) ? new mongoose.Types.ObjectId(guruId) : null,
                 timestamp: new Date(),
             });
             await newChat.save();
             console.log('Chat history saved successfully.');
         } catch (dbError) {
             console.error('DATABASE ERROR in onFinish callback:', dbError);
         }
      },
    });
    // --- 6. Return Streaming Response ---
    return result.toDataStreamResponse(); 

    // --- End Restored Logic ---

  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    // Use NextResponse for final catch block
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Removed the unnecessary GET handler
// export async function GET(req: NextRequest) { ... } 