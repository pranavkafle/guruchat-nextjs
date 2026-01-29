'use server'; // Indicate this is a server-side component/route

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Chat from '@/lib/models/Chat';
import Guru from '@/lib/models/Guru'; // To populate guru details
import User from '@/lib/models/User'; // Potentially needed, but userId comes from token

// Ensure environment variables are loaded
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req: NextRequest) {
    console.log('GET /api/chats hit');
    const url = new URL(req.url);
    const conversationId = url.searchParams.get('conversationId'); // Check for specific conversation ID

    if (!JWT_SECRET) {
        console.error('JWT_SECRET is not defined for chat history');
        return NextResponse.json({ error: 'Internal Server Error: JWT configuration missing' }, { status: 500 });
    }

    try {
        // --- 1. Authentication --- 
        const tokenCookie = req.cookies.get('jwt_token');
        if (!tokenCookie) {
            return NextResponse.json({ error: 'Unauthorized: Missing token cookie' }, { status: 401 });
        }
        const token = tokenCookie.value;

        // Decode token to get userId
        const decodedToken = jwt.decode(token) as { userId?: string };
        if (!decodedToken) {
            return NextResponse.json({ error: 'Unauthorized: Invalid token format' }, { status: 401 });
        }
        const userId = decodedToken.userId;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return NextResponse.json({ error: 'Unauthorized: Invalid user ID in token' }, { status: 401 });
        }
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // --- 2. Connect to DB --- 
        await connectDB();

        // --- 3. Fetch Data (Conditional) --- 
        if (conversationId) {
            // --- Fetch Specific Conversation by ID --- 
            console.log(`Fetching specific conversation ${conversationId} for user ${userId}`);
            if (!mongoose.Types.ObjectId.isValid(conversationId)) {
                return NextResponse.json({ success: false, message: 'Invalid Conversation ID format' }, { status: 400 });
            }

            const specificChat = await Chat.findOne({
                _id: new mongoose.Types.ObjectId(conversationId),
                userId: userObjectId // Ensure the user owns this chat
            })
                .populate({ path: 'guruId', select: 'name' }) // Still populate guru name
                .lean();

            if (!specificChat) {
                return NextResponse.json({ success: false, message: 'Conversation not found or user unauthorized' }, { status: 404 });
            }

            // Return the single chat document, including all messages
            return NextResponse.json({ success: true, data: specificChat }, { status: 200 });

        } else if (url.searchParams.get('guruId')) {
            // --- Fetch Conversation for a Specific Guru ---
            const guruId = url.searchParams.get('guruId');
            console.log(`Fetching conversation for guru ${guruId} for user ${userId}`);
            if (!guruId || !mongoose.Types.ObjectId.isValid(guruId)) {
                return NextResponse.json({ success: false, message: 'Invalid Guru ID format' }, { status: 400 });
            }

            const guruChat = await Chat.findOne({
                userId: userObjectId,
                guruId: new mongoose.Types.ObjectId(guruId)
            })
                .populate({ path: 'guruId', select: 'name' })
                .lean();

            if (!guruChat) {
                // No existing conversation - return empty data (not an error)
                console.log(`No existing conversation found for guru ${guruId}`);
                return NextResponse.json({ success: true, data: null, message: 'No existing conversation' }, { status: 200 });
            }

            // Return the chat document with all messages
            console.log(`Found conversation ${guruChat._id} with ${guruChat.messages?.length || 0} messages`);
            return NextResponse.json({ success: true, data: guruChat }, { status: 200 });

        } else {

            // --- Fetch History Summary --- 
            console.log(`Fetching history summary for user ${userId}`);
            const chats = await Chat.find({ userId: userObjectId })
                .sort({ updatedAt: -1 })
                .populate({ path: 'guruId', select: 'name' })
                .lean();

            // --- 4. Process History (Group by Guru and create summaries) ---
            type ProcessedHistory = {
                [guruId: string]: {
                    guruId: string;
                    guruName: string;
                    // Changed `chats` to `conversations` for clarity
                    conversations: {
                        conversationId: string; // ID of the whole Chat document
                        summary: string; // e.g., first user message of the whole thread
                        lastUpdated: Date;
                    }[] // Now typically only one conversation per guru
                }
            };

            const processedHistory: ProcessedHistory = {};

            // Since each document now represents a full conversation thread per guru,
            // the grouping logic simplifies. We just transform each fetched document.
            for (const conversation of chats) {
                const guru = conversation.guruId as any; // Type assertion after populate
                // If guruId is somehow missing despite filter (shouldn't happen with new save logic), skip
                if (!guru?._id) {
                    console.warn(`Skipping chat document ${conversation._id} with missing guruId during history processing.`);
                    continue;
                }
                const guruIdStr = guru._id.toString();
                const guruName = guru.name || 'Unknown Guru';

                // Should only be one entry per guru now, but using this structure for consistency
                if (!processedHistory[guruIdStr]) {
                    processedHistory[guruIdStr] = {
                        guruId: guruIdStr,
                        guruName: guruName,
                        conversations: [],
                    };
                }

                // Summary based on the *first* user message in the entire conversation thread
                const firstUserMessage = conversation.messages.find(m => m.role === 'user');
                let summary = firstUserMessage
                    ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
                    : 'Chat started';
                if (!firstUserMessage) console.warn(`Conversation ${conversation._id} missing first user message for summary.`);

                processedHistory[guruIdStr].conversations.push({ // Add the conversation summary
                    conversationId: conversation._id.toString(),
                    summary: summary,
                    lastUpdated: conversation.updatedAt,
                });
            }

            const historyArray = Object.values(processedHistory);

            console.log('Processed history summary prepared:', JSON.stringify(historyArray, null, 2));
            return NextResponse.json({ success: true, data: historyArray, type: 'summary' }, { status: 200 }); // Added type hint maybe?
        }

    } catch (error: any) {
        console.error("Error in GET /api/chats:", error);
        if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError' || error.name === 'TokenExpiredError') {
            return NextResponse.json({ error: `Unauthorized: ${error.message}` }, { status: 401 });
        }
        return NextResponse.json({ error: error.message || 'Internal Server Error fetching chat history' }, { status: 500 });
    }
} 