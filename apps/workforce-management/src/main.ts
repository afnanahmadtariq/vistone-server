import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { bearerAuthMiddleware, defaultInternalAuthSkip } from '@vistone-server/shared-internal-auth';
import teamRoutes from './modules/teams/teams.routes';
import teamMemberRoutes from './modules/team-members/team-members.routes';
import userSkillRoutes from './modules/user-skills/user-skills.routes';
import userAvailabilityRoutes from './modules/user-availability/user-availability.routes';
import attendanceLogRoutes from './modules/attendance-logs/attendance-logs.routes';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3002;

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

app.use(
  bearerAuthMiddleware({
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    skip: defaultInternalAuthSkip,
  })
);

app.get('/', (req, res) => {
  res.send({ message: 'Workforce Management Service API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'workforce-management', timestamp: new Date().toISOString() });
});

// Team & Workforce routes
app.use('/teams', teamRoutes);
app.use('/team-members', teamMemberRoutes);
app.use('/user-skills', userSkillRoutes);
app.use('/user-availability', userAvailabilityRoutes);
app.use('/attendance-logs', attendanceLogRoutes);

app.listen(port, host, () => {
  console.log(`[ ready ] Workforce Management Service running at http://${host}:${port}`);
});
