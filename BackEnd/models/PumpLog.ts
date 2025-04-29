import mongoose, { Document, Schema } from 'mongoose';

export interface PumpLog extends Document {
  isActive: boolean;
  startTime?: Date;
  endTime?: Date;
  duration?: number; // in seconds
  activatedBy: 'auto' | 'manual';
  waterLevelAtActivation?: number;
}

const PumpLogSchema: Schema = new Schema(
  {
    isActive: {
      type: Boolean,
      required: true,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number,
    },
    activatedBy: {
      type: String,
      enum: ['auto', 'manual'],
      required: true,
    },
    waterLevelAtActivation: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<PumpLog>('PumpLog', PumpLogSchema);