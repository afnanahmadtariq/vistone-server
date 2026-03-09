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

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.send({ message: 'Auth Service API' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/organizations', organizationRoutes);
app.use('/organization-members', organizationMemberRoutes);
app.use('/roles', roleRoutes);
app.use('/kyc-data', kycDataRoutes);
app.use('/mfa-settings', mfaSettingRoutes);
app.use('/activity-logs', activityLogRoutes);

export default app;
