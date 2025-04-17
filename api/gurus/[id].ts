import { NextApiRequest, NextApiResponse } from 'next';
// Use relative path for serverless environment compatibility
import connectDb from '../../lib/mongodb';
import Guru, { IGuru } from '../../lib/models/Guru';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  const { id } = req.query; // Extract id from query parameters

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ success: false, message: 'Invalid Guru ID format' });
  }

  await connectDb();

  switch (method) {
    case 'GET':
      try {
        const guru: IGuru | null = await Guru.findById(id);
        if (!guru) {
          return res.status(404).json({ success: false, message: 'Guru not found' });
        }
        res.status(200).json({ success: true, data: guru });
      } catch (error) {
        console.error(`Failed to fetch guru with id ${id}:`, error);
        // Handle potential CastError separately if needed, though isValid check helps
        if (error instanceof Error && error.name === 'CastError') {
           return res.status(400).json({ success: false, message: 'Invalid Guru ID format' });
        }
        res.status(500).json({ success: false, message: 'Server error fetching guru' });
      }
      break;
    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${method} Not Allowed`);
      break;
  }
} 