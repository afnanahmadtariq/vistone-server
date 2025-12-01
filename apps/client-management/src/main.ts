import express from 'express';
import clientRoutes from './routes/clients';
import projectClientRoutes from './routes/project-clients';
import clientFeedbackRoutes from './routes/client-feedback';
import proposalRoutes from './routes/proposals';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3004;

const app = express();

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
