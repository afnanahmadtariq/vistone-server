import axios from 'axios';

// Service URLs
const SERVICES = {
  auth: 'http://localhost:3001',
  workforce: 'http://localhost:3002',
  project: 'http://localhost:3003',
  client: 'http://localhost:3004',
  knowledge: 'http://localhost:3005',
  communication: 'http://localhost:3006',
  monitoring: 'http://localhost:3007',
  notification: 'http://localhost:3008',
};

// Store created IDs for cross-service references
const ids: Record<string, string[]> = {
  users: [],
  organizations: [],
  roles: [],
  teams: [],
  projects: [],
  tasks: [],
  clients: [],
  channels: [],
  documents: [],
};

async function post(service: string, endpoint: string, data: any) {
  try {
    const response = await axios.post(`${service}${endpoint}`, data);
    return response.data;
  } catch (error: any) {
    console.error(`Error posting to ${service}${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

async function seedAuthService() {
  console.log('\n📦 Seeding Auth Service...');

  // Create Organizations
  const orgs = [
    { name: 'Acme Corporation', slug: 'acme-corp', settings: { timezone: 'UTC', language: 'en' } },
    { name: 'TechStart Inc', slug: 'techstart', settings: { timezone: 'EST', language: 'en' } },
  ];

  for (const org of orgs) {
    const created = await post(SERVICES.auth, '/organizations', org);
    ids.organizations.push(created.id);
    console.log(`  ✅ Created organization: ${org.name}`);
  }

  // Create Roles (as per BACKEND_IMPLEMENTATION_PLAN.md)
  // Internal roles: Organizer, Manager, Contributor
  // External role: Client (handled separately in client-management service)
  const roles = [
    // Organization 1 (Acme Corporation) roles
    {
      organizationId: ids.organizations[0],
      name: 'Organizer',
      permissions: {
        users: ['create', 'read', 'update', 'delete', 'assign'],
        teams: ['create', 'read', 'update', 'delete', 'assign'],
        projects: ['create', 'read', 'update', 'delete', 'assign'],
        tasks: ['create', 'read', 'update', 'delete', 'assign'],
        clients: ['create', 'read', 'update', 'delete'],
        wiki: ['create', 'read', 'update', 'delete'],
        channels: ['create', 'read', 'update', 'delete'],
        settings: ['read', 'update'],
        reports: ['create', 'read', 'update', 'delete'],
        notifications: ['create', 'read', 'update', 'delete'],
      },
      isSystem: true
    },
    {
      organizationId: ids.organizations[0],
      name: 'Manager',
      permissions: {
        users: ['read'],
        teams: ['read', 'update'],
        projects: ['read', 'update'],
        tasks: ['create', 'read', 'update', 'assign'],
        clients: ['read'],
        wiki: ['create', 'read', 'update'],
        channels: ['create', 'read', 'update'],
        settings: ['read'],
        reports: ['read'],
        notifications: ['read', 'update'],
      }
    },
    {
      organizationId: ids.organizations[0],
      name: 'Contributor',
      permissions: {
        users: ['read'],
        teams: ['read'],
        projects: ['read'],
        tasks: ['read', 'update'],
        wiki: ['read'],
        channels: ['read', 'update'],
        reports: ['read'],
        notifications: ['read', 'update'],
      }
    },
    // Organization 2 (TechStart Inc) roles
    {
      organizationId: ids.organizations[1],
      name: 'Organizer',
      permissions: {
        users: ['create', 'read', 'update', 'delete', 'assign'],
        teams: ['create', 'read', 'update', 'delete', 'assign'],
        projects: ['create', 'read', 'update', 'delete', 'assign'],
        tasks: ['create', 'read', 'update', 'delete', 'assign'],
        clients: ['create', 'read', 'update', 'delete'],
        wiki: ['create', 'read', 'update', 'delete'],
        channels: ['create', 'read', 'update', 'delete'],
        settings: ['read', 'update'],
        reports: ['create', 'read', 'update', 'delete'],
        notifications: ['create', 'read', 'update', 'delete'],
      },
      isSystem: true
    },
    {
      organizationId: ids.organizations[1],
      name: 'Manager',
      permissions: {
        users: ['read'],
        teams: ['read', 'update'],
        projects: ['read', 'update'],
        tasks: ['create', 'read', 'update', 'assign'],
        clients: ['read'],
        wiki: ['create', 'read', 'update'],
        channels: ['create', 'read', 'update'],
        settings: ['read'],
        reports: ['read'],
        notifications: ['read', 'update'],
      }
    },
    {
      organizationId: ids.organizations[1],
      name: 'Contributor',
      permissions: {
        users: ['read'],
        teams: ['read'],
        projects: ['read'],
        tasks: ['read', 'update'],
        wiki: ['read'],
        channels: ['read', 'update'],
        reports: ['read'],
        notifications: ['read', 'update'],
      }
    },
  ];

  for (const role of roles) {
    const created = await post(SERVICES.auth, '/roles', role);
    ids.roles.push(created.id);
    console.log(`  ✅ Created role: ${role.name}`);
  }

  // Create Users with clear role assignments
  // john.admin -> Organizer (full access)
  // bob.manager -> Manager (team management)
  // jane.dev, alice.designer -> Contributors (team members)
  // charlie.qa -> Contributor (different org)
  const users = [
    { email: 'john.organizer@acme.com', firstName: 'John', lastName: 'Smith', password: 'hashed_password_123' },
    { email: 'bob.manager@acme.com', firstName: 'Bob', lastName: 'Wilson', password: 'hashed_password_123' },
    { email: 'jane.contributor@acme.com', firstName: 'Jane', lastName: 'Doe', password: 'hashed_password_123' },
    { email: 'alice.contributor@acme.com', firstName: 'Alice', lastName: 'Johnson', password: 'hashed_password_123' },
    { email: 'charlie.contributor@techstart.com', firstName: 'Charlie', lastName: 'Brown', password: 'hashed_password_123' },
  ];

  for (const user of users) {
    const created = await post(SERVICES.auth, '/users', user);
    ids.users.push(created.id);
    console.log(`  ✅ Created user: ${user.email}`);
  }

  // Create Organization Members with proper role assignments
  // ids.roles[0] = Acme Organizer
  // ids.roles[1] = Acme Manager
  // ids.roles[2] = Acme Contributor
  // ids.roles[3] = TechStart Organizer
  // ids.roles[4] = TechStart Manager
  // ids.roles[5] = TechStart Contributor
  const members = [
    { organizationId: ids.organizations[0], userId: ids.users[0], roleId: ids.roles[0] }, // John -> Organizer
    { organizationId: ids.organizations[0], userId: ids.users[1], roleId: ids.roles[1] }, // Bob -> Manager
    { organizationId: ids.organizations[0], userId: ids.users[2], roleId: ids.roles[2] }, // Jane -> Contributor
    { organizationId: ids.organizations[0], userId: ids.users[3], roleId: ids.roles[2] }, // Alice -> Contributor
    { organizationId: ids.organizations[1], userId: ids.users[4], roleId: ids.roles[5] }, // Charlie -> Contributor (TechStart)
  ];

  for (const member of members) {
    await post(SERVICES.auth, '/organization-members', member);
    console.log(`  ✅ Added user to organization`);
  }

  // Create KYC Data
  await post(SERVICES.auth, '/kyc-data', {
    userId: ids.users[0],
    status: 'verified',
    documents: { passport: 'verified', address: 'verified' },
    verifiedAt: new Date().toISOString(),
  });
  console.log(`  ✅ Created KYC data`);

  // Create MFA Settings
  await post(SERVICES.auth, '/mfa-settings', {
    userId: ids.users[0],
    enabled: true,
    secret: 'JBSWY3DPEHPK3PXP',
    backupCodes: ['ABC123', 'DEF456', 'GHI789'],
  });
  console.log(`  ✅ Created MFA settings`);

  // Create Activity Logs
  await post(SERVICES.auth, '/activity-logs', {
    userId: ids.users[0],
    action: 'LOGIN',
    entityType: 'user',
    entityId: ids.users[0],
    metadata: { browser: 'Chrome', os: 'Windows' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
  });
  console.log(`  ✅ Created activity log`);
}

async function seedWorkforceService() {
  console.log('\n👥 Seeding Workforce Service...');

  // Create Teams
  const teams = [
    { organizationId: ids.organizations[0], name: 'Engineering', description: 'Core development team', managerId: ids.users[0] },
    { organizationId: ids.organizations[0], name: 'Design', description: 'UI/UX team', managerId: ids.users[3] },
    { organizationId: ids.organizations[0], name: 'QA', description: 'Quality assurance team', managerId: ids.users[2] },
  ];

  for (const team of teams) {
    const created = await post(SERVICES.workforce, '/teams', team);
    ids.teams.push(created.id);
    console.log(`  ✅ Created team: ${team.name}`);
  }

  // Create Team Members
  const teamMembers = [
    { teamId: ids.teams[0], userId: ids.users[0], role: 'Lead' },
    { teamId: ids.teams[0], userId: ids.users[1], role: 'Senior Developer' },
    { teamId: ids.teams[1], userId: ids.users[3], role: 'Lead Designer' },
    { teamId: ids.teams[2], userId: ids.users[2], role: 'QA Manager' },
  ];

  for (const member of teamMembers) {
    await post(SERVICES.workforce, '/team-members', member);
    console.log(`  ✅ Added member to team`);
  }

  // Create User Skills
  const skills = [
    { userId: ids.users[1], skillName: 'TypeScript', proficiency: 9 },
    { userId: ids.users[1], skillName: 'React', proficiency: 8 },
    { userId: ids.users[1], skillName: 'Node.js', proficiency: 9 },
    { userId: ids.users[3], skillName: 'Figma', proficiency: 10 },
    { userId: ids.users[3], skillName: 'UI Design', proficiency: 9 },
    { userId: ids.users[2], skillName: 'Test Automation', proficiency: 8 },
  ];

  for (const skill of skills) {
    await post(SERVICES.workforce, '/user-skills', skill);
    console.log(`  ✅ Created skill: ${skill.skillName}`);
  }

  // Create User Availability
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    await post(SERVICES.workforce, '/user-availability', {
      userId: ids.users[1],
      date: date.toISOString(),
      hoursAvailable: 8,
    });
  }
  console.log(`  ✅ Created availability records`);
}

async function seedProjectService() {
  console.log('\n📋 Seeding Project Service...');

  // Create Projects
  const projects = [
    {
      organizationId: ids.organizations[0],
      name: 'E-Commerce Platform',
      description: 'Build a modern e-commerce platform with React and Node.js',
      status: 'in_progress',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      budget: 150000,
      metadata: { priority: 'high', category: 'development' },
    },
    {
      organizationId: ids.organizations[0],
      name: 'Mobile App Redesign',
      description: 'Redesign the mobile application UI/UX',
      status: 'planning',
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      budget: 50000,
      metadata: { priority: 'medium', category: 'design' },
    },
    {
      organizationId: ids.organizations[0],
      name: 'API Migration',
      description: 'Migrate legacy APIs to microservices architecture',
      status: 'in_progress',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      budget: 80000,
      metadata: { priority: 'high', category: 'infrastructure' },
    },
  ];

  for (const project of projects) {
    const created = await post(SERVICES.project, '/projects', project);
    ids.projects.push(created.id);
    console.log(`  ✅ Created project: ${project.name}`);
  }

  // Create Project Members
  const projectMembers = [
    { projectId: ids.projects[0], userId: ids.users[0], role: 'Project Manager' },
    { projectId: ids.projects[0], userId: ids.users[1], role: 'Lead Developer' },
    { projectId: ids.projects[0], userId: ids.users[3], role: 'Designer' },
    { projectId: ids.projects[1], userId: ids.users[3], role: 'Lead Designer' },
    { projectId: ids.projects[2], userId: ids.users[1], role: 'Tech Lead' },
    { projectId: ids.projects[2], userId: ids.users[2], role: 'QA Lead' },
  ];

  for (const member of projectMembers) {
    await post(SERVICES.project, '/project-members', member);
    console.log(`  ✅ Added project member`);
  }

  // Create Tasks
  const tasks = [
    { projectId: ids.projects[0], assigneeId: ids.users[1], title: 'Setup project scaffolding', description: 'Initialize the project with proper folder structure', status: 'completed', priority: 'high' },
    { projectId: ids.projects[0], assigneeId: ids.users[1], title: 'Implement authentication', description: 'Add JWT-based authentication', status: 'in_progress', priority: 'high', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
    { projectId: ids.projects[0], assigneeId: ids.users[3], title: 'Design login page', description: 'Create mockups for the login page', status: 'completed', priority: 'medium' },
    { projectId: ids.projects[0], assigneeId: ids.users[1], title: 'Implement product catalog', description: 'Build the product listing and detail pages', status: 'todo', priority: 'high', dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() },
    { projectId: ids.projects[0], assigneeId: ids.users[1], title: 'Shopping cart functionality', description: 'Implement add to cart and checkout flow', status: 'todo', priority: 'high' },
    { projectId: ids.projects[2], assigneeId: ids.users[1], title: 'Document existing APIs', description: 'Create OpenAPI specs for all existing endpoints', status: 'in_progress', priority: 'medium' },
    { projectId: ids.projects[2], assigneeId: ids.users[2], title: 'Create integration tests', description: 'Write tests for API endpoints', status: 'todo', priority: 'medium' },
  ];

  for (const task of tasks) {
    const created = await post(SERVICES.project, '/tasks', task);
    ids.tasks.push(created.id);
    console.log(`  ✅ Created task: ${task.title}`);
  }

  // Create Task Checklists
  const checklists = [
    { taskId: ids.tasks[1], item: 'Setup Passport.js', isCompleted: true },
    { taskId: ids.tasks[1], item: 'Implement JWT token generation', isCompleted: true },
    { taskId: ids.tasks[1], item: 'Add refresh token logic', isCompleted: false },
    { taskId: ids.tasks[1], item: 'Write authentication tests', isCompleted: false },
    { taskId: ids.tasks[3], item: 'Create product model', isCompleted: false },
    { taskId: ids.tasks[3], item: 'Build product API endpoints', isCompleted: false },
    { taskId: ids.tasks[3], item: 'Implement search functionality', isCompleted: false },
  ];

  for (const checklist of checklists) {
    await post(SERVICES.project, '/task-checklists', checklist);
    console.log(`  ✅ Created checklist item`);
  }

  // Create Task Dependencies
  await post(SERVICES.project, '/task-dependencies', {
    taskId: ids.tasks[3],
    dependsOnId: ids.tasks[1],
    type: 'finish_to_start',
  });
  await post(SERVICES.project, '/task-dependencies', {
    taskId: ids.tasks[4],
    dependsOnId: ids.tasks[3],
    type: 'finish_to_start',
  });
  console.log(`  ✅ Created task dependencies`);

  // Create Milestones
  const milestones = [
    { projectId: ids.projects[0], title: 'MVP Release', description: 'First version with core features', dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), status: 'in_progress' },
    { projectId: ids.projects[0], title: 'Beta Release', description: 'Feature complete version', dueDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString(), status: 'planned' },
    { projectId: ids.projects[0], title: 'Production Launch', description: 'Go live', dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'planned' },
  ];

  for (const milestone of milestones) {
    await post(SERVICES.project, '/milestones', milestone);
    console.log(`  ✅ Created milestone: ${milestone.title}`);
  }

  // Create Risk Register
  const risks = [
    { projectId: ids.projects[0], description: 'Third-party payment integration delays', probability: 'medium', impact: 'high', mitigationPlan: 'Start integration early and have fallback provider', status: 'open' },
    { projectId: ids.projects[0], description: 'Resource availability during holidays', probability: 'high', impact: 'medium', mitigationPlan: 'Front-load critical tasks before holiday season', status: 'mitigated' },
  ];

  for (const risk of risks) {
    await post(SERVICES.project, '/risk-register', risk);
    console.log(`  ✅ Created risk: ${risk.description.substring(0, 30)}...`);
  }

  // Create AI Insights
  await post(SERVICES.project, '/ai-insights', {
    projectId: ids.projects[0],
    content: 'Based on current velocity, the project is on track to meet the MVP deadline. Consider adding one more developer to ensure buffer time.',
    confidence: 0.85,
    actionable: true,
  });
  await post(SERVICES.project, '/ai-insights', {
    taskId: ids.tasks[1],
    content: 'This task has been in progress for 5 days. Similar tasks typically take 3 days. Consider breaking it into smaller subtasks.',
    confidence: 0.78,
    actionable: true,
  });
  console.log(`  ✅ Created AI insights`);
}

async function seedClientService() {
  console.log('\n🏢 Seeding Client Service...');

  // Create Clients
  const clients = [
    { name: 'RetailMax Inc', contactInfo: { email: 'contact@retailmax.com', phone: '+1-555-0100', address: '123 Commerce St' }, portalAccess: true },
    { name: 'FoodDelivery Pro', contactInfo: { email: 'hello@fooddeliverypro.com', phone: '+1-555-0200' }, portalAccess: true },
    { name: 'HealthCare Plus', contactInfo: { email: 'info@healthcareplus.com', phone: '+1-555-0300' }, portalAccess: false },
  ];

  for (const client of clients) {
    const created = await post(SERVICES.client, '/clients', client);
    ids.clients.push(created.id);
    console.log(`  ✅ Created client: ${client.name}`);
  }

  // Create Project-Client associations
  await post(SERVICES.client, '/project-clients', { projectId: ids.projects[0], clientId: ids.clients[0] });
  await post(SERVICES.client, '/project-clients', { projectId: ids.projects[1], clientId: ids.clients[1] });
  console.log(`  ✅ Associated clients with projects`);

  // Create Client Feedback
  const feedback = [
    { clientId: ids.clients[0], projectId: ids.projects[0], rating: 5, comment: 'Great progress on the project! Love the design direction.', response: 'Thank you! We appreciate your feedback.' },
    { clientId: ids.clients[0], rating: 4, comment: 'Communication has been excellent. Looking forward to the next milestone.' },
  ];

  for (const fb of feedback) {
    await post(SERVICES.client, '/client-feedback', fb);
    console.log(`  ✅ Created client feedback`);
  }

  // Create Proposals
  const proposals = [
    { clientId: ids.clients[2], title: 'Healthcare Portal Development', content: 'Proposal for building a patient management portal with appointment scheduling, medical records, and telemedicine features.', status: 'pending' },
    { clientId: ids.clients[1], title: 'Mobile App Enhancement', content: 'Proposal for adding real-time order tracking and driver communication features.', status: 'accepted' },
  ];

  for (const proposal of proposals) {
    await post(SERVICES.client, '/proposals', proposal);
    console.log(`  ✅ Created proposal: ${proposal.title}`);
  }
}

async function seedKnowledgeService() {
  console.log('\n📚 Seeding Knowledge Hub Service...');

  // Create Document Folders (matching schema: organizationId, name, parentId)
  const folders = [
    { organizationId: ids.organizations[0], name: 'Engineering Docs' },
    { organizationId: ids.organizations[0], name: 'Design System' },
    { organizationId: ids.organizations[0], name: 'Policies' },
  ];

  const folderIds: string[] = [];
  for (const folder of folders) {
    const created = await post(SERVICES.knowledge, '/document-folders', folder);
    folderIds.push(created.id);
    console.log(`  ✅ Created folder: ${folder.name}`);
  }

  // Create Documents (matching schema: organizationId, folderId, projectId, name, url, version, metadata)
  const documents = [
    { organizationId: ids.organizations[0], folderId: folderIds[0], name: 'API Guidelines', url: '/docs/api-guidelines.md', metadata: { type: 'markdown' } },
    { organizationId: ids.organizations[0], folderId: folderIds[0], name: 'Database Schema', url: '/docs/database-schema.md', metadata: { type: 'markdown' } },
    { organizationId: ids.organizations[0], folderId: folderIds[1], name: 'Color Palette', url: '/docs/color-palette.md', metadata: { type: 'markdown' } },
    { organizationId: ids.organizations[0], folderId: folderIds[2], name: 'Remote Work Policy', url: '/docs/remote-work-policy.md', metadata: { type: 'markdown' } },
  ];

  for (const doc of documents) {
    const created = await post(SERVICES.knowledge, '/documents', doc);
    ids.documents.push(created.id);
    console.log(`  ✅ Created document: ${doc.name}`);
  }

  // Create Wiki Pages (matching schema: title, content, parentId)
  const wikiPages = [
    { title: 'Getting Started', content: '# Getting Started\n\nWelcome to Acme Corporation! This guide will help you get up to speed.' },
    { title: 'Development Setup', content: '# Development Setup\n\n## Prerequisites\n- Node.js 18+\n- Docker\n- VS Code' },
    { title: 'Deployment Process', content: '# Deployment Process\n\nWe use GitHub Actions for CI/CD...' },
  ];

  const wikiIds: string[] = [];
  for (const wiki of wikiPages) {
    const created = await post(SERVICES.knowledge, '/wiki-pages', wiki);
    wikiIds.push(created.id);
    console.log(`  ✅ Created wiki page: ${wiki.title}`);
  }

  // Create Wiki Page Version (matching schema: wikiPageId, content, version)
  await post(SERVICES.knowledge, '/wiki-page-versions', {
    wikiPageId: wikiIds[1],
    content: '# Development Setup\n\n## Prerequisites\n- Node.js 18+\n- Docker\n- VS Code\n\n## Installation\n1. Clone the repo...',
    version: 2,
  });
  console.log(`  ✅ Created wiki page version`);

  // Create Document Permissions (matching schema: documentId, userId, roleId, permission)
  await post(SERVICES.knowledge, '/document-permissions', {
    documentId: ids.documents[0],
    userId: ids.users[1],
    permission: 'edit',
  });
  console.log(`  ✅ Created document permission`);
}

async function seedCommunicationService() {
  console.log('\n💬 Seeding Communication Service...');

  // Create Chat Channels (matching schema: name, type, teamId, projectId)
  const channels = [
    { name: 'general', type: 'public' },
    { name: 'engineering', type: 'public', teamId: ids.teams[0] },
    { name: 'project-ecommerce', type: 'project', projectId: ids.projects[0] },
  ];

  for (const channel of channels) {
    const created = await post(SERVICES.communication, '/chat-channels', channel);
    ids.channels.push(created.id);
    console.log(`  ✅ Created channel: #${channel.name}`);
  }

  // Create Channel Members (matching schema: channelId, userId, role)
  for (const channelId of ids.channels) {
    for (const userId of ids.users.slice(0, 4)) {
      await post(SERVICES.communication, '/channel-members', { channelId, userId, role: 'member' });
    }
  }
  console.log(`  ✅ Added members to channels`);

  // Create Chat Messages (matching schema: channelId, senderId, content, aiFlags)
  const messages = [
    { channelId: ids.channels[0], senderId: ids.users[0], content: 'Welcome everyone to our new communication platform! 🎉' },
    { channelId: ids.channels[0], senderId: ids.users[1], content: 'Thanks John! Excited to be here.' },
    { channelId: ids.channels[0], senderId: ids.users[3], content: 'The new design looks great!' },
    { channelId: ids.channels[1], senderId: ids.users[1], content: 'Has anyone looked at the new TypeScript 5.3 features?' },
    { channelId: ids.channels[1], senderId: ids.users[0], content: 'Yes! The import attributes are really useful.' },
    { channelId: ids.channels[2], senderId: ids.users[0], content: 'Sprint planning meeting tomorrow at 10 AM. @Jane please prepare the backlog.' },
    { channelId: ids.channels[2], senderId: ids.users[1], content: 'Will do! I\'ll have the priorities ready.' },
  ];

  const messageIds: string[] = [];
  for (const message of messages) {
    const created = await post(SERVICES.communication, '/chat-messages', message);
    messageIds.push(created.id);
    console.log(`  ✅ Created message`);
  }

  // Create Message Mentions (matching schema: messageId, userId)
  await post(SERVICES.communication, '/message-mentions', {
    messageId: messageIds[5],
    userId: ids.users[1],
  });
  console.log(`  ✅ Created message mention`);

  // Create Communication Log (matching schema: type, details)
  await post(SERVICES.communication, '/communication-logs', {
    type: 'email',
    details: {
      from: 'noreply@acme.com',
      to: 'john.admin@acme.com',
      subject: 'Weekly Report',
      status: 'sent',
    },
  });
  console.log(`  ✅ Created communication log`);
}

async function seedMonitoringService() {
  console.log('\n📊 Seeding Monitoring & Reporting Service...');

  // Create KPI Definitions (matching schema: name, formula)
  const kpis = [
    { name: 'Sprint Velocity', formula: 'SUM(story_points) WHERE sprint=current' },
    { name: 'Bug Resolution Time', formula: 'AVG(resolved_at - created_at) WHERE type=bug' },
    { name: 'Customer Satisfaction', formula: 'AVG(rating) FROM feedback' },
  ];

  const kpiIds: string[] = [];
  for (const kpi of kpis) {
    const created = await post(SERVICES.monitoring, '/kpi-definitions', kpi);
    kpiIds.push(created.id);
    console.log(`  ✅ Created KPI: ${kpi.name}`);
  }

  // Create KPI Measurements (matching schema: kpiId, value, measuredAt)
  const measurements = [
    { kpiId: kpiIds[0], value: 48, measuredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
    { kpiId: kpiIds[0], value: 52, measuredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
    { kpiId: kpiIds[0], value: 55, measuredAt: new Date().toISOString() },
    { kpiId: kpiIds[1], value: 18, measuredAt: new Date().toISOString() },
    { kpiId: kpiIds[2], value: 85, measuredAt: new Date().toISOString() },
  ];

  for (const measurement of measurements) {
    await post(SERVICES.monitoring, '/kpi-measurements', measurement);
  }
  console.log(`  ✅ Created KPI measurements`);

  // Create Report Templates (matching schema: name, config)
  const templates = [
    { name: 'Weekly Status Report', config: { sections: ['progress', 'blockers'], format: 'markdown' } },
    { name: 'Sprint Retrospective', config: { sections: ['positives', 'improvements'], format: 'markdown' } },
  ];

  const templateIds: string[] = [];
  for (const template of templates) {
    const created = await post(SERVICES.monitoring, '/report-templates', template);
    templateIds.push(created.id);
    console.log(`  ✅ Created report template: ${template.name}`);
  }

  // Create Generated Report (matching schema: templateId, url, format)
  await post(SERVICES.monitoring, '/generated-reports', {
    templateId: templateIds[0],
    url: '/reports/weekly-status-2024-01.pdf',
    format: 'pdf',
  });
  console.log(`  ✅ Created generated report`);

  // Create Member Performance (matching schema: userId, metric, value, period)
  await post(SERVICES.monitoring, '/member-performance', {
    userId: ids.users[1],
    metric: 'tasks_completed',
    value: 8,
    period: 'week',
  });
  console.log(`  ✅ Created member performance record`);

  // Create AI Conversation (matching schema: userId, context, tokensUsed)
  await post(SERVICES.monitoring, '/ai-conversations', {
    userId: ids.users[0],
    context: {
      projectId: ids.projects[0],
      messages: [
        { role: 'user', content: 'What is the status of the E-Commerce project?' },
        { role: 'assistant', content: 'The E-Commerce Platform project is currently in progress with 65% completion.' },
      ],
    },
    tokensUsed: 150,
  });
  console.log(`  ✅ Created AI conversation`);

  // Create Automation Rules (matching schema: name, trigger, actions, isActive)
  const rules = [
    { name: 'Auto-assign reviewer', trigger: { event: 'pr_opened', conditions: { branch: 'main' } }, actions: { assign: 'team_lead' }, isActive: true },
    { name: 'Notify on blocker', trigger: { event: 'task_blocked' }, actions: { notify: ['manager', 'team_lead'] }, isActive: true },
  ];

  const ruleIds: string[] = [];
  for (const rule of rules) {
    const created = await post(SERVICES.monitoring, '/automation-rules', rule);
    ruleIds.push(created.id);
    console.log(`  ✅ Created automation rule: ${rule.name}`);
  }

  // Create Automation Log (matching schema: ruleId, status, details)
  await post(SERVICES.monitoring, '/automation-logs', {
    ruleId: ruleIds[0],
    status: 'success',
    details: { prNumber: 42, assignedTo: ids.users[0] },
  });
  console.log(`  ✅ Created automation log`);

  // Create Dashboard (matching schema: userId, name, layout)
  const dashboard = await post(SERVICES.monitoring, '/dashboards', {
    userId: ids.users[0],
    name: 'Project Overview',
    layout: { columns: 12, rows: 8 },
  });
  console.log(`  ✅ Created dashboard`);

  // Create Dashboard Widgets (matching schema: dashboardId, type, config)
  const widgets = [
    { dashboardId: dashboard.id, type: 'chart', config: { title: 'Sprint Velocity', chartType: 'line', kpiId: kpiIds[0] } },
    { dashboardId: dashboard.id, type: 'metric', config: { title: 'Tasks Completed', source: 'tasks', filter: 'completed' } },
    { dashboardId: dashboard.id, type: 'list', config: { title: 'Recent Activity', source: 'activity_logs', limit: 10 } },
  ];

  for (const widget of widgets) {
    await post(SERVICES.monitoring, '/dashboard-widgets', widget);
    console.log(`  ✅ Created widget: ${widget.config.title}`);
  }
}

async function seedNotificationService() {
  console.log('\n🔔 Seeding Notification Service...');

  // Create Notification Templates (matching schema: name, content, channels as Json)
  const templates = [
    { name: 'Task Assigned', content: 'You have been assigned to task: {{taskTitle}}', channels: { types: ['email', 'push', 'in_app'] } },
    { name: 'Mention', content: '{{mentionedBy}} mentioned you in {{context}}', channels: { types: ['push', 'in_app'] } },
    { name: 'Project Update', content: 'Project {{projectName}} has been updated: {{updateSummary}}', channels: { types: ['email', 'in_app'] } },
    { name: 'Deadline Reminder', content: 'Task "{{taskTitle}}" is due in {{timeRemaining}}', channels: { types: ['email', 'push', 'in_app'] } },
  ];

  for (const template of templates) {
    await post(SERVICES.notification, '/notification-templates', template);
    console.log(`  ✅ Created notification template: ${template.name}`);
  }

  // Create Notification Preferences
  for (const userId of ids.users.slice(0, 3)) {
    await post(SERVICES.notification, '/notification-preferences', {
      userId,
      preferences: {
        email: { enabled: true, frequency: 'immediate' },
        push: { enabled: true },
        inApp: { enabled: true },
        digest: { enabled: false, time: '09:00' },
      },
    });
  }
  console.log(`  ✅ Created notification preferences`);

  // Create Notifications
  const notifications = [
    { userId: ids.users[1], content: 'You have been assigned to task: Implement authentication', type: 'task_assigned', isRead: true },
    { userId: ids.users[1], content: 'John mentioned you in #project-ecommerce', type: 'mention', isRead: true },
    { userId: ids.users[1], content: 'Task "Implement product catalog" is due in 2 days', type: 'deadline', isRead: false },
    { userId: ids.users[0], content: 'New client feedback received on E-Commerce Platform', type: 'feedback', isRead: false },
    { userId: ids.users[3], content: 'You have been added to project: Mobile App Redesign', type: 'project_added', isRead: false },
  ];

  for (const notification of notifications) {
    await post(SERVICES.notification, '/notifications', notification);
    console.log(`  ✅ Created notification for user`);
  }
}

async function main() {
  console.log('🚀 Starting database seeding...\n');
  console.log('Make sure all microservices are running:');
  console.log('  - Auth Service (3001)');
  console.log('  - Workforce Service (3002)');
  console.log('  - Project Service (3003)');
  console.log('  - Client Service (3004)');
  console.log('  - Knowledge Hub (3005)');
  console.log('  - Communication (3006)');
  console.log('  - Monitoring (3007)');
  console.log('  - Notification (3008)');
  console.log('\nWaiting 2 seconds before starting...\n');

  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    await seedAuthService();
    await seedWorkforceService();
    await seedProjectService();
    await seedClientService();
    await seedKnowledgeService();
    await seedCommunicationService();
    await seedMonitoringService();
    await seedNotificationService();

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Organizations: ${ids.organizations.length}`);
    console.log(`  - Users: ${ids.users.length}`);
    console.log(`  - Roles: ${ids.roles.length}`);
    console.log(`  - Teams: ${ids.teams.length}`);
    console.log(`  - Projects: ${ids.projects.length}`);
    console.log(`  - Tasks: ${ids.tasks.length}`);
    console.log(`  - Clients: ${ids.clients.length}`);
    console.log(`  - Channels: ${ids.channels.length}`);
    console.log(`  - Documents: ${ids.documents.length}`);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
