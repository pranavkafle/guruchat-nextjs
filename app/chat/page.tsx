'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChat, UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import mongoose from 'mongoose';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { mutate } from 'swr';


// Shadcn UI Imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // For chat messages
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For errors
import { Loader2 } from 'lucide-react'; // For loading states

// Define the Guru type based on your API response/model
interface Guru {
    _id: string;
    name: string;
    description: string;
    // Add other fields if needed
}

// Interface for the full conversation data
interface ConversationData {
    _id: string; // Conversation ID
    userId: string; // or Types.ObjectId if needed
    guruId: Guru; // The populated guru object
    messages: UIMessage[];
    createdAt: string;
    updatedAt: string;
}

// Helper function to generate image paths based on guru names
function getGuruImagePath(guruName: string): string {
    // Normalize the name by removing diacritics and converting to lowercase
    const normalizedName = guruName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .toLowerCase()
        .replace(/\s+/g, '_') + '.png';
    return `/images/${normalizedName}`; // Assuming images are in public/images
}

// Main Chat Component Logic
function ChatInterface() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const guruIdFromUrl = searchParams.get('guruId');
    const conversationId = searchParams.get('chatId');

    const [selectedGuru, setSelectedGuru] = useState<Guru | null>(null);
    const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(conversationId); // Track current chat for appending
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [input, setInput] = useState<string>('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Create transport once - body options passed per-request via sendMessage
    const transport = React.useMemo(() => {
        return new DefaultChatTransport({
            api: '/api/chat',
        });
    }, []);

    // --- Chat Hook (Declare BEFORE effects that use its return values) ---
    const { messages, status, sendMessage, error: errorChat } = useChat({
        id: (conversationId || guruIdFromUrl) ?? undefined,
        transport,
        messages: initialMessages,
        onError: (err) => {
            console.error("Chat error:", err);
        },
    });



    const isLoadingChat = status === 'submitted' || status === 'streaming';

    // Refresh sidebar chat history when streaming completes
    const prevStatusRef = useRef(status);
    useEffect(() => {
        if (prevStatusRef.current === 'streaming' && status === 'ready') {
            // Message completed - refresh sidebar
            mutate('/api/chats');
        }
        prevStatusRef.current = status;
    }, [status]);

    // --- Fetch Initial Data ---

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            setError(null);
            setInitialMessages([]); // Reset messages on load
            setSelectedGuru(null); // Reset guru

            try {
                // If we have a conversationId, load that specific conversation
                if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
                    console.log(`Fetching conversation: ${conversationId}`);
                    const response = await fetch(`/api/chats?conversationId=${conversationId}`);
                    if (!response.ok) {
                        let errorMsg = `Failed to fetch conversation: ${response.statusText}`;
                        try { const errBody = await response.json(); errorMsg = errBody.message || errorMsg; } catch (e) { }
                        throw new Error(errorMsg);
                    }
                    const data = await response.json();
                    if (!data.success || !data.data) {
                        throw new Error('Invalid API response format.');
                    }
                    const convoData = data.data as ConversationData;
                    if (!convoData.guruId || !convoData.guruId._id) {
                        throw new Error('Conversation data missing populated Guru details.');
                    }
                    setSelectedGuru(convoData.guruId);
                    setInitialMessages(convoData.messages || []);
                    console.log(`Loaded ${convoData.messages?.length || 0} messages from history.`);

                } else if (guruIdFromUrl && mongoose.Types.ObjectId.isValid(guruIdFromUrl)) {
                    // Only fetch guru details - START FRESH (ChatGPT-style)
                    console.log(`Fetching guru ${guruIdFromUrl} details - starting fresh conversation`);
                    const guruResponse = await fetch(`/api/gurus/${guruIdFromUrl}`);

                    if (!guruResponse.ok) {
                        throw new Error(`Failed to fetch guru: ${guruResponse.statusText}`);
                    }
                    const guruData = await guruResponse.json();
                    if (!guruData.success || !guruData.data) {
                        throw new Error('Invalid API response format for guru.');
                    }
                    setSelectedGuru(guruData.data as Guru);

                    // Always start fresh - don't load existing conversation
                    setInitialMessages([]);
                    setCurrentChatId(null);
                    console.log('Ready for new conversation');

                } else {
                    throw new Error('Invalid or missing Guru ID or Conversation ID.');
                }

            } catch (error: any) {
                console.error("Error fetching initial chat data:", error);
                setError(error.message || 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();
        // Depend on IDs from URL. Note: useSearchParams values are reactive.
    }, [conversationId, guruIdFromUrl]);


    // --- Refocus Input Effect ---
    useEffect(() => {
        // Now input & isLoadingChat are defined
        if (input === '' && !isLoadingChat && !isLoading) {
            inputRef.current?.focus();
        }
    }, [input, isLoadingChat, isLoading]);

    // --- Initial Focus Effect ---
    useEffect(() => {
        // Now isLoading is defined
        if (!isLoading && selectedGuru) {
            inputRef.current?.focus();
        }
    }, [isLoading, selectedGuru]);

    // Custom handlers for AI SDK 6 compatibility
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    };

    // Helper to get text from UIMessage parts
    const getMessageText = (m: UIMessage) => {
        return m.parts
            .filter(part => part.type === 'text')
            .map(part => (part.type === 'text' ? part.text : ''))
            .join('');
    };

    // Custom submit handler
    const handleChatSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const text = input.trim();
        if (!selectedGuru || !text || isLoadingChat || isLoading) {
            return;
        }
        setInput(''); // Clear input
        // Pass guruId and chatId - chatId determines append vs new
        await sendMessage(
            { text },
            {
                body: {
                    guruId: selectedGuru._id,
                    chatId: currentChatId, // If set, appends to existing; if null, creates new
                },
            }
        );
    };

    // Handle Enter key press in Textarea
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!input.trim() || isLoadingChat || isLoading) return;
            const form = e.currentTarget.closest('form');
            if (form) {
                // In some environments requestSubmit is better
                form.requestSubmit();
            }
        }
    };

    // --- Rendering Logic ---

    // Loading state for guru details
    if (isLoading) {
        return (
            <div className="container mx-auto p-4 flex flex-col h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading Guru...</span>
            </div>
        );
    }

    // Error state for guru details
    if (error) {
        return (
            <div className="container mx-auto p-4 flex flex-col h-screen items-center justify-center">
                <Alert variant="destructive" className="mb-4 max-w-md">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button onClick={() => router.push('/')}>Select a Different Guru</Button>
            </div>
        );
    }

    // If guru not found after loading (should be caught by error state, but as fallback)
    if (!selectedGuru) {
        return (
            <div className="container mx-auto p-4 flex flex-col h-screen items-center justify-center">
                <p>Guru not found.</p>
                <Button onClick={() => router.push('/')}>Go Back</Button>
            </div>
        );
    }

    // --- Render Chat Interface ---
    return (
        <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
            {/* Chat Interface Container - Full height minus header */}
            <div className="flex flex-col h-full border rounded-lg shadow-md overflow-hidden m-4">
                {/* Chat Header */}
                <div className="p-4 border-b bg-muted/40 flex items-center justify-between shrink-0">
                    <div className='flex items-center space-x-3'>
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={getGuruImagePath(selectedGuru.name)} alt={selectedGuru.name} className="object-cover" />
                            <AvatarFallback>{selectedGuru.name.substring(0, 1)}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-xl font-semibold">{selectedGuru.name}</h2>
                    </div>
                    <div className="flex gap-2">
                        {/* New Chat button - navigates to fresh conversation */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                // Force page reload to clear chat state and start fresh
                                window.location.href = `/chat?guruId=${selectedGuru._id}`;
                            }}
                        >
                            New Chat
                        </Button>
                        {/* Changed button to go back to home/guru selection */}
                        <Button variant="outline" size="sm" onClick={() => router.push('/')}>
                            Change Guru
                        </Button>
                    </div>
                </div>


                {/* Messages Area - Scrollable area that takes available space */}
                <ScrollArea className="flex-grow overflow-auto p-4 bg-background" id="message-scroll-area">
                    <div className="space-y-4">
                        {messages.map((m) => (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex items-end max-w-xs md:max-w-md lg:max-w-lg ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <Avatar className={`h-6 w-6 mx-2 ${m.role === 'user' ? 'ml-2' : 'mr-2'}`}>
                                        {m.role === 'assistant' ? (
                                            <>
                                                <AvatarImage src={getGuruImagePath(selectedGuru.name)} alt={selectedGuru.name} className="object-cover" />
                                                <AvatarFallback>{selectedGuru.name.substring(0, 1)}</AvatarFallback>
                                            </>
                                        ) : (
                                            <>
                                                <AvatarImage src="/images/user-avatar.png" alt="User" />
                                                <AvatarFallback>You</AvatarFallback>
                                            </>
                                        )}
                                    </Avatar>
                                    <div
                                        className={`px-3 py-2 rounded-lg shadow-sm ${m.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted prose prose-sm dark:prose-invert max-w-none'
                                            }`}
                                    >
                                        {m.role === 'user' ? (
                                            <p className="text-sm whitespace-pre-wrap">{getMessageText(m)}</p>
                                        ) : (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    // Customize markdown elements to match your design system
                                                    p: ({ children }) => <p className="text-sm mb-2 last:mb-0">{children}</p>,
                                                    ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                                                    li: ({ children }) => <li className="mb-1">{children}</li>,
                                                    h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                                    h2: ({ children }) => <h2 className="text-md font-bold mb-2">{children}</h2>,
                                                    code: ({ children }) => <code className="bg-muted-foreground/20 rounded px-1 text-xs">{children}</code>,
                                                    pre: ({ children }) => <pre className="bg-muted-foreground/10 rounded p-2 overflow-x-auto my-2">{children}</pre>,
                                                }}
                                            >
                                                {getMessageText(m)}
                                            </ReactMarkdown>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoadingChat && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                            <div className="flex justify-start">
                                <div className="flex items-end max-w-xs md:max-w-md lg:max-w-lg flex-row">
                                    <Avatar className={`h-6 w-6 mr-2`}>
                                        <AvatarImage src={getGuruImagePath(selectedGuru.name)} alt={selectedGuru.name} className="object-cover" />
                                        <AvatarFallback>{selectedGuru.name.substring(0, 1)}</AvatarFallback>
                                    </Avatar>
                                    <div className="px-3 py-2 rounded-lg bg-muted flex items-center">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t bg-muted/40 shrink-0">
                    {errorChat && (
                        <Alert variant="destructive" className="mb-2">
                            <AlertTitle>Chat Error</AlertTitle>
                            <AlertDescription>{errorChat.message || 'An error occurred.'}</AlertDescription>
                        </Alert>
                    )}
                    <form onSubmit={handleChatSubmit} className="flex items-center space-x-2">
                        <Textarea
                            ref={inputRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask your Guru anything..."
                            className="flex-grow resize-none py-1.5"
                            rows={1}
                            disabled={isLoading || isLoadingChat}
                        />
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isLoading || isLoadingChat || !input.trim()}
                        >
                            {isLoadingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Wrap the component exporting with Suspense for useSearchParams
export default function ChatPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>  {/* Simple fallback */}
            <ChatInterface />
        </Suspense>
    );
} 