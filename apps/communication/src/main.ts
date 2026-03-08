import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { connectMongo } from './lib/mongodb';
import { initSocketServer } from './lib/socket';
import chatChannelRoutes from './modules/chat-channels/chat-channels.routes';
import channelMemberRoutes from './modules/channel-members/channel-members.routes';
import messageRoutes from './modules/messages/messages.routes';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3006;

const app = express();
const httpServer = createServer(app);

// Enable CORS
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.send({ message: 'Communication Service API' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'communication', timestamp: new Date().toISOString() });
});

// REST routes (channels & members are PostgreSQL; messages are MongoDB)
app.use('/chat-channels', chatChannelRoutes);
app.use('/channel-members', channelMemberRoutes);
app.use('/messages', messageRoutes);

// Start server
async function bootstrap() {
  // Connect to MongoDB
  await connectMongo();

  // Initialize Socket.IO on the HTTP server
  initSocketServer(httpServer);

  httpServer.listen(port, host, () => {
    console.log(`[ ready ] Communication Service running at http://${host}:${port}`);
    console.log(`[ ready ] WebSocket server available at ws://${host}:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Communication] Failed to start:', err);
  process.exit(1);
});

