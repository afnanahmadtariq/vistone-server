import express from 'express';
import cors from 'cors';
import kpiDefinitionsRouter from './modules/kpi-definitions/kpi-definitions.routes';
import kpiMeasurementsRouter from './modules/kpi-measurements/kpi-measurements.routes';
import reportTemplatesRouter from './modules/report-templates/report-templates.routes';
import generatedReportsRouter from './modules/generated-reports/generated-reports.routes';
import memberPerformanceRouter from './modules/member-performance/member-performance.routes';
import aiConversationsRouter from './modules/ai-conversations/ai-conversations.routes';
import automationRulesRouter from './modules/automation-rules/automation-rules.routes';
import automationLogsRouter from './modules/automation-logs/automation-logs.routes';
import dashboardsRouter from './modules/dashboards/dashboards.routes';
import dashboardWidgetsRouter from './modules/dashboard-widgets/dashboard-widgets.routes';

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
