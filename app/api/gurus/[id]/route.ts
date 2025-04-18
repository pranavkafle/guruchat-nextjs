import { NextRequest, NextResponse } from 'next/server'; // Use App Router types
import connectDb from '@/lib/mongodb';
import Guru, { IGuru } from '@/lib/models/Guru';
import mongoose from 'mongoose';

// Remove NextApiRequest/Response imports
// import { NextApiRequest, NextApiResponse } from 'next';

// Define the GET handler using named export
// The second argument provides access to route parameters (like `id`)
export async function GET(
  req: NextRequest, 
  context: { params: { id: string } } // Use standard context object name
) {
  // Properly await the context and params
  const { params } = context;
  const id = params.id; // Extract id directly from params

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: 'Invalid Guru ID format' }, { status: 400 }); // Use NextResponse
  }

  try {
      await connectDb();
      const guru: IGuru | null = await Guru.findById(id);
      if (!guru) {
        return NextResponse.json({ success: false, message: 'Guru not found' }, { status: 404 }); // Use NextResponse
      }
      return NextResponse.json({ success: true, data: guru }, { status: 200 }); // Use NextResponse
  } catch (error) {
      console.error(`Failed to fetch guru with id ${id}:`, error);
      // Handle potential CastError separately if needed, though isValid check helps
      if (error instanceof Error && error.name === 'CastError') {
          return NextResponse.json({ success: false, message: 'Invalid Guru ID format' }, { status: 400 }); // Use NextResponse
      }
      return NextResponse.json({ success: false, message: 'Server error fetching guru' }, { status: 500 }); // Use NextResponse
  }
  // No default case needed if only GET is handled
}

// Remove the default export
// export default async function handler(...) { ... } 