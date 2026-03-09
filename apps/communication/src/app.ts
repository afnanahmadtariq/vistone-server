import express from 'express';
import cors from 'cors';
import chatChannelRoutes from './modules/chat-channels/chat-channels.routes';
import channelMemberRoutes from './modules/channel-members/channel-members.routes';
import messageRoutes from './modules/messages/messages.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.send({ message: 'Communication Service API' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'communication', timestamp: new Date().toISOString() });
});

app.use('/chat-channels', chatChannelRoutes);
app.use('/channel-members', channelMemberRoutes);
app.use('/messages', messageRoutes);

export default app;
