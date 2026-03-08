import axios from 'axios';
import * as crypto from 'crypto';

// 🔑 Login Credentials (password: Password123!)
// Admin: sarah.admin@vistone.io
// Organizer: omar.organizer@vistone.io
// Managers: emily.manager@vistone.io / james.manager@vistone.io
// Contributors: aisha.dev@vistone.io, lucas.dev@vistone.io, sofia.design@vistone.io, raj.dev@vistone.io, mei.qa@vistone.io, david.content@vistone.io

// ─── Service URLs ───────────────────────────────────────────────────────────────
const SVC = {
  auth: 'http://localhost:3001',
  workforce: 'http://localhost:3002',
  project: 'http://localhost:3003',
  client: 'http://localhost:3004',
  knowledge: 'http://localhost:3005',
  communication: 'http://localhost:3006',
  monitoring: 'http://localhost:3007',
  notification: 'http://localhost:3008',
};

// ─── ID Store ───────────────────────────────────────────────────────────────────
const id = {
  org: '',
  roles: { organizer: '', manager: '', contributor: '' },
  users: [] as string[],
  teams: [] as string[],
  projects: [] as string[],
  tasks: [] as string[],
  clients: [] as string[],
  channels: [] as string[],
  documents: [] as string[],
  folders: [] as string[],
  wikis: [] as string[],
  kpis: [] as string[],
  templates: [] as string[],
  rules: [] as string[],
  dashboards: [] as string[],
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
async function post(base: string, path: string, data: any) {
  try {
    const res = await axios.post(`${base}${path}`, data);
    return res.data;
  } catch (err: any) {
    if (err.response?.data) {
      console.error(`  ❌ POST ${path}:`, JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(`  ❌ POST ${path}:`, err.message);
    }
    throw err;
  }
}

function daysFromNow(n: number) {
  return new Date(Date.now() + n * 86400000).toISOString();
}

const runSuffix = Math.floor(Date.now() / 1000).toString();

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

// ─── 1. AUTH SERVICE ────────────────────────────────────────────────────────────
async function seedAuth() {
  console.log('\n📦 Seeding Auth Service...');
  const pwd = crypto.createHash('sha256').update('Password123!').digest('hex');

  // Organization
  const org = await post(SVC.auth, '/organizations', {
    name: `Vistone Digital ${runSuffix}`,
    slug: `vistone-digital-${runSuffix}`,
    settings: { timezone: 'UTC', language: 'en', theme: 'dark' },
  });
  id.org = org.id;
  console.log(`  ✅ Organization: ${org.name}`);

  // Roles
  const roleDefs = [
    {
      key: 'organizer', name: 'Organizer', isSystem: true,
      permissions: {
        users: ['create', 'read', 'update', 'delete', 'invite'],
        teams: ['create', 'read', 'update', 'delete'],
        projects: ['create', 'read', 'update', 'delete'],
        tasks: ['create', 'read', 'update', 'delete', 'assign'],
        clients: ['create', 'read', 'update', 'delete'],
        wiki: ['create', 'read', 'update', 'delete'],
        channels: ['create', 'read', 'update', 'delete'],
        settings: ['read', 'update'],
        reports: ['read', 'export'],
        notifications: ['read', 'update'],
      },
    },
    {
      key: 'manager', name: 'Manager',
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
      },
    },
    {
      key: 'contributor', name: 'Contributor',
      permissions: {
        users: ['read'],
        teams: ['read'],
        projects: ['read'],
        tasks: ['read', 'update'],
        clients: [],
        wiki: ['read'],
        channels: ['read', 'update'],
        settings: [],
        reports: ['read'],
        notifications: ['read', 'update'],
      },
    },
  ];

  for (const r of roleDefs) {
    const created = await post(SVC.auth, '/roles', {
      organizationId: id.org, name: r.name, permissions: r.permissions, isSystem: r.isSystem ?? false,
    });
    id.roles[r.key as keyof typeof id.roles] = created.id;
    console.log(`  ✅ Role: ${r.name}`);
  }

  // Users — 10 people
  const userDefs = [
    { email: `sarah.organizer1.${runSuffix}@vistone.io`, firstName: 'Sarah', lastName: 'Chen', role: 'organizer' },
    { email: `omar.organizer2.${runSuffix}@vistone.io`, firstName: 'Omar', lastName: 'Khalid', role: 'organizer' },
    { email: `emily.manager.${runSuffix}@vistone.io`, firstName: 'Emily', lastName: 'Rodriguez', role: 'manager' },
    { email: `james.manager.${runSuffix}@vistone.io`, firstName: 'James', lastName: 'Park', role: 'manager' },
    { email: `aisha.dev.${runSuffix}@vistone.io`, firstName: 'Aisha', lastName: 'Patel', role: 'contributor' },
    { email: `lucas.dev.${runSuffix}@vistone.io`, firstName: 'Lucas', lastName: 'Müller', role: 'contributor' },
    { email: `sofia.design.${runSuffix}@vistone.io`, firstName: 'Sofia', lastName: 'Andersson', role: 'contributor' },
    { email: `raj.dev.${runSuffix}@vistone.io`, firstName: 'Raj', lastName: 'Sharma', role: 'contributor' },
    { email: `mei.qa.${runSuffix}@vistone.io`, firstName: 'Mei', lastName: 'Lin', role: 'contributor' },
    { email: `david.content.${runSuffix}@vistone.io`, firstName: 'David', lastName: 'Okonkwo', role: 'contributor' },
  ];

  for (const u of userDefs) {
    const created = await post(SVC.auth, '/users', { email: u.email, firstName: u.firstName, lastName: u.lastName, password: pwd });
    id.users.push(created.id);
    await post(SVC.auth, '/organization-members', {
      organizationId: id.org, userId: created.id, roleId: id.roles[u.role as keyof typeof id.roles],
    });
    console.log(`  ✅ User: ${u.firstName} ${u.lastName} (${u.role})`);
  }

  // KYC for first organizer
  await post(SVC.auth, '/kyc-data', {
    userId: id.users[0], status: 'verified',
    documents: { passport: 'verified', address: 'verified', businessLicense: 'verified' },
    verifiedAt: new Date().toISOString(),
  });

  // MFA for organizers
  for (const idx of [0, 1]) {
    await post(SVC.auth, '/mfa-settings', {
      userId: id.users[idx], enabled: true,
      secret: 'JBSWY3DPEHPK3PXP', backupCodes: ['ABCD1234', 'EFGH5678', 'IJKL9012'],
    });
  }

  // Activity logs
  const actions = ['LOGIN', 'CREATE_PROJECT', 'UPDATE_TASK', 'INVITE_MEMBER', 'VIEW_REPORT'];
  for (let i = 0; i < 8; i++) {
    await post(SVC.auth, '/activity-logs', {
      userId: id.users[i % id.users.length],
      action: actions[i % actions.length],
      entityType: 'user', entityId: id.users[0],
      metadata: { browser: 'Chrome', os: 'Windows' },
      ipAddress: `192.168.1.${10 + i}`, userAgent: 'Mozilla/5.0',
    });
  }
  console.log(`  ✅ Activity logs (8)`);
}

// ─── 2. WORKFORCE SERVICE ───────────────────────────────────────────────────────
async function seedWorkforce() {
  console.log('\n👥 Seeding Workforce Service...');

  const teamDefs = [
    { name: 'Engineering', description: 'Full-stack development team', managerId: id.users[2] },
    { name: 'Design', description: 'UI/UX and graphic design', managerId: id.users[3] },
    { name: 'Quality Assurance', description: 'Testing and quality team', managerId: id.users[2] },
    { name: 'Content & Marketing', description: 'Content creation and marketing', managerId: id.users[3] },
  ];

  for (const t of teamDefs) {
    const created = await post(SVC.workforce, '/teams', { ...t, organizationId: id.org });
    id.teams.push(created.id);
    console.log(`  ✅ Team: ${t.name}`);
  }

  // Team Members: Engineering=[Aisha,Lucas,Raj], Design=[Sofia], QA=[Mei], Content=[David]
  const memberships = [
    [0, 4, 'Senior Developer'], [0, 5, 'Developer'], [0, 7, 'Developer'],
    [1, 6, 'Lead Designer'],
    [2, 8, 'QA Engineer'],
    [3, 9, 'Content Writer'],
    [0, 2, 'Manager'], [1, 3, 'Manager'],
  ];
  for (const [ti, ui, role] of memberships) {
    await post(SVC.workforce, '/team-members', { teamId: id.teams[ti as number], userId: id.users[ui as number], role });
  }
  console.log('  ✅ Team members assigned');

  // Skills
  const skillDefs = [
    [4, 'TypeScript', 9], [4, 'React', 9], [4, 'Node.js', 8], [4, 'PostgreSQL', 7],
    [5, 'TypeScript', 8], [5, 'Next.js', 8], [5, 'GraphQL', 7],
    [6, 'Figma', 10], [6, 'UI Design', 9], [6, 'CSS', 8], [6, 'Prototyping', 9],
    [7, 'Python', 9], [7, 'FastAPI', 8], [7, 'Docker', 7], [7, 'AWS', 6],
    [8, 'Test Automation', 9], [8, 'Cypress', 8], [8, 'Jest', 8],
    [9, 'Technical Writing', 9], [9, 'SEO', 7], [9, 'Markdown', 8],
  ];
  for (const [ui, name, prof] of skillDefs) {
    await post(SVC.workforce, '/user-skills', { userId: id.users[ui as number], skillName: name, proficiency: prof });
  }
  console.log(`  ✅ Skills (${skillDefs.length})`);

  // Availability (next 10 days for devs)
  for (const ui of [4, 5, 7]) {
    for (let d = 0; d < 10; d++) {
      await post(SVC.workforce, '/user-availability', {
        userId: id.users[ui], date: daysFromNow(d), hoursAvailable: d % 7 < 5 ? 8 : 0,
      });
    }
  }
  console.log('  ✅ Availability records');
}

// ─── 3. PROJECT SERVICE ─────────────────────────────────────────────────────────
async function seedProjects() {
  console.log('\n📋 Seeding Project Service...');

  const projDefs = [
    { name: 'E-Commerce Platform v2', description: 'Next-gen e-commerce with AI recommendations', status: 'Active', startDate: daysAgo(30), endDate: daysFromNow(60), budget: 180000, spentBudget: 45000, progress: 35, managerId: id.users[2], teamIds: [id.teams[0]], clientId: null },
    { name: 'Mobile App Redesign', description: 'Complete UI/UX overhaul of the mobile application', status: 'Active', startDate: daysAgo(14), endDate: daysFromNow(45), budget: 65000, spentBudget: 12000, progress: 20, managerId: id.users[3], teamIds: [id.teams[1]], clientId: null },
    { name: 'API Gateway Migration', description: 'Migrate monolith REST API to GraphQL microservices', status: 'Active', startDate: daysAgo(60), endDate: daysFromNow(30), budget: 95000, spentBudget: 62000, progress: 65, managerId: id.users[2], teamIds: [id.teams[0]], clientId: null },
    { name: 'Healthcare Portal', description: 'Patient management portal with telemedicine features', status: 'Planning', startDate: daysFromNow(14), endDate: daysFromNow(120), budget: 220000, progress: 5, managerId: id.users[2], teamIds: [id.teams[0], id.teams[1]], clientId: null },
    { name: 'Internal Documentation Hub', description: 'Centralized knowledge base for the organization', status: 'Completed', startDate: daysAgo(90), endDate: daysAgo(10), budget: 25000, spentBudget: 23000, progress: 100, managerId: id.users[3], teamIds: [id.teams[3]], clientId: null },
  ];

  for (const p of projDefs) {
    const created = await post(SVC.project, '/projects', { ...p, organizationId: id.org, metadata: { type: 'development', visibility: 'private' } });
    id.projects.push(created.id);
    console.log(`  ✅ Project: ${p.name}`);
  }

  // Project members
  const pmDefs = [
    [0, 2, 'Manager'], [0, 4, 'Lead Developer'], [0, 5, 'Developer'], [0, 6, 'Designer'], [0, 8, 'QA'],
    [1, 3, 'Manager'], [1, 6, 'Lead Designer'], [1, 5, 'Frontend Dev'],
    [2, 2, 'Manager'], [2, 4, 'Tech Lead'], [2, 7, 'Backend Dev'], [2, 8, 'QA'],
    [3, 2, 'Manager'], [3, 4, 'Developer'], [3, 7, 'Developer'], [3, 6, 'Designer'],
    [4, 3, 'Manager'], [4, 9, 'Content Lead'],
  ];
  for (const [pi, ui, role] of pmDefs) {
    await post(SVC.project, '/project-members', { projectId: id.projects[pi as number], userId: id.users[ui as number], role });
  }
  console.log('  ✅ Project members');

  // Tasks — rich set across projects
  const taskDefs = [
    // Project 0: E-Commerce
    { projectId: 0, assigneeId: 4, creatorId: 2, title: 'Setup Next.js project scaffold', status: 'Done', priority: 'high', dueDate: daysAgo(25) },
    { projectId: 0, assigneeId: 4, creatorId: 2, title: 'Implement user authentication flow', status: 'Done', priority: 'high', dueDate: daysAgo(18) },
    { projectId: 0, assigneeId: 5, creatorId: 2, title: 'Build product listing page', status: 'In Progress', priority: 'high', dueDate: daysFromNow(7) },
    { projectId: 0, assigneeId: 6, creatorId: 3, title: 'Design product detail page UI', status: 'In Progress', priority: 'medium', dueDate: daysFromNow(5) },
    { projectId: 0, assigneeId: 5, creatorId: 2, title: 'Shopping cart & checkout flow', status: 'To Do', priority: 'high', dueDate: daysFromNow(21) },
    { projectId: 0, assigneeId: 4, creatorId: 2, title: 'Payment gateway integration (Stripe)', status: 'To Do', priority: 'high', dueDate: daysFromNow(28) },
    { projectId: 0, assigneeId: 8, creatorId: 2, title: 'Write E2E tests for checkout', status: 'To Do', priority: 'medium', dueDate: daysFromNow(35) },
    { projectId: 0, assigneeId: 4, creatorId: 2, title: 'AI recommendation engine integration', status: 'To Do', priority: 'low', dueDate: daysFromNow(45) },
    // Project 1: Mobile Redesign
    { projectId: 1, assigneeId: 6, creatorId: 3, title: 'User research & persona mapping', status: 'Done', priority: 'high', dueDate: daysAgo(7) },
    { projectId: 1, assigneeId: 6, creatorId: 3, title: 'Wireframe main navigation', status: 'In Progress', priority: 'high', dueDate: daysFromNow(3) },
    { projectId: 1, assigneeId: 6, creatorId: 3, title: 'High-fidelity mockups — Home', status: 'To Do', priority: 'high', dueDate: daysFromNow(14) },
    { projectId: 1, assigneeId: 5, creatorId: 3, title: 'Implement new design system in React Native', status: 'To Do', priority: 'medium', dueDate: daysFromNow(28) },
    // Project 2: API Migration
    { projectId: 2, assigneeId: 4, creatorId: 2, title: 'Document existing REST endpoints', status: 'Done', priority: 'high', dueDate: daysAgo(45) },
    { projectId: 2, assigneeId: 7, creatorId: 2, title: 'Setup GraphQL gateway', status: 'Done', priority: 'high', dueDate: daysAgo(35) },
    { projectId: 2, assigneeId: 4, creatorId: 2, title: 'Migrate auth endpoints', status: 'Done', priority: 'high', dueDate: daysAgo(20) },
    { projectId: 2, assigneeId: 7, creatorId: 2, title: 'Migrate project endpoints', status: 'In Progress', priority: 'high', dueDate: daysFromNow(7) },
    { projectId: 2, assigneeId: 4, creatorId: 2, title: 'Migrate client endpoints', status: 'To Do', priority: 'medium', dueDate: daysFromNow(14) },
    { projectId: 2, assigneeId: 8, creatorId: 2, title: 'Integration test suite', status: 'In Progress', priority: 'medium', dueDate: daysFromNow(21) },
    // Project 3: Healthcare
    { projectId: 3, assigneeId: 4, creatorId: 2, title: 'Requirements gathering', status: 'In Progress', priority: 'high', dueDate: daysFromNow(10) },
    { projectId: 3, assigneeId: 6, creatorId: 3, title: 'UX research for patient portal', status: 'To Do', priority: 'high', dueDate: daysFromNow(21) },
  ];

  for (const t of taskDefs) {
    const created = await post(SVC.project, '/tasks', {
      projectId: id.projects[t.projectId],
      assigneeId: id.users[t.assigneeId],
      creatorId: id.users[t.creatorId],
      title: t.title, status: t.status, priority: t.priority,
      dueDate: t.dueDate, description: `Task: ${t.title}`,
    });
    id.tasks.push(created.id);
  }
  console.log(`  ✅ Tasks (${taskDefs.length})`);

  // Checklists for a few tasks
  const checklists = [
    [2, 'Create product card component', true], [2, 'Implement pagination', false], [2, 'Add search filters', false],
    [5, 'Setup Stripe SDK', false], [5, 'Implement payment intent', false], [5, 'Handle webhooks', false],
  ];
  for (const [ti, item, done] of checklists) {
    await post(SVC.project, '/task-checklists', { taskId: id.tasks[ti as number], item, isCompleted: done });
  }
  console.log('  ✅ Task checklists');

  // Dependencies
  await post(SVC.project, '/task-dependencies', { taskId: id.tasks[4], dependsOnId: id.tasks[2], type: 'finish_to_start' });
  await post(SVC.project, '/task-dependencies', { taskId: id.tasks[5], dependsOnId: id.tasks[4], type: 'finish_to_start' });
  await post(SVC.project, '/task-dependencies', { taskId: id.tasks[6], dependsOnId: id.tasks[5], type: 'finish_to_start' });
  console.log('  ✅ Task dependencies');

  // Milestones
  const msDefs = [
    [0, 'MVP Launch', 'Core features ready for demo', 30, 'In Progress'],
    [0, 'Beta Release', 'Feature-complete with payment', 50, 'Planned'],
    [0, 'Production Go-Live', 'Public launch', 60, 'Planned'],
    [1, 'Design Approval', 'All mockups approved by client', 14, 'In Progress'],
    [1, 'Dev Handoff', 'Design specs ready for dev', 30, 'Planned'],
    [2, 'Auth Migration Complete', 'All auth endpoints migrated', -5, 'Completed'],
    [2, 'Full Migration Complete', 'All services migrated', 21, 'In Progress'],
    [3, 'Requirements Sign-Off', 'Requirements doc approved', 21, 'Planned'],
  ];
  for (const [pi, title, desc, dayOffset, status] of msDefs) {
    await post(SVC.project, '/milestones', {
      projectId: id.projects[pi as number], title, description: desc,
      dueDate: daysFromNow(dayOffset as number), status,
      completed: status === 'Completed', completedAt: status === 'Completed' ? daysAgo(5) : null,
    });
  }
  console.log(`  ✅ Milestones (${msDefs.length})`);

  // Risk Register
  const risks = [
    [0, 'Stripe API rate limits during peak sales', 'medium', 'high', 'Implement request queuing and caching', 'open'],
    [0, 'Delayed design approvals from client', 'high', 'medium', 'Set weekly review cadence', 'mitigated'],
    [2, 'Data loss during migration', 'low', 'critical', 'Run dual-write for 2 weeks before cutover', 'open'],
    [3, 'HIPAA compliance requirements unclear', 'medium', 'high', 'Engage compliance consultant early', 'open'],
  ];
  for (const [pi, desc, prob, imp, plan, status] of risks) {
    await post(SVC.project, '/risk-register', {
      projectId: id.projects[pi as number], description: desc,
      probability: prob, impact: imp, mitigationPlan: plan, status,
    });
  }
  console.log('  ✅ Risk register');

  // AI Insights
  const insights = [
    [0, null, 'Based on current velocity (12 pts/sprint), MVP deadline is achievable with 85% confidence. Consider parallelizing checkout and payment tasks.', 0.85],
    [null, 2, 'This task has taken 3x longer than similar tasks. Consider pair programming or breaking into subtasks.', 0.72],
    [2, null, 'Migration is 65% complete. Projected completion is 5 days ahead of schedule if current pace holds.', 0.90],
  ];
  for (const [pi, ti, content, conf] of insights) {
    await post(SVC.project, '/ai-insights', {
      projectId: pi !== null ? id.projects[pi as number] : null,
      taskId: ti !== null ? id.tasks[ti as number] : null,
      content, confidence: conf, actionable: true,
    });
  }
  console.log('  ✅ AI insights');
}

// ─── 4. CLIENT SERVICE ──────────────────────────────────────────────────────────
async function seedClients() {
  console.log('\n🏢 Seeding Client Service...');

  const clientDefs = [
    { name: 'RetailMax Inc', email: 'contact@retailmax.com', company: 'RetailMax Inc', phone: '+1-555-0100', industry: 'Retail', status: 'active', portalAccess: true, address: '123 Commerce St, NYC' },
    { name: 'MediCare Solutions', email: 'info@medicare-solutions.com', company: 'MediCare Solutions', phone: '+1-555-0200', industry: 'Healthcare', status: 'active', portalAccess: true },
    { name: 'FoodChain Global', email: 'hello@foodchain.io', company: 'FoodChain Global', phone: '+1-555-0300', industry: 'Food & Beverage', status: 'active', portalAccess: false },
    { name: 'EduTech Labs', email: 'partnerships@edutech.com', company: 'EduTech Labs', phone: '+1-555-0400', industry: 'Education', status: 'prospect', portalAccess: false },
  ];

  for (const c of clientDefs) {
    const created = await post(SVC.client, '/clients', { ...c, organizationId: id.org, contactPersonId: id.users[0] });
    id.clients.push(created.id);
    console.log(`  ✅ Client: ${c.name}`);
  }

  // Link clients to projects
  await post(SVC.client, '/project-clients', { projectId: id.projects[0], clientId: id.clients[0] });
  await post(SVC.client, '/project-clients', { projectId: id.projects[3], clientId: id.clients[1] });
  await post(SVC.client, '/project-clients', { projectId: id.projects[1], clientId: id.clients[2] });
  console.log('  ✅ Project-client links');

  // Feedback
  const fbDefs = [
    [0, 0, 5, 'Excellent progress! The team is very responsive.', 'Thank you for the kind words!'],
    [0, 0, 4, 'Design looks great, minor tweaks needed on mobile.', 'We\'ll address mobile issues this sprint.'],
    [1, 3, 5, 'Very thorough requirements gathering process.', null],
    [2, null, 3, 'Would like more frequent status updates.', 'We\'ll switch to bi-weekly updates.'],
  ];
  for (const [ci, pi, rating, comment, response] of fbDefs) {
    await post(SVC.client, '/client-feedback', {
      clientId: id.clients[ci as number],
      projectId: pi !== null ? id.projects[pi as number] : null,
      rating, comment, response,
    });
  }
  console.log('  ✅ Client feedback');

  // Proposals
  const proposals = [
    { clientId: id.clients[1], title: 'Healthcare Portal — Phase 1', content: 'Patient registration, appointment scheduling, medical records dashboard. Timeline: 4 months. Budget: $220,000.', status: 'accepted' },
    { clientId: id.clients[3], title: 'E-Learning Platform Development', content: 'Interactive course platform with video hosting, quizzes, and progress tracking. Timeline: 6 months. Budget: $180,000.', status: 'pending' },
    { clientId: id.clients[2], title: 'Supply Chain Dashboard', content: 'Real-time inventory tracking and supplier management dashboard. Timeline: 3 months. Budget: $85,000.', status: 'draft' },
  ];
  for (const p of proposals) {
    await post(SVC.client, '/proposals', p);
    console.log(`  ✅ Proposal: ${p.title}`);
  }
}

// ─── 5. KNOWLEDGE HUB ──────────────────────────────────────────────────────────
async function seedKnowledge() {
  console.log('\n📚 Seeding Knowledge Hub...');
  // Knowledge Hub seeding has been removed. 
  // Wikis, Folders and Documents will be created by the user to avoid nonsense seed data.
}

// ─── 6. COMMUNICATION ───────────────────────────────────────────────────────────
async function seedCommunication() {
  console.log('\n💬 Seeding Communication Service...');

  const channelDefs = [
    { name: 'general', type: 'public' },
    { name: 'engineering', type: 'public', teamId: id.teams[0] },
    { name: 'design', type: 'public', teamId: id.teams[1] },
    { name: 'ecommerce-project', type: 'project', projectId: id.projects[0] },
    { name: 'random', type: 'public' },
  ];

  for (const ch of channelDefs) {
    const created = await post(SVC.communication, '/chat-channels', ch);
    id.channels.push(created.id);
    console.log(`  ✅ Channel: #${ch.name}`);
  }

  // Add all users to general & random; relevant users to others
  for (const uid of id.users) {
    await post(SVC.communication, '/channel-members', { channelId: id.channels[0], userId: uid, role: 'member' });
    await post(SVC.communication, '/channel-members', { channelId: id.channels[4], userId: uid, role: 'member' });
  }
  for (const ui of [2, 4, 5, 7]) {
    await post(SVC.communication, '/channel-members', { channelId: id.channels[1], userId: id.users[ui], role: 'member' });
  }
  for (const ui of [3, 6]) {
    await post(SVC.communication, '/channel-members', { channelId: id.channels[2], userId: id.users[ui], role: 'member' });
  }
  for (const ui of [2, 4, 5, 6, 8]) {
    await post(SVC.communication, '/channel-members', { channelId: id.channels[3], userId: id.users[ui], role: 'member' });
  }
  console.log('  ✅ Channel members');

  // Messages
  const msgDefs = [
    [0, 0, 'Welcome to Vistone Digital! 🎉 Excited to have everyone on board.'],
    [0, 1, 'Thanks Sarah! Looking forward to building great things together.'],
    [0, 4, 'Happy to be here! When is our first sprint planning?'],
    [0, 2, 'Sprint planning is tomorrow at 10 AM. See you all there!'],
    [1, 4, 'Has anyone tried the new Prisma 6 features? The typed SQL looks amazing.'],
    [1, 5, 'Yes! The performance improvements are significant too.'],
    [1, 7, 'I benchmarked it — 40% faster queries with the new engine.'],
    [3, 2, 'Sprint 3 starts Monday. @Aisha please update the backlog priorities.'],
    [3, 4, 'On it! I\'ll have everything ready by Friday EOD.'],
    [3, 6, 'The product detail page mockups are ready for review 🎨'],
    [4, 9, 'Anyone up for virtual coffee? ☕'],
    [4, 8, 'Count me in! 3 PM works for me.'],
  ];

  const messageIds: string[] = [];
  for (const [ci, ui, content] of msgDefs) {
    const created = await post(SVC.communication, '/chat-messages', {
      channelId: id.channels[ci as number], senderId: id.users[ui as number], content,
    });
    messageIds.push(created.id);
  }
  console.log(`  ✅ Messages (${msgDefs.length})`);

  // Mentions & attachments
  await post(SVC.communication, '/message-mentions', { messageId: messageIds[7], userId: id.users[4] });
  await post(SVC.communication, '/message-attachments', { messageId: messageIds[9], url: '/uploads/product-detail-v3.fig', fileType: 'figma' });

  // Communication log
  await post(SVC.communication, '/communication-logs', {
    type: 'email', details: { from: 'noreply@vistone.io', to: 'team@vistone.io', subject: 'Sprint 2 Recap', status: 'sent' },
  });
  console.log('  ✅ Mentions, attachments, logs');
}

// ─── 7. MONITORING & REPORTING ──────────────────────────────────────────────────
async function seedMonitoring() {
  console.log('\n📊 Seeding Monitoring Service...');

  // KPIs
  const kpiDefs = [
    { name: 'Sprint Velocity', formula: 'SUM(story_points) WHERE sprint=current' },
    { name: 'Bug Resolution Time (hrs)', formula: 'AVG(resolved_at - created_at) WHERE type=bug' },
    { name: 'Customer Satisfaction Score', formula: 'AVG(rating) FROM client_feedback' },
    { name: 'Code Review Turnaround (hrs)', formula: 'AVG(reviewed_at - submitted_at)' },
  ];
  for (const k of kpiDefs) {
    const created = await post(SVC.monitoring, '/kpi-definitions', k);
    id.kpis.push(created.id);
    console.log(`  ✅ KPI: ${k.name}`);
  }

  // Measurements (trend data)
  const measurementData = [
    [0, [42, 45, 48, 52, 55, 58]], // velocity trending up
    [1, [24, 22, 18, 16, 14, 12]], // bug fix time trending down
    [2, [78, 80, 82, 85, 87, 90]], // satisfaction trending up
    [3, [8, 7, 6, 5, 4, 4]],       // review time trending down
  ];
  for (const [ki, values] of measurementData) {
    for (let w = 0; w < (values as number[]).length; w++) {
      await post(SVC.monitoring, '/kpi-measurements', {
        kpiId: id.kpis[ki as number], value: (values as number[])[w], measuredAt: daysAgo((5 - w) * 7),
      });
    }
  }
  console.log('  ✅ KPI measurements');

  // Report templates
  const tplDefs = [
    { name: 'Weekly Status Report', config: { sections: ['progress', 'blockers', 'next_week'], format: 'pdf' } },
    { name: 'Sprint Retrospective', config: { sections: ['went_well', 'improve', 'action_items'], format: 'pdf' } },
    { name: 'Monthly Executive Summary', config: { sections: ['kpis', 'financials', 'risks'], format: 'pdf' } },
  ];
  for (const t of tplDefs) {
    const created = await post(SVC.monitoring, '/report-templates', t);
    id.templates.push(created.id);
    console.log(`  ✅ Template: ${t.name}`);
  }

  // Generated reports
  for (let w = 0; w < 4; w++) {
    await post(SVC.monitoring, '/generated-reports', {
      templateId: id.templates[0], url: `/reports/weekly-status-week-${w + 1}.pdf`, format: 'pdf',
    });
  }
  console.log('  ✅ Generated reports (4)');

  // Member performance
  for (const [ui, tasks, hours] of [[4, 12, 85], [5, 9, 72], [7, 10, 78], [6, 8, 65], [8, 11, 80]]) {
    await post(SVC.monitoring, '/member-performance', { userId: id.users[ui as number], metric: 'tasks_completed', value: tasks, period: 'month' });
    await post(SVC.monitoring, '/member-performance', { userId: id.users[ui as number], metric: 'hours_logged', value: hours, period: 'month' });
  }
  console.log('  ✅ Member performance');

  // AI conversations
  await post(SVC.monitoring, '/ai-conversations', {
    userId: id.users[0], tokensUsed: 450,
    context: {
      messages: [
        { role: 'user', content: 'What is the status of E-Commerce Platform v2?' },
        { role: 'assistant', content: 'The project is 35% complete with 3 tasks in progress and 4 tasks pending. MVP milestone is on track.' },
      ]
    },
  });
  await post(SVC.monitoring, '/ai-conversations', {
    userId: id.users[2], tokensUsed: 320,
    context: {
      messages: [
        { role: 'user', content: 'Show me the sprint velocity trend' },
        { role: 'assistant', content: 'Sprint velocity has been trending upward: 42 → 45 → 48 → 52 → 55 → 58 points over the last 6 sprints.' },
      ]
    },
  });
  console.log('  ✅ AI conversations');

  // Automation rules
  const ruleDefs = [
    { name: 'Auto-assign code reviewer', trigger: { event: 'pr_opened', conditions: { branch: 'develop' } }, actions: { assign: 'tech_lead', notify: true }, isActive: true },
    { name: 'Escalate overdue tasks', trigger: { event: 'task_overdue', conditions: { daysOverdue: 3 } }, actions: { notify: ['manager', 'organizer'], priority: 'urgent' }, isActive: true },
    { name: 'Weekly digest email', trigger: { event: 'schedule', cron: '0 9 * * 1' }, actions: { sendDigest: true, recipients: 'all_members' }, isActive: true },
  ];
  for (const r of ruleDefs) {
    const created = await post(SVC.monitoring, '/automation-rules', r);
    id.rules.push(created.id);
    console.log(`  ✅ Rule: ${r.name}`);
  }

  // Automation logs
  for (let i = 0; i < 3; i++) {
    await post(SVC.monitoring, '/automation-logs', {
      ruleId: id.rules[i % id.rules.length],
      status: i < 2 ? 'success' : 'failed',
      details: { executedAt: daysAgo(i), affectedItems: 3 - i },
    });
  }
  console.log('  ✅ Automation logs');

  // Dashboards
  for (const [ui, name] of [[0, 'Executive Overview'], [2, 'Engineering Dashboard']]) {
    const dash = await post(SVC.monitoring, '/dashboards', {
      userId: id.users[ui as number], name, layout: { columns: 12, rows: 8 },
    });
    id.dashboards.push(dash.id);
    console.log(`  ✅ Dashboard: ${name}`);
  }

  // Widgets
  const widgetDefs = [
    [0, 'chart', { title: 'Sprint Velocity Trend', chartType: 'line', kpiId: id.kpis[0] }],
    [0, 'metric', { title: 'Active Projects', source: 'projects', filter: 'active' }],
    [0, 'list', { title: 'Recent Activity', source: 'activity_logs', limit: 10 }],
    [0, 'chart', { title: 'Satisfaction Score', chartType: 'gauge', kpiId: id.kpis[2] }],
    [1, 'chart', { title: 'Bug Resolution Time', chartType: 'line', kpiId: id.kpis[1] }],
    [1, 'list', { title: 'Overdue Tasks', source: 'tasks', filter: 'overdue' }],
    [1, 'metric', { title: 'Code Review Time', kpiId: id.kpis[3] }],
  ];
  for (const [di, type, config] of widgetDefs) {
    await post(SVC.monitoring, '/dashboard-widgets', { dashboardId: id.dashboards[di as number], type, config });
  }
  console.log(`  ✅ Dashboard widgets (${widgetDefs.length})`);

  // Report schedules
  await post(SVC.monitoring, '/report-schedules', {
    organizationId: id.org, templateId: id.templates[0], name: 'Weekly Status — Auto',
    cronExpression: '0 9 * * 1', recipients: [`sarah.organizer1.${runSuffix}@vistone.io`, `omar.organizer2.${runSuffix}@vistone.io`],
    format: 'pdf', isActive: true,
  });
  await post(SVC.monitoring, '/report-schedules', {
    organizationId: id.org, templateId: id.templates[2], name: 'Monthly Executive — Auto',
    cronExpression: '0 9 1 * *', recipients: [`sarah.organizer1.${runSuffix}@vistone.io`],
    format: 'pdf', isActive: true,
  });
  console.log('  ✅ Report schedules');
}

// ─── 8. NOTIFICATION SERVICE ────────────────────────────────────────────────────
async function seedNotifications() {
  console.log('\n🔔 Seeding Notification Service...');

  // Templates
  const tplDefs = [
    { name: 'Task Assigned', content: 'You have been assigned to: {{taskTitle}}', channels: { types: ['email', 'push', 'in_app'] } },
    { name: 'Mention', content: '{{user}} mentioned you in {{context}}', channels: { types: ['push', 'in_app'] } },
    { name: 'Project Update', content: 'Project "{{projectName}}" updated: {{summary}}', channels: { types: ['email', 'in_app'] } },
    { name: 'Deadline Reminder', content: '"{{taskTitle}}" is due in {{timeLeft}}', channels: { types: ['email', 'push', 'in_app'] } },
    { name: 'New Feedback', content: 'New feedback from {{clientName}} on {{projectName}}', channels: { types: ['email', 'in_app'] } },
  ];
  for (const t of tplDefs) {
    await post(SVC.notification, '/notification-templates', t);
    console.log(`  ✅ Template: ${t.name}`);
  }

  // Preferences for all users
  for (const uid of id.users) {
    await post(SVC.notification, '/notification-preferences', {
      userId: uid,
      preferences: { email: { enabled: true, frequency: 'immediate' }, push: { enabled: true }, inApp: { enabled: true } },
    });
  }
  console.log('  ✅ Preferences (all users)');

  // Notifications
  const notifDefs = [
    [4, 'You have been assigned to: Build product listing page', 'task_assigned', true],
    [4, 'Emily mentioned you in #ecommerce-project', 'mention', true],
    [5, 'You have been assigned to: Shopping cart & checkout flow', 'task_assigned', false],
    [6, 'New comment on your design mockup', 'comment', false],
    [2, 'New feedback from RetailMax Inc on E-Commerce Platform v2', 'feedback', false],
    [0, 'Sprint 3 retrospective starts in 1 hour', 'reminder', false],
    [4, '"Payment gateway integration" is due in 5 days', 'deadline', false],
    [8, 'You have been added to project: API Gateway Migration', 'project_added', true],
    [7, 'Code review requested on PR #142', 'review_request', false],
    [3, 'Design approval needed for Mobile App Redesign', 'approval', false],
    [0, 'Weekly status report generated successfully', 'report', true],
    [1, 'New member joined: David Okonkwo', 'member_joined', true],
  ];
  for (const [ui, content, type, isRead] of notifDefs) {
    await post(SVC.notification, '/notifications', { userId: id.users[ui as number], content, type, isRead });
  }
  console.log(`  ✅ Notifications (${notifDefs.length})`);
}

// ─── MAIN ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Vistone Digital — Database Seed\n');
  console.log('Ensure all services are running:');
  console.log('  Auth (3001) | Workforce (3002) | Project (3003) | Client (3004)');
  console.log('  Knowledge (3005) | Communication (3006) | Monitoring (3007) | Notification (3008)');
  console.log('\nStarting in 2 seconds...\n');
  await new Promise(r => setTimeout(r, 2000));

  try {
    await seedAuth();
    await seedWorkforce();
    await seedProjects();
    await seedClients();
    await seedKnowledge();
    await seedCommunication();
    await seedMonitoring();
    await seedNotifications();

    console.log('\n' + '═'.repeat(60));
    console.log('✅ SEED COMPLETED SUCCESSFULLY');
    console.log('═'.repeat(60));
    console.log(`\n📊 Summary — Organization: Vistone Digital`);
    console.log(`  Users:       ${id.users.length} (2 organizers, 2 managers, 6 contributors)`);
    console.log(`  Teams:       ${id.teams.length}`);
    console.log(`  Projects:    ${id.projects.length}`);
    console.log(`  Tasks:       ${id.tasks.length}`);
    console.log(`  Clients:     ${id.clients.length}`);
    console.log(`  Channels:    ${id.channels.length}`);
    console.log(`  Documents:   ${id.documents.length}`);
    console.log(`  Wiki Pages:  ${id.wikis.length}`);
    console.log(`  Dashboards:  ${id.dashboards.length}`);
    console.log(`  KPIs:        ${id.kpis.length}`);

    console.log(`\n📧 Login credentials (all use password: Password123!):`);
    console.log(`  Organizers:  sarah.organizer1.${runSuffix}@vistone.io / omar.organizer2.${runSuffix}@vistone.io`);
    console.log(`  Manager:     emily.manager.${runSuffix}@vistone.io / james.manager.${runSuffix}@vistone.io`);
    console.log(`  Contributor: aisha.dev.${runSuffix}@vistone.io / lucas.dev.${runSuffix}@vistone.io / sofia.design.${runSuffix}@vistone.io`);
    console.log(`               raj.dev.${runSuffix}@vistone.io / mei.qa.${runSuffix}@vistone.io / david.content.${runSuffix}@vistone.io`);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
