import express from 'express';
import userRoutes from './routes/users';
import organizationRoutes from './routes/organizations';
import organizationMemberRoutes from './routes/organization-members';
import roleRoutes from './routes/roles';
import kycDataRoutes from './routes/kyc-data';
import mfaSettingRoutes from './routes/mfa-settings';
import activityLogRoutes from './routes/activity-logs';
import teamRoutes from './routes/teams';
import teamMemberRoutes from './routes/team-members';
import userSkillRoutes from './routes/user-skills';
import userAvailabilityRoutes from './routes/user-availability';
import projectRoutes from './routes/projects';
import projectMemberRoutes from './routes/project-members';
import taskRoutes from './routes/tasks';
import taskChecklistRoutes from './routes/task-checklists';
import taskDependencyRoutes from './routes/task-dependencies';
import milestoneRoutes from './routes/milestones';
import riskRegisterRoutes from './routes/risk-register';
import clientRoutes from './routes/clients';
import projectClientRoutes from './routes/project-clients';
import clientFeedbackRoutes from './routes/client-feedback';
import proposalRoutes from './routes/proposals';
import wikiPageRoutes from './routes/wiki-pages';
import wikiPageVersionRoutes from './routes/wiki-page-versions';
import documentFolderRoutes from './routes/document-folders';
import documentRoutes from './routes/documents';
import documentPermissionRoutes from './routes/document-permissions';
import documentLinkRoutes from './routes/document-links';
import chatChannelRoutes from './routes/chat-channels';
import channelMemberRoutes from './routes/channel-members';
import chatMessageRoutes from './routes/chat-messages';
import messageMentionRoutes from './routes/message-mentions';
import messageAttachmentRoutes from './routes/message-attachments';
import communicationLogRoutes from './routes/communication-logs';
import aiConversationRoutes from './routes/ai-conversations';
import aiInsightRoutes from './routes/ai-insights';
import automationRuleRoutes from './routes/automation-rules';
import automationLogRoutes from './routes/automation-logs';
import kpiDefinitionRoutes from './routes/kpi-definitions';
import kpiMeasurementRoutes from './routes/kpi-measurements';
import reportTemplateRoutes from './routes/report-templates';
import generatedReportRoutes from './routes/generated-reports';
import memberPerformanceRoutes from './routes/member-performance';
import notificationTemplateRoutes from './routes/notification-templates';
import notificationPreferenceRoutes from './routes/notification-preferences';
import notificationRoutes from './routes/notifications';
import dashboardRoutes from './routes/dashboards';
import dashboardWidgetRoutes from './routes/dashboard-widgets';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});

// User & Organization routes
app.use('/users', userRoutes);
app.use('/organizations', organizationRoutes);
app.use('/organization-members', organizationMemberRoutes);
app.use('/roles', roleRoutes);
app.use('/kyc-data', kycDataRoutes);
app.use('/mfa-settings', mfaSettingRoutes);
app.use('/activity-logs', activityLogRoutes);

// Team routes
app.use('/teams', teamRoutes);
app.use('/team-members', teamMemberRoutes);
app.use('/user-skills', userSkillRoutes);
app.use('/user-availability', userAvailabilityRoutes);

// Project Management routes
app.use('/projects', projectRoutes);
app.use('/project-members', projectMemberRoutes);
app.use('/tasks', taskRoutes);
app.use('/task-checklists', taskChecklistRoutes);
app.use('/task-dependencies', taskDependencyRoutes);
app.use('/milestones', milestoneRoutes);
app.use('/risk-register', riskRegisterRoutes);

// Client Management routes
app.use('/clients', clientRoutes);
app.use('/project-clients', projectClientRoutes);
app.use('/client-feedback', clientFeedbackRoutes);
app.use('/proposals', proposalRoutes);

// Documentation & Knowledge routes
app.use('/wiki-pages', wikiPageRoutes);
app.use('/wiki-page-versions', wikiPageVersionRoutes);
app.use('/document-folders', documentFolderRoutes);
app.use('/documents', documentRoutes);
app.use('/document-permissions', documentPermissionRoutes);
app.use('/document-links', documentLinkRoutes);

// Communication routes
app.use('/chat-channels', chatChannelRoutes);
app.use('/channel-members', channelMemberRoutes);
app.use('/chat-messages', chatMessageRoutes);
app.use('/message-mentions', messageMentionRoutes);
app.use('/message-attachments', messageAttachmentRoutes);
app.use('/communication-logs', communicationLogRoutes);

// AI & Automation routes
app.use('/ai-conversations', aiConversationRoutes);
app.use('/ai-insights', aiInsightRoutes);
app.use('/automation-rules', automationRuleRoutes);
app.use('/automation-logs', automationLogRoutes);

// Monitoring & Reporting routes
app.use('/kpi-definitions', kpiDefinitionRoutes);
app.use('/kpi-measurements', kpiMeasurementRoutes);
app.use('/report-templates', reportTemplateRoutes);
app.use('/generated-reports', generatedReportRoutes);
app.use('/member-performance', memberPerformanceRoutes);

// Notification routes
app.use('/notification-templates', notificationTemplateRoutes);
app.use('/notification-preferences', notificationPreferenceRoutes);
app.use('/notifications', notificationRoutes);

// Dashboard routes
app.use('/dashboards', dashboardRoutes);
app.use('/dashboard-widgets', dashboardWidgetRoutes);

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
