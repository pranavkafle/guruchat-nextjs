'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChat, UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { mutate } from 'swr';

// Shared types and utilities
import { isValidObjectId, getGuruImagePath } from '@/lib/types';

// AI Elements for auto-scroll
import {
    Conversation,
    ConversationContent,
    ConversationEmptyState,
    ConversationScrollButton
} from "@/components/ai-elements/conversation";
import {
    Message,
    MessageContent,
    MessageResponse
} from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
    PromptInput,
    PromptInputFooter,
    PromptInputTextarea,
    PromptInputSubmit
} from "@/components/ai-elements/prompt-input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, MessageCircle } from 'lucide-react';

// Define the Guru type based on your API response/model
interface Guru {
    _id: string;
    name: string;
    description: string;
    // Add other fields if needed
}

interface StoredMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// Interface for the full conversation data
interface ConversationData {
    _id: string; // Conversation ID
    userId: string; // or Types.ObjectId if needed
    guruId: Guru; // The populated guru object
    messages: StoredMessage[];
    createdAt: string;
    updatedAt: string;
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
    const [promptText, setPromptText] = useState<string>('');
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeletingChat, setIsDeletingChat] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Create transport once - body options passed per-request via sendMessage
    const transport = React.useMemo(() => {
        return new DefaultChatTransport({
            api: '/api/chat',
        });
    }, []);

    // --- Chat Hook (Declare BEFORE effects that use its return values) ---
    const { messages, status, sendMessage, error: errorChat, stop, setMessages } = useChat({
        id: (conversationId || guruIdFromUrl) ?? undefined,
        transport,
        messages: initialMessages,
        onError: (err) => {
            console.error("Chat error:", err);
        },
    });



    const isLoadingChat = status === 'submitted' || status === 'streaming';
    const canDeleteChat = !!(conversationId && isValidObjectId(conversationId));

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
                if (conversationId && isValidObjectId(conversationId)) {

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
                    setInitialMessages((convoData.messages || []).map(toUIMessage));
                    setCurrentChatId(conversationId);


                } else if (guruIdFromUrl && isValidObjectId(guruIdFromUrl)) {
                    // Only fetch guru details - START FRESH (ChatGPT-style)

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

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages, setMessages]);


    const toUIMessage = (m: StoredMessage, index: number): UIMessage => ({
        id: `history-${conversationId || guruIdFromUrl || 'chat'}-${index}`,
        role: m.role,
        parts: m.content ? [{ type: 'text', text: m.content }] : [],
    });

    // Custom submit handler
    const handleChatSubmit = async ({ text }: { text: string }) => {
        const trimmed = text.trim();
        if (!selectedGuru || !trimmed || isLoadingChat || isLoading) {
            return;
        }
        setPromptText('');
        // Pass guruId and chatId - chatId determines append vs new
        await sendMessage(
            { text: trimmed },
            {
                body: {
                    guruId: selectedGuru._id,
                    chatId: currentChatId, // If set, appends to existing; if null, creates new
                },
            }
        );
    };

    const handleDeleteChat = async () => {
        if (!selectedGuru || !conversationId || !isValidObjectId(conversationId) || isDeletingChat) {
            return;
        }
        setIsDeletingChat(true);
        setDeleteError(null);
        try {
            const response = await fetch(`/api/chats?conversationId=${conversationId}`, {
                method: 'DELETE',
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || data?.success === false) {
                throw new Error(data?.message || 'Failed to delete chat.');
            }
            await mutate('/api/chats');
            setIsDeleteOpen(false);
            router.push(`/chat?guruId=${selectedGuru._id}`);
        } catch (error: any) {
            console.error('Delete chat failed:', error);
            setDeleteError(error.message || 'Delete failed.');
        } finally {
            setIsDeletingChat(false);
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
        <div className="flex flex-1 flex-col h-full min-h-0 p-4">
            {/* Chat Interface Container - Takes full height from SidebarInset */}
            <div className="flex flex-col flex-1 min-h-0 border rounded-lg shadow-md overflow-hidden">
                {/* Chat Header */}
                <div className="p-4 border-b bg-muted/40 flex items-center justify-between shrink-0">
                    <div className='flex items-center space-x-3'>
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={getGuruImagePath(selectedGuru.name)} alt={selectedGuru.name} className="object-cover" />
                            <AvatarFallback>{selectedGuru.name.substring(0, 1)}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-xl font-semibold">{selectedGuru.name}</h2>
                        <Button variant="outline" size="sm" onClick={() => router.push('/')}>
                            Change Guru
                        </Button>
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
                        {canDeleteChat && (
                            <Dialog open={isDeleteOpen} onOpenChange={(open) => {
                                setIsDeleteOpen(open);
                                if (!open) setDeleteError(null);
                            }}>
                                <DialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                        Delete Chat
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Delete chat?</DialogTitle>
                                        <DialogDescription>
                                            This will permanently delete this conversation.
                                        </DialogDescription>
                                    </DialogHeader>
                                    {deleteError && (
                                        <p className="text-sm text-destructive">{deleteError}</p>
                                    )}
                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsDeleteOpen(false)}
                                            disabled={isDeletingChat}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={handleDeleteChat}
                                            disabled={isDeletingChat}
                                        >
                                            {isDeletingChat ? 'Deleting...' : 'Delete'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>


                {/* Messages Area - Auto-scrolling conversation container */}
                <Conversation className="flex-1 min-h-0 bg-background">
                    <ConversationContent className="p-4 gap-4">
                        {messages.length === 0 ? (
                            <ConversationEmptyState
                                icon={<MessageCircle className="h-12 w-12" />}
                                title={`Chat with ${selectedGuru.name}`}
                                description={`Ask ${selectedGuru.name} anything about ${selectedGuru.description.toLowerCase()}`}
                            />
                        ) : (
                            <>
                                {messages.map((m) => (
                                    <Message key={m.id} from={m.role}>
                                        <MessageContent>
                                            {m.parts.map((part, i) =>
                                                part.type === 'text' ? (
                                                    <MessageResponse key={`${m.id}-${i}`}>{part.text}</MessageResponse>
                                                ) : null
                                            )}
                                        </MessageContent>
                                    </Message>
                                ))}
                                {(status === 'submitted' || status === 'streaming') &&
                                    messages.length > 0 &&
                                    messages[messages.length - 1].role === 'user' && (
                                        <Message from="assistant">
                                            <MessageContent>
                                                <Shimmer className="text-sm">typing...</Shimmer>
                                            </MessageContent>
                                        </Message>
                                    )}
                            </>
                        )}
                    </ConversationContent>
                    <ConversationScrollButton />
                </Conversation>

                {/* Input Area */}
                <div className="p-4 border-t bg-muted/40 shrink-0">
                    {errorChat && (
                        <Alert variant="destructive" className="mb-2">
                            <AlertTitle>Chat Error</AlertTitle>
                            <AlertDescription>{errorChat.message || 'An error occurred.'}</AlertDescription>
                        </Alert>
                    )}
                    <PromptInput
                        onSubmit={handleChatSubmit}
                        className="w-full"
                    >
                        <PromptInputFooter>
                            <PromptInputTextarea
                                placeholder="Ask your Guru anything..."
                                disabled={isLoading || isLoadingChat}
                                onChange={(e) => setPromptText(e.currentTarget.value)}
                            />
                            <PromptInputSubmit
                                status={status}
                                onStop={stop}
                                disabled={isLoading || isLoadingChat || !promptText.trim()}
                            />
                        </PromptInputFooter>
                    </PromptInput>
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
