import mongoose, { Document, Schema } from 'mongoose';

export interface WaterLevel extends Document {
  level: number;
  unit: string;
  createdAt: Date;
}

const WaterLevelSchema: Schema = new Schema(
  {
    level: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
      default: 'cm',
    },
  },
  {
    timestamps: true,
  }
);

WaterLevelSchema.index({ createdAt: -1 });

export default mongoose.model<WaterLevel>('WaterLevel', WaterLevelSchema);