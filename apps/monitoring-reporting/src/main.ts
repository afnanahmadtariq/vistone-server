import express from 'express';
import cors from 'cors';
import kpiDefinitionsRouter from './routes/kpi-definitions';
import kpiMeasurementsRouter from './routes/kpi-measurements';
import reportTemplatesRouter from './routes/report-templates';
import generatedReportsRouter from './routes/generated-reports';
import memberPerformanceRouter from './routes/member-performance';
import aiConversationsRouter from './routes/ai-conversations';
import automationRulesRouter from './routes/automation-rules';
import automationLogsRouter from './routes/automation-logs';
import dashboardsRouter from './routes/dashboards';
import dashboardWidgetsRouter from './routes/dashboard-widgets';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3007;

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Monitoring & Reporting Service' });
});

app.use('/kpi-definitions', kpiDefinitionsRouter);
app.use('/kpi-measurements', kpiMeasurementsRouter);
app.use('/report-templates', reportTemplatesRouter);
app.use('/generated-reports', generatedReportsRouter);
app.use('/member-performance', memberPerformanceRouter);
app.use('/ai-conversations', aiConversationsRouter);
app.use('/automation-rules', automationRulesRouter);
app.use('/automation-logs', automationLogsRouter);
app.use('/dashboards', dashboardsRouter);
app.use('/dashboard-widgets', dashboardWidgetsRouter);

app.listen(port, host, () => {
  console.log(`[ ready ] Monitoring & Reporting Service running at http://${host}:${port}`);
});
