import express from 'express';
import cors from 'cors';
import chatChannelRoutes from './modules/chat-channels/chat-channels.routes';
import channelMemberRoutes from './modules/channel-members/channel-members.routes';
import chatMessageRoutes from './modules/chat-messages/chat-messages.routes';
import messageMentionRoutes from './modules/message-mentions/message-mentions.routes';
import messageAttachmentRoutes from './modules/message-attachments/message-attachments.routes';
import communicationLogRoutes from './modules/communication-logs/communication-logs.routes';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3006;

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Communication Service API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'communication', timestamp: new Date().toISOString() });
});

// Communication routes
app.use('/chat-channels', chatChannelRoutes);
app.use('/channel-members', channelMemberRoutes);
app.use('/chat-messages', chatMessageRoutes);
app.use('/message-mentions', messageMentionRoutes);
app.use('/message-attachments', messageAttachmentRoutes);
app.use('/communication-logs', communicationLogRoutes);

app.listen(port, host, () => {
  console.log(`[ ready ] Communication Service running at http://${host}:${port}`);
});
