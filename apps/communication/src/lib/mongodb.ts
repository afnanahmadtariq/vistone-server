import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vistone-chat';

let isConnected = false;

export async function connectMongo(): Promise<void> {
    if (isConnected) return;

    try {
        await mongoose.connect(MONGODB_URI);
        isConnected = true;
        console.log('[MongoDB] Connected successfully to:', MONGODB_URI.replace(/\/\/.*@/, '//***@'));
    } catch (error) {
        console.error('[MongoDB] Connection failed:', error);
        process.exit(1);
    }
}

export default mongoose;
