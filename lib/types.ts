// Shared types for GuruChat application

export interface Guru {
    _id: string;
    name: string;
    description: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatSummary {
    conversationId: string;
    summary: string;
    lastUpdated: string;
}

export interface GuruHistory {
    guruId: string;
    guruName: string;
    conversations: ChatSummary[];
}

export interface ConversationData {
    _id: string;
    userId: string;
    guruId: Guru;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
}

// Helper to validate MongoDB ObjectId format (no mongoose dependency)
export function isValidObjectId(id: string | null | undefined): boolean {
    if (!id) return false;
    return /^[a-fA-F0-9]{24}$/.test(id);
}

// Helper to generate image paths based on guru names
export function getGuruImagePath(guruName: string): string {
    const normalizedName = guruName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .toLowerCase()
        .replace(/\s+/g, '_') + '.png';
    return `/images/${normalizedName}`;
}
