import express from 'express';
import userRoutes from './routes/users';
import organizationRoutes from './routes/organizations';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import teamRoutes from './routes/teams';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});

app.use('/users', userRoutes);
app.use('/organizations', organizationRoutes);
app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes);
app.use('/teams', teamRoutes);

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
