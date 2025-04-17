import mongoose, { Document, Schema } from 'mongoose';

// Interface representing a document in MongoDB.
export interface IGuru extends Document {
  name: string;
  description: string; // Maps from old 'personality'
  systemPrompt: string; // Maps from old 'prompt'
}

// Schema corresponding to the document interface.
const guruSchema: Schema<IGuru> = new Schema({
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
}, {
  timestamps: true // Automatically add createdAt and updatedAt fields
});

// Create and export the model
// Avoids OverwriteModelError: Cannot overwrite `Guru` model once compiled.
export default mongoose.models.Guru || mongoose.model<IGuru>('Guru', guruSchema);