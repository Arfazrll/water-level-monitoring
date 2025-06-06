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

    const settingsExist = await Setting.findOne();
    if (!settingsExist) {
      console.log('Creating default settings...');
      await Setting.create({
        thresholds: {
          warningLevel: 30,
          dangerLevel: 20,
          maxLevel: 100,
          minLevel: 0,
          pumpActivationLevel: 40,
          pumpDeactivationLevel: 20,
          unit: 'cm',
        },
        notifications: {
          emailEnabled: false,
          emailAddress: process.env.EMAIL_USER || '',
          notifyOnWarning: true,
          notifyOnDanger: true,
          notifyOnPumpActivation: false,
        },
        pumpMode: 'auto',
      });
      console.log('Default settings created');
    }

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

initializeDatabase();