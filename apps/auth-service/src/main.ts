import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import organizationRoutes from './modules/organizations/organizations.routes';
import organizationMemberRoutes from './modules/organization-members/organization-members.routes';
import roleRoutes from './modules/roles/roles.routes';
import kycDataRoutes from './modules/kyc-data/kyc-data.routes';
import mfaSettingRoutes from './modules/mfa-settings/mfa-settings.routes';
import activityLogRoutes from './modules/activity-logs/activity-logs.routes';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Auth Service API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});

// Authentication routes
app.use('/auth', authRoutes);

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
