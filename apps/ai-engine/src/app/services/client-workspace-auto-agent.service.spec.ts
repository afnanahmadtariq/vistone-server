import type { AuthenticatedUser } from '../types';
import { runClientWorkspaceAutoAgentPipeline } from './client-workspace-auto-agent.service';
import { assessClientWorkspaceMessageClarity } from './client-workspace-clarity.service';
import { communicationClient, knowledgeClient } from './connectors';
import { getOrgAutoAgentSettings } from './org-settings.service';

const mockCommunicationGet = jest.fn();
const mockCommunicationPost = jest.fn();
const mockKnowledgeGet = jest.fn();
const mockProjectGet = jest.fn();

jest.mock('./connectors', () => ({
  communicationClient: jest.fn(() => ({
    get: mockCommunicationGet,
    post: mockCommunicationPost,
  })),
  knowledgeClient: jest.fn(() => ({
    get: mockKnowledgeGet,
  })),
  projectClient: jest.fn(() => ({
    get: mockProjectGet,
  })),
  workforceClient: jest.fn(() => ({
    get: jest.fn(),
  })),
  safeCall: jest.fn(async (fn: () => Promise<{ data: unknown }>) => {
    try {
      const out = await fn();
      return { success: true, data: out.data };
    } catch (error: any) {
      return { success: false, error: error?.message || 'failed' };
    }
  }),
}));

jest.mock('./org-settings.service', () => ({
  getOrgAutoAgentSettings: jest.fn(),
}));

jest.mock('./org-context.service', () => ({
  buildOrganizationOverviewForPrompt: jest.fn(async () => 'org-overview'),
}));

jest.mock('./rag.service', () => ({
  searchSimilar: jest.fn(async () => []),
  buildContext: jest.fn(() => ''),
  extractSources: jest.fn(() => []),
  getConversationHistory: jest.fn(async () => []),
  saveToHistory: jest.fn(async () => undefined),
}));

jest.mock('./client-workspace-clarity.service', () => ({
  assessClientWorkspaceMessageClarity: jest.fn(),
}));

jest.mock('./access-scope.service', () => ({
  presetAiDataScopeForClientWorkspaceChannel: jest.fn(async () => undefined),
}));

jest.mock('../agent/runner.js', () => ({
  isWriteTool: jest.fn(() => true),
  planAgent: jest.fn(async () => ({ description: 'plan', tools: ['create_task'] })),
  runAgent: jest.fn(async () => ({
    success: true,
    response: 'done',
    toolsUsed: ['create_task'],
    iterations: 1,
  })),
}));

const mockCommunicationClient = communicationClient as jest.MockedFunction<typeof communicationClient>;
const mockKnowledgeClient = knowledgeClient as jest.MockedFunction<typeof knowledgeClient>;
const mockGetOrgAutoAgentSettings = getOrgAutoAgentSettings as jest.MockedFunction<
  typeof getOrgAutoAgentSettings
>;
const mockAssessClarity = assessClientWorkspaceMessageClarity as jest.MockedFunction<
  typeof assessClientWorkspaceMessageClarity
>;

const organizer: AuthenticatedUser = {
  id: 'org-user-1',
  name: 'Organizer User',
  firstName: 'Organizer',
  lastName: 'User',
  email: 'organizer@example.com',
  role: 'Organizer',
  status: 'active',
  organizationId: 'org-1',
  organizationName: 'Org',
  permissions: {},
};

describe('runClientWorkspaceAutoAgentPipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCommunicationClient.mockReturnValue({
      get: mockCommunicationGet,
      post: mockCommunicationPost,
    } as any);
    mockKnowledgeClient.mockReturnValue({
      get: mockKnowledgeGet,
    } as any);
    mockProjectGet.mockImplementation((path: string) => {
      const p = String(path);
      if (p.includes('/tasks')) return Promise.resolve({ data: [] });
      if (p.includes('/milestones')) return Promise.resolve({ data: [] });
      if (p.includes('/project-members')) return Promise.resolve({ data: [] });
      return Promise.resolve({
        data: {
          id: 'p1',
          name: 'Test Project',
          description: 'desc',
          status: 'ACTIVE',
          progress: 0,
          startDate: null,
          endDate: null,
          managerId: '',
          teamId: '',
          clientId: '',
        },
      });
    });
    mockGetOrgAutoAgentSettings.mockResolvedValue({
      createTasksFromClientRequirements: true,
      autoMilestonesFromTasks: false,
      autoAssignBySkillsAndLoad: false,
      fullAuto: false,
      skipUserConfirmation: true,
      autoRunOnClientWorkspaceMessage: true,
    });
  });

  it('posts clarification questions and skips writes when message is unclear (auto trigger)', async () => {
    mockCommunicationGet
      .mockResolvedValueOnce({
        data: { type: 'client_workspace', projectId: 'p1', syncWikiId: 'w1', name: 'cw' },
      })
      .mockResolvedValueOnce({
        data: [{ content: 'Need this done quickly' }],
      });
    mockKnowledgeGet.mockResolvedValueOnce({
      data: [{ name: 'brief.pdf' }],
    });
    mockCommunicationPost.mockResolvedValueOnce({
      data: { id: 'posted-message' },
    });

    mockAssessClarity.mockResolvedValue({
      isClear: false,
      reason: 'requirements_ambiguous',
      questions: ['What exact pages should be included?', 'What deadline should we target?'],
    });

    const result = await runClientWorkspaceAutoAgentPipeline(organizer, {
      projectId: 'p1',
      channelId: 'c1',
      organizationId: 'org-1',
      triggerSource: 'auto',
    });

    expect(result.success).toBe(true);
    expect(result.skippedReason).toBe('needs_clarification');
    expect(mockAssessClarity).toHaveBeenCalledTimes(1);
    expect(mockCommunicationPost).toHaveBeenCalledTimes(1);
  });

  it('dedupes repeated unclear clarifications within TTL', async () => {
    mockAssessClarity.mockResolvedValue({
      isClear: false,
      reason: 'requirements_ambiguous',
      questions: ['Please clarify scope'],
    });

    mockCommunicationGet
      .mockResolvedValueOnce({
        data: { type: 'client_workspace', projectId: 'p1', syncWikiId: undefined, name: 'cw' },
      })
      .mockResolvedValueOnce({
        data: [{ content: 'Need improvements' }],
      })
      .mockResolvedValueOnce({
        data: { type: 'client_workspace', projectId: 'p1', syncWikiId: undefined, name: 'cw' },
      })
      .mockResolvedValueOnce({
        data: [{ content: 'Need improvements' }],
      });
    mockCommunicationPost.mockResolvedValue({
      data: { id: 'posted-message' },
    });

    await runClientWorkspaceAutoAgentPipeline(organizer, {
      projectId: 'p1',
      channelId: 'c1',
      organizationId: 'org-1',
      triggerSource: 'auto',
    });
    await runClientWorkspaceAutoAgentPipeline(organizer, {
      projectId: 'p1',
      channelId: 'c1',
      organizationId: 'org-1',
      triggerSource: 'auto',
    });

    expect(mockCommunicationPost).toHaveBeenCalledTimes(1);
  });

  it('continues automation on clear message (auto trigger)', async () => {
    mockCommunicationGet
      .mockResolvedValueOnce({
        data: { type: 'client_workspace', projectId: 'p1', syncWikiId: undefined, name: 'cw' },
      })
      .mockResolvedValueOnce({
        data: [{ content: 'Build three pages with login and dashboard by next Friday.' }],
      });

    mockAssessClarity.mockResolvedValue({
      isClear: true,
      reason: 'clear_requirements',
      questions: [],
    });

    const result = await runClientWorkspaceAutoAgentPipeline(organizer, {
      projectId: 'p1',
      channelId: 'c1',
      organizationId: 'org-1',
      triggerSource: 'auto',
      forceExecute: true,
    });

    expect(result.success).toBe(true);
    expect(result.skippedReason).toBeUndefined();
    expect(result.actionResult?.success).toBe(true);
    expect(mockCommunicationPost).toHaveBeenCalledTimes(1);
  });

  it('does not post confirmation when no create tools were used', async () => {
    const runner = await import('../agent/runner.js');
    (runner.runAgent as jest.Mock).mockResolvedValueOnce({
      success: true,
      response: 'Only analyzed and updated assignment state',
      toolsUsed: ['update_task'],
      iterations: 1,
    });

    mockCommunicationGet
      .mockResolvedValueOnce({
        data: { type: 'client_workspace', projectId: 'p1', syncWikiId: undefined, name: 'cw' },
      })
      .mockResolvedValueOnce({
        data: [{ content: 'Please assign owners based on capacity.' }],
      });

    mockAssessClarity.mockResolvedValue({
      isClear: true,
      reason: 'clear_requirements',
      questions: [],
    });

    const result = await runClientWorkspaceAutoAgentPipeline(organizer, {
      projectId: 'p1',
      channelId: 'c1',
      organizationId: 'org-1',
      triggerSource: 'auto',
      forceExecute: true,
    });

    expect(result.success).toBe(true);
    expect(mockCommunicationPost).toHaveBeenCalledTimes(0);
  });
});
