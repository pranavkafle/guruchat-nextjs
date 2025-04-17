import { GoogleGenerativeAI } from '@google/generative-ai';
// Import core streamText and the Google provider
import { streamText } from 'ai';
import { google } from '@ai-sdk/google'; // Import the google provider instance
import { NextRequest } from 'next/server'; // Vercel uses Next.js types for Request/Response
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
// Use relative paths for imports from lib/
import connectDB from '../../lib/mongodb'; // Assuming your DB connect function is here
import User from '../../lib/models/User'; // Assuming your User model path
import Chat from '../../lib/models/Chat'; // Assuming your Chat model path
import Guru from '../../lib/models/Guru'; // Assuming your Guru model path

// Ensure environment variables are loaded (especially for local dev)
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const JWT_SECRET = process.env.JWT_SECRET;
// GOOGLE_API_KEY is implicitly used by the provider instance if set as env var

// No need to initialize genAI manually if using the provider
// const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY!);

export async function POST(req: NextRequest) {
  console.log('POST /api/chat hit');
  try {
    // --- 1. Authentication ---
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
    const userId = decodedToken.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
         console.error('Invalid user ID in token:', userId);
         return new Response(JSON.stringify({ error: 'Unauthorized: Invalid user ID in token' }), { status: 401 });
    }
    console.log('Authenticated user ID:', userId);

    // --- Restore Original Logic ---
    
    // --- 2. Parse Request Body ---
    const body = await req.json();
    const { messages, guruId } = body; 
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid or missing messages in request body');
      return new Response(JSON.stringify({ error: 'Bad Request: Missing or invalid messages array' }), { status: 400 });
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
      model: google('models/gemini-2.0-flash'),
      messages: messages, 
      system: systemPrompt,
      // Add onError callback for detailed logging
      onError: (error) => {
        console.error("Error during streamText execution:", error);
        // Optionally: add more specific error handling/reporting here
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
             // Log the specific DB error clearly
             console.error('DATABASE ERROR in onFinish callback:', dbError);
             // Optionally: decide if you want to re-throw or handle differently
         }
      },
    });
    // --- 6. Return Streaming Response ---
    return result.toDataStreamResponse(); 

    // --- End Restored Logic ---

  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}

// Optional: Handle GET requests or other methods if needed,
// otherwise they default to 405 Method Not Allowed
export async function GET(req: NextRequest) {
     return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
} 