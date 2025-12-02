import express from 'express';
import chatChannelRoutes from './routes/chat-channels';
import channelMemberRoutes from './routes/channel-members';
import chatMessageRoutes from './routes/chat-messages';
import messageMentionRoutes from './routes/message-mentions';
import messageAttachmentRoutes from './routes/message-attachments';
import communicationLogRoutes from './routes/communication-logs';
import { startGrpcServer } from './grpc/server';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3006;
const grpcPort = process.env.COMMUNICATION_GRPC_PORT ? Number(process.env.COMMUNICATION_GRPC_PORT) : 50056;

const app = express();

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

// Start gRPC server
startGrpcServer(grpcPort);
