import express from 'express';
import cors from 'cors';
import notificationTemplatesRouter from './modules/notification-templates/notification-templates.routes';
import notificationPreferencesRouter from './modules/notification-preferences/notification-preferences.routes';
import notificationsRouter from './modules/notifications/notifications.routes';
import emailsRouter from './modules/emails/emails.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.send({ message: 'Notification Service' });
});

app.get('/health', (_req, res) => {
  res.send({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/notification-templates', notificationTemplatesRouter);
app.use('/notification-preferences', notificationPreferencesRouter);
app.use('/notifications', notificationsRouter);
app.use('/emails', emailsRouter);

export default app;
