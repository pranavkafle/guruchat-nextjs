'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';

// Define the Guru type
interface Guru {
    _id: string;
    name: string;
    description: string;
}

// Helper function to generate image paths
function getGuruImagePath(guruName: string): string {
    const normalizedName = guruName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '_') + '.png';
    return `/images/${normalizedName}`;
}

export default function HomePage() {
    const router = useRouter();
    const [gurus, setGurus] = useState<Guru[]>([]);
    const [isLoadingGurus, setIsLoadingGurus] = useState<boolean>(true);
    const [errorGurus, setErrorGurus] = useState<string | null>(null);

    // Fetch Gurus
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
                console.error("Error fetching gurus:", error);
                setErrorGurus(error.message || 'An unknown error occurred while fetching gurus.');
            } finally {
                setIsLoadingGurus(false);
            }
        };
        fetchGurus();
    }, []); // Run once on mount

    // Function to handle Guru selection and navigate
    const handleSelectGuru = (guruId: string) => {
        router.push(`/chat?guruId=${guruId}`); // Navigate to chat page with guruId
    };

    return (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain">
            <div className="container mx-auto p-4 flex flex-col">
                <h1 className="text-3xl font-bold mb-6 text-center">
                    Choose Your Guru
                </h1>

            {/* Loading State */}
            {isLoadingGurus && (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading Gurus...</span>
                </div>
            )}

            {/* Error State */}
            {errorGurus && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{errorGurus}</AlertDescription>
                </Alert>
            )}

            {/* Guru Selection Grid */}
            {!isLoadingGurus && !errorGurus && gurus.length > 0 && (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                    {gurus.map((guru) => (
                        <Card
                            key={guru._id}
                            onClick={() => handleSelectGuru(guru._id)} // Updated onClick
                            className="p-0 cursor-pointer overflow-hidden transition-all duration-200 ease-in-out hover:shadow-lg hover:scale-105 border"
                        >
                            <div className="aspect-[2/3] relative w-full overflow-hidden">
                                <Image
                                    src={getGuruImagePath(guru.name)}
                                    alt={guru.name}
                                    fill
                                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    className="object-cover object-top"
                                    priority={true} // Consider removing priority if many images load
                                    onError={(e) => {
                                        e.currentTarget.src = '/images/placeholder.png';
                                        e.currentTarget.onerror = null;
                                    }}
                                />
                            </div>
                            <div className="p-4">
                                <h3 className="text-lg font-semibold mb-2">{guru.name}</h3>
                                <p className="text-sm text-muted-foreground">{guru.description}</p>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* No Gurus State */}
             {!isLoadingGurus && !errorGurus && gurus.length === 0 && (
                 <p className="text-center text-muted-foreground">No Gurus available. Check seeding.</p>
            )}
            </div>
        </div>
    );
}
