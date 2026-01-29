'use client'; // Need this for hooks

import React, { useState, useEffect } from 'react'; // Added hooks
import { Minus, Plus, MessageSquareText } from "lucide-react" // Added MessageSquareText
import { useRouter } from 'next/navigation'; // To navigate on chat click
import useSWR from 'swr';

import { SearchForm } from "@/components/search-form"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"; // Added Skeleton for loading
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Added Alert for errors

// Define Guru type (similar to home page)
interface Guru {
  _id: string;
  name: string;
  description: string;
}

// Define the structure of the history data expected from the API
interface ChatSummary {
  conversationId: string;
  summary: string;
  lastUpdated: string; // API sends date as string
}
interface GuruHistory {
  guruId: string;
  guruName: string;
  chats: ChatSummary[];
  conversations: ChatSummary[];
}



// SWR fetcher function
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }
  const data = await response.json();
  if (!data.success || !Array.isArray(data.data)) {
    throw new Error('Invalid API response format.');
  }
  return data.data;
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const [gurus, setGurus] = useState<Guru[]>([]);
  const [isLoadingGurus, setIsLoadingGurus] = useState<boolean>(true);
  const [errorGurus, setErrorGurus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>(''); // Add state for search term

  // Use SWR for chat history - auto-refreshes when mutate('/api/chats') is called
  const { data: historyData, error: errorHistory, isLoading: isLoadingHistory } = useSWR<GuruHistory[]>(
    '/api/chats',
    fetcher,
    { revalidateOnFocus: false } // Don't refetch on window focus
  );

  // Sort history by guru name
  const history = historyData
    ? [...historyData].sort((a, b) => a.guruName.localeCompare(b.guruName))
    : [];

  // --- Fetch Gurus ---
  useEffect(() => {
    const fetchGurus = async () => {
      setIsLoadingGurus(true);
      setErrorGurus(null);
      try {
        const response = await fetch('/api/gurus');
        if (!response.ok) {
          throw new Error(`Failed to fetch gurus: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.success || !Array.isArray(data.data)) {
          throw new Error('Invalid API response format for gurus.');
        }
        setGurus(data.data);
      } catch (error: any) {
        console.error("Error fetching gurus for sidebar:", error);
        setErrorGurus(error.message || 'An unknown error occurred.');
      } finally {
        setIsLoadingGurus(false);
      }
    };
    fetchGurus();
  }, []);


  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Filter history based on search term
  const filteredHistory = history.map(guruHistory => ({
    ...guruHistory,
    conversations: guruHistory.conversations.filter(chat =>
      chat.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guruHistory.guruName.toLowerCase().includes(searchTerm.toLowerCase()) // Also search guru name
    )
  })).filter(guruHistory => guruHistory.conversations.length > 0); // Only show gurus with matching chats

  // Determine if there are any results after filtering
  const hasSearchResults = filteredHistory.length > 0;
  const isSearching = searchTerm !== '';

  // Function to navigate to a specific chat conversation
  const handleChatLinkClick = (guruId: string, conversationId: string) => {
    if (!conversationId || conversationId === 'unknown') {
      console.warn('Attempted to navigate with invalid conversationId');
      return; // Don't navigate if the ID is bad
    }
    console.log(`Navigating to Guru: ${guruId}, Conversation: ${conversationId}`);
    router.push(`/chat?guruId=${guruId}&chatId=${conversationId}`);
  };


  return (
    <Sidebar {...props}>
      <SidebarHeader>
        {/* Pass value and onChange to SearchForm */}
        <SearchForm value={searchTerm} onChange={handleSearchChange} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {/* Loading State for Gurus */}
            {isLoadingGurus && (
              <>
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-8 w-full" />
              </>
            )}
            {/* Error State for Gurus */}
            {errorGurus && (
              <Alert variant="destructive" className="m-2">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorGurus}</AlertDescription>
              </Alert>
            )}
            {/* Loading State */}
            {isLoadingHistory && (
              <>
                {/* Use Skeleton for placeholder menu items */}
                <div className="flex items-center space-x-2 px-2 py-1.5">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-[80%]" />
                </div>
                <div className="flex items-center space-x-2 px-2 py-1.5">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-[70%]" />
                </div>
                <div className="flex items-center space-x-2 px-2 py-1.5">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-[90%]" />
                </div>
              </>
            )}
            {/* Error State */}
            {errorHistory && (
              <Alert variant="destructive" className="m-2">
                <AlertTitle>Error Loading History</AlertTitle>
                <AlertDescription>{errorHistory}</AlertDescription>
              </Alert>
            )}
            {/* No History State */}
            {!isLoadingHistory && !errorHistory && history.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No chat history found.
              </div>
            )}
            {/* Display History grouped by Guru */}
            {isLoadingHistory ? (
              // Show skeletons while loading history
              Array.from({ length: 3 }).map((_, index) => (
                <SidebarMenuItem key={`skel-guru-${index}`}>
                  <SidebarMenuButton className="opacity-50">
                    <Plus className="size-4 mr-2" />
                    <Skeleton className="h-4 w-20" />
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    {Array.from({ length: 2 }).map((_, subIndex) => (
                      <SidebarMenuSubItem key={`skel-chat-${index}-${subIndex}`}>
                        <Skeleton className="h-5 w-full" />
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </SidebarMenuItem>
              ))
            ) : errorHistory ? (
              <Alert variant="destructive" className="m-2">
                <AlertTitle>Error Loading History</AlertTitle>
                <AlertDescription>{errorHistory}</AlertDescription>
              </Alert>
            ) : hasSearchResults ? (
              // Use filteredHistory here
              filteredHistory.map((guruHistory) => (
                <Collapsible
                  key={guruHistory.guruId}
                  className="group/collapsible"
                  defaultOpen={true}
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <MessageSquareText className="size-4 mr-2" />
                        {guruHistory.guruName}
                        <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
                        <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {/* Display chat summaries (conversations) for this guru */}
                        {guruHistory.conversations.length === 0 && (
                          <SidebarMenuSubItem>
                            <span className="text-muted-foreground text-xs px-2 py-1">No chats with this guru yet.</span>
                          </SidebarMenuSubItem>
                        )}
                        {guruHistory.conversations.map((convoSummary) => (
                          <SidebarMenuSubItem key={convoSummary.conversationId}>
                            <button
                              // Pass guruId and conversationId to the handler
                              onClick={() => handleChatLinkClick(guruHistory.guruId, convoSummary.conversationId)}
                              className="flex items-center w-full h-auto px-2 py-1.5 text-left text-xs rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                            >
                              {convoSummary.summary}
                            </button>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))
            ) : isSearching ? (
              // Show message when search yields no results
              <SidebarMenuItem>
                <span className="text-muted-foreground text-sm px-2 py-1">No results found.</span>
              </SidebarMenuItem>
            ) : (
              // Show message when history is empty (and not searching)
              <SidebarMenuItem>
                <span className="text-muted-foreground text-sm px-2 py-1">No chat history yet.</span>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
