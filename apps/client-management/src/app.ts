import express from 'express';
import cors from 'cors';
import clientRoutes from './modules/clients/clients.routes';
import projectClientRoutes from './modules/project-clients/project-clients.routes';
import clientFeedbackRoutes from './modules/client-feedback/client-feedback.routes';
import proposalRoutes from './modules/proposals/proposals.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.send({ message: 'Client Management Service API' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'client-management', timestamp: new Date().toISOString() });
});

app.use('/clients', clientRoutes);
app.use('/project-clients', projectClientRoutes);
app.use('/client-feedback', clientFeedbackRoutes);
app.use('/proposals', proposalRoutes);

export default app;
