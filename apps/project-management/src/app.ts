import express from 'express';
import cors from 'cors';
import projectRoutes from './modules/projects/projects.routes';
import projectMemberRoutes from './modules/project-members/project-members.routes';
import taskRoutes from './modules/tasks/tasks.routes';
import taskChecklistRoutes from './modules/task-checklists/task-checklists.routes';
import taskDependencyRoutes from './modules/task-dependencies/task-dependencies.routes';
import milestoneRoutes from './modules/milestones/milestones.routes';
import riskRegisterRoutes from './modules/risk-register/risk-register.routes';
import aiInsightRoutes from './modules/ai-insights/ai-insights.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.send({ message: 'Project Management Service API' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'project-management', timestamp: new Date().toISOString() });
});

app.use('/projects', projectRoutes);
app.use('/project-members', projectMemberRoutes);
app.use('/tasks', taskRoutes);
app.use('/task-checklists', taskChecklistRoutes);
app.use('/task-dependencies', taskDependencyRoutes);
app.use('/milestones', milestoneRoutes);
app.use('/risk-register', riskRegisterRoutes);
app.use('/ai-insights', aiInsightRoutes);

export default app;
