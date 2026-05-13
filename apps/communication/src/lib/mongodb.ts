import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vistone-chat';

/** 1 = connected (avoids a stale flag if the driver disconnects later). */
export async function connectMongo(): Promise<void> {
    if (mongoose.connection.readyState === 1) return;

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('[MongoDB] Connected successfully to:', MONGODB_URI.replace(/\/\/.*@/, '//***@'));
    } catch (error) {
        console.error('[MongoDB] Connection failed:', error);
        process.exit(1);
    }
}

export default mongoose;
