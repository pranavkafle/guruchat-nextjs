import mongoose, { Schema, Document, Types, models, Model } from 'mongoose';

interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface IChat extends Document {
  userId: Types.ObjectId;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema<IMessage> = new Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ['user', 'assistant', 'system'],
    },
    content: {
      type: String,
      required: true,
    },
  },
  { _id: false } // Prevent Mongoose from creating _id for subdocuments
);

const ChatSchema: Schema<IChat> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
      required: true,
      index: true, // Index for faster lookups by userId
    },
    messages: {
      type: [MessageSchema],
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

const Chat: Model<IChat> = models.Chat || mongoose.model<IChat>('Chat', ChatSchema);

export default Chat; 