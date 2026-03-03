import express from 'express';
import cors from 'cors';
import clientRoutes from './modules/clients/clients.routes';
import projectClientRoutes from './modules/project-clients/project-clients.routes';
import clientFeedbackRoutes from './modules/client-feedback/client-feedback.routes';
import proposalRoutes from './modules/proposals/proposals.routes';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3004;

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Client Management Service API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'client-management', timestamp: new Date().toISOString() });
});

// Client Management routes
app.use('/clients', clientRoutes);
app.use('/project-clients', projectClientRoutes);
app.use('/client-feedback', clientFeedbackRoutes);
app.use('/proposals', proposalRoutes);

app.listen(port, host, () => {
  console.log(`[ ready ] Client Management Service running at http://${host}:${port}`);
});
