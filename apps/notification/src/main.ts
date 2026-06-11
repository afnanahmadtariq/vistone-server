import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  bearerAuthMiddleware,
  combineInternalAuthSkips,
  defaultInternalAuthSkip,
  internalServiceKeySkip,
} from '@vistone-server/shared-internal-auth';
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

app.use(
  bearerAuthMiddleware({
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    skip: combineInternalAuthSkips(
      defaultInternalAuthSkip,
      internalServiceKeySkip(['/emails']),
    ),
  })
);

app.get('/', (req, res) => {
  res.send({ message: 'Notification Service' });
});

app.get('/health', (req, res) => {
  res.send({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/notification-templates', notificationTemplatesRouter);
app.use('/notification-preferences', notificationPreferencesRouter);
app.use('/notifications', notificationsRouter);
app.use('/emails', emailsRouter);

app.listen(port, host, () => {
  console.log(`[ ready ] Notification Service running at http://${host}:${port}`);
});
