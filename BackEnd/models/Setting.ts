import mongoose, { Document, Schema } from 'mongoose';

export interface ThresholdSettings {
  warningLevel: number;
  dangerLevel: number;
  maxLevel: number;
  minLevel: number;
  pumpActivationLevel: number;
  pumpDeactivationLevel: number;
  unit: string;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  emailAddress: string;
  notifyOnWarning: boolean;
  notifyOnDanger: boolean;
  notifyOnPumpActivation: boolean;
}

export interface Settings extends Document {
  thresholds: ThresholdSettings;
  notifications: NotificationSettings;
  pumpMode: 'auto' | 'manual';
  lastUpdatedBy?: string; // User ID
}

const SettingsSchema: Schema = new Schema(
  {
    thresholds: {
      warningLevel: {
        type: Number,
        required: true,
        default: 70,
      },
      dangerLevel: {
        type: Number,
        required: true,
        default: 90,
      },
      maxLevel: {
        type: Number,
        required: true,
        default: 100,
      },
      minLevel: {
        type: Number,
        required: true,
        default: 0,
      },
      pumpActivationLevel: {
        type: Number,
        required: true,
        default: 80,
      },
      pumpDeactivationLevel: {
        type: Number,
        required: true,
        default: 40,
      },
      unit: {
        type: String,
        required: true,
        default: 'cm',
      },
    },
    notifications: {
      emailEnabled: {
        type: Boolean,
        default: false,
      },
      emailAddress: {
        type: String,
        default: '',
      },
      notifyOnWarning: {
        type: Boolean,
        default: true,
      },
      notifyOnDanger: {
        type: Boolean,
        default: true,
      },
      notifyOnPumpActivation: {
        type: Boolean,
        default: false,
      },
    },
    pumpMode: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'auto',
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Initialize with default settings if none exist
SettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model<Settings>('Settings', SettingsSchema);