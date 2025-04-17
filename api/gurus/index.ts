import { NextApiRequest, NextApiResponse } from 'next';
// Use relative path for serverless environment compatibility
import connectDb from '../../lib/mongodb';
import Guru, { IGuru } from '../../lib/models/Guru';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  await connectDb();

  switch (method) {
    case 'GET':
      try {
        const gurus: IGuru[] = await Guru.find({}); /* find all the data in our database */
        res.status(200).json({ success: true, data: gurus });
      } catch (error) {
        console.error("Failed to fetch gurus:", error);
        res.status(400).json({ success: false, message: 'Failed to fetch gurus' });
      }
      break;
    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${method} Not Allowed`);
      break;
  }
} 