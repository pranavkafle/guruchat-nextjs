import mongoose from 'mongoose';

// Retrieve the MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local or Vercel settings'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    console.log('Using cached database connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable mongoose buffering
    };

    console.log('Creating new database connection');
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
       console.log('Database connection successful');
      return mongoose;
    }).catch(error => {
      console.error('Database connection error:', error);
      cached.promise = null; // Reset promise on error
      throw error; // Rethrow error to indicate connection failure
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Reset promise on error
    throw e; // Rethrow error
  }

  return cached.conn;
}

export default connectDB; 