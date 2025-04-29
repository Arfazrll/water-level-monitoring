import mongoose, { Document, Schema } from 'mongoose';

export interface Alert extends Document {
  level: number;
  type: 'warning' | 'danger';
  message: string;
  acknowledged: boolean;
  createdAt: Date;
}

const AlertSchema: Schema = new Schema(
  {
    level: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['warning', 'danger'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    acknowledged: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<Alert>('Alert', AlertSchema);