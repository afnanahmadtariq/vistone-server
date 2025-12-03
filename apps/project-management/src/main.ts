import express from 'express';
import cors from 'cors';
import projectRoutes from './routes/projects';
import projectMemberRoutes from './routes/project-members';
import taskRoutes from './routes/tasks';
import taskChecklistRoutes from './routes/task-checklists';
import taskDependencyRoutes from './routes/task-dependencies';
import milestoneRoutes from './routes/milestones';
import riskRegisterRoutes from './routes/risk-register';
import aiInsightRoutes from './routes/ai-insights';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3003;

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Project Management Service API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'project-management', timestamp: new Date().toISOString() });
});

// Project Management routes
app.use('/projects', projectRoutes);
app.use('/project-members', projectMemberRoutes);
app.use('/tasks', taskRoutes);
app.use('/task-checklists', taskChecklistRoutes);
app.use('/task-dependencies', taskDependencyRoutes);
app.use('/milestones', milestoneRoutes);
app.use('/risk-register', riskRegisterRoutes);
app.use('/ai-insights', aiInsightRoutes);

app.listen(port, host, () => {
  console.log(`[ ready ] Project Management Service running at http://${host}:${port}`);
});
