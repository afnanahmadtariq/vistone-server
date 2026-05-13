import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { bearerAuthMiddleware, defaultInternalAuthSkip } from '@vistone-server/shared-internal-auth';
import projectRoutes from './modules/projects/projects.routes';
import projectMemberRoutes from './modules/project-members/project-members.routes';
import taskRoutes from './modules/tasks/tasks.routes';
import taskChecklistRoutes from './modules/task-checklists/task-checklists.routes';
import taskDependencyRoutes from './modules/task-dependencies/task-dependencies.routes';
import taskSubmissionRoutes from './modules/task-submissions/task-submissions.routes';
import milestoneRoutes from './modules/milestones/milestones.routes';
import riskRegisterRoutes from './modules/risk-register/risk-register.routes';
import riskQualityMetricsRoutes from './modules/risk-quality-metrics/risk-quality-metrics.routes';
import aiInsightRoutes from './modules/ai-insights/ai-insights.routes';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3003;

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
app.use('/task-submissions', taskSubmissionRoutes);
app.use('/milestones', milestoneRoutes);
app.use('/risk-register', riskRegisterRoutes);
app.use('/risk-quality-metrics', riskQualityMetricsRoutes);
app.use('/ai-insights', aiInsightRoutes);

app.listen(port, host, () => {
  console.log(`[ ready ] Project Management Service running at http://${host}:${port}`);
});
