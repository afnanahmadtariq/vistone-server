import express from 'express';
import cors from 'cors';
import teamRoutes from './modules/teams/teams.routes';
import teamMemberRoutes from './modules/team-members/team-members.routes';
import userSkillRoutes from './modules/user-skills/user-skills.routes';
import userAvailabilityRoutes from './modules/user-availability/user-availability.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.send({ message: 'Workforce Management Service API' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'workforce-management', timestamp: new Date().toISOString() });
});

app.use('/teams', teamRoutes);
app.use('/team-members', teamMemberRoutes);
app.use('/user-skills', userSkillRoutes);
app.use('/user-availability', userAvailabilityRoutes);

export default app;
