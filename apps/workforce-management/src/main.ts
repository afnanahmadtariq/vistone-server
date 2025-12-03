import express from 'express';
import teamRoutes from './routes/teams';
import teamMemberRoutes from './routes/team-members';
import userSkillRoutes from './routes/user-skills';
import userAvailabilityRoutes from './routes/user-availability';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3002;

const app = express();

app.use(express.json());

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

app.listen(port, host, () => {
  console.log(`[ ready ] Workforce Management Service running at http://${host}:${port}`);
});
