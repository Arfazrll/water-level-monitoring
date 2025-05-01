import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Setting from '../models/Setting';
import User from '../models/User';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/water-monitoring';

async function initializeDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if settings exist, if not create default
    const settingsExist = await Setting.findOne();
    if (!settingsExist) {
      console.log('Creating default settings...');
      await Setting.create({
        thresholds: {
          warningLevel: 70,
          dangerLevel: 90,
          maxLevel: 100,
          minLevel: 0,
          pumpActivationLevel: 80,
          pumpDeactivationLevel: 40,
          unit: 'cm',
        },
        notifications: {
          emailEnabled: false,
          emailAddress: '',
          notifyOnWarning: true,
          notifyOnDanger: true,
          notifyOnPumpActivation: false,
        },
        pumpMode: 'auto',
      });
      console.log('Default settings created');
    }

    // Check if admin user exists, if not create default
    const adminExists = await User.findOne({ isAdmin: true });
    if (!adminExists) {
      console.log('Creating default admin user...');
      await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'admin123',
        isAdmin: true,
      });
      console.log('Default admin user created');
    }

    console.log('Database initialization complete');
  } catch (error) {
    console.error('Database initialization failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the initialization
initializeDatabase();