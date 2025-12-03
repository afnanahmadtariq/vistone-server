import express from 'express';
import notificationTemplatesRouter from './routes/notification-templates';
import notificationPreferencesRouter from './routes/notification-preferences';
import notificationsRouter from './routes/notifications';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3008;

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Notification Service' });
});

app.use('/notification-templates', notificationTemplatesRouter);
app.use('/notification-preferences', notificationPreferencesRouter);
app.use('/notifications', notificationsRouter);

app.listen(port, host, () => {
  console.log(`[ ready ] Notification Service running at http://${host}:${port}`);
});
