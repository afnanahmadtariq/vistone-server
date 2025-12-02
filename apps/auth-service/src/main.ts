import express from 'express';
import userRoutes from './routes/users';
import organizationRoutes from './routes/organizations';
import organizationMemberRoutes from './routes/organization-members';
import roleRoutes from './routes/roles';
import kycDataRoutes from './routes/kyc-data';
import mfaSettingRoutes from './routes/mfa-settings';
import activityLogRoutes from './routes/activity-logs';
import { startGrpcServer } from './grpc/server';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3001;
const grpcPort = process.env.AUTH_GRPC_PORT ? Number(process.env.AUTH_GRPC_PORT) : 50051;

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Auth Service API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});

// User & Organization routes
app.use('/users', userRoutes);
app.use('/organizations', organizationRoutes);
app.use('/organization-members', organizationMemberRoutes);
app.use('/roles', roleRoutes);
app.use('/kyc-data', kycDataRoutes);
app.use('/mfa-settings', mfaSettingRoutes);
app.use('/activity-logs', activityLogRoutes);

app.listen(port, host, () => {
  console.log(`[ ready ] Auth Service running at http://${host}:${port}`);
});

// Start gRPC server
startGrpcServer(grpcPort);
