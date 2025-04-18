import mongoose, { Schema, Document, models, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Password is selected explicitly only when needed
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name.'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email.'],
      unique: true,
      match: [/.+\@.+\..+/, 'Please provide a valid email address.'],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password.'],
      select: false, // Ensure password is not returned by default in queries
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

// Prevent model recompilation in Next.js dev environment
const User: Model<IUser> = models.User || mongoose.model<IUser>('User', UserSchema);

export default User; 