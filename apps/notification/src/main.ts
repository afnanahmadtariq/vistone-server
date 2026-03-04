import express from 'express';
import cors from 'cors';
import notificationTemplatesRouter from './modules/notification-templates/notification-templates.routes';
import notificationPreferencesRouter from './modules/notification-preferences/notification-preferences.routes';
import notificationsRouter from './modules/notifications/notifications.routes';
import emailsRouter from './modules/emails/emails.routes';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3008;

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Notification Service' });
});

app.use('/notification-templates', notificationTemplatesRouter);
app.use('/notification-preferences', notificationPreferencesRouter);
app.use('/notifications', notificationsRouter);
app.use('/emails', emailsRouter);

app.listen(port, host, () => {
  console.log(`[ ready ] Notification Service running at http://${host}:${port}`);
});
