import { NextRequest, NextResponse } from 'next/server'; // Use App Router types
// Use relative path for serverless environment compatibility
import connectDb from '@/lib/mongodb';
import Guru, { IGuru } from '@/lib/models/Guru';

// Define the GET handler using named export
export async function GET(req: NextRequest) {
  // Method check is implicit

  try {
      await connectDb();
      const gurus: IGuru[] = await Guru.find({}); /* find all the data in our database */
      return NextResponse.json({ success: true, data: gurus }, { status: 200 }); // Use NextResponse
  } catch (error) {
      console.error("Failed to fetch gurus:", error);
      return NextResponse.json({ success: false, message: 'Failed to fetch gurus' }, { status: 400 }); // Use NextResponse
  }
  // No default case needed if only GET is handled
}

// Remove the default export
// export default async function handler(...) { ... } 