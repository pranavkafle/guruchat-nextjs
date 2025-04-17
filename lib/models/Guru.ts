import mongoose, { Schema, Document, models, Model } from 'mongoose';

export interface IGuru extends Document {
  name: string;
  description: string;
  systemPrompt: string;
  createdAt: Date;
  updatedAt: Date;
}

const GuruSchema: Schema<IGuru> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name for the Guru.'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a description for the Guru.'],
      trim: true,
    },
    systemPrompt: {
      type: String,
      required: [true, 'Please provide a system prompt for the Guru.'],
      trim: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

const Guru: Model<IGuru> = models.Guru || mongoose.model<IGuru>('Guru', GuruSchema);

export default Guru; 