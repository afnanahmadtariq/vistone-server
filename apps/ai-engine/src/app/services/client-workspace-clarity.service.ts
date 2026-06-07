import { config } from '../config';

export interface ClarityAssessment {
  isClear: boolean;
  questions: string[];
  reason: string;
}

function fallbackHeuristic(message: string): ClarityAssessment {
  const text = message.trim();
  const lower = text.toLowerCase();
  const tooShort = text.length < 24;
  const vagueSignals = [
    'please do it',
    'as discussed',
    'same as before',
    'need this soon',
    'fix it',
    'i need',
    'i want',
    'need a',
    'want a',
  ];
  const isVague = vagueSignals.some((s) => lower.includes(s));

  const deadlineMarkers = [
    'by ',
    'before ',
    'due ',
    'deadline',
    'tomorrow',
    'today',
    'next week',
    'next month',
    'soon',
    'asap',
    'urgent',
  ];
  const hasDeadline = deadlineMarkers.some((m) => lower.includes(m));

  const deliverableMarkers = [
    'website',
    'feature',
    'dashboard',
    'integration',
    'report',
    'document',
    'deployment',
    'deploy',
    'login',
    'performance',
    'cross-browser',
    'api',
    'authentication',
    'page',
    'section',
    'module',
  ];
  const hasDeliverableDetails = deliverableMarkers.some((m) => lower.includes(m));

  // If it's mostly a "desire" without concrete deliverables (or without any deadline/scope hint),
  // we treat it as unclear to avoid generating generic tasks.
  const unclear =
    (tooShort && !hasDeadline && !hasDeliverableDetails) ||
    (isVague && !hasDeliverableDetails) ||
    (!hasDeadline && !hasDeliverableDetails && /\\b(i need|i want|need a|want a|need new|want new)\\b/.test(lower));
  if (!unclear) {
    return { isClear: true, questions: [], reason: 'heuristic_clear' };
  }
  return {
    isClear: false,
    reason: tooShort ? 'heuristic_too_short' : 'heuristic_vague',
    questions: [
      'Could you clarify the exact deliverables you expect from this request?',
      'What is the target deadline or milestone date for this work?',
      'Are there specific constraints, priorities, or acceptance criteria we should follow?',
    ],
  };
}

function normalizeQuestions(questions: unknown): string[] {
  if (!Array.isArray(questions)) return [];
  return questions
    .filter((q): q is string => typeof q === 'string')
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export async function assessClientWorkspaceMessageClarity(params: {
  latestMessage: string;
  messagesSnippet: string;
  wikiSnippet: string;
  projectId: string;
}): Promise<ClarityAssessment> {
  const latest = params.latestMessage.trim();
  if (!latest) {
    return {
      isClear: false,
      reason: 'empty_latest_message',
      questions: ['Could you share the exact requirement you want us to implement?'],
    };
  }

  if (!config.mistral.apiKey) {
    return fallbackHeuristic(latest);
  }

  try {
    const [{ ChatMistralAI }, coreMessages] = await Promise.all([
      import('@langchain/mistralai'),
      import('@langchain/core/messages'),
    ]);
    const { SystemMessage, HumanMessage } = coreMessages;
    const llm = new ChatMistralAI({
      apiKey: config.mistral.apiKey,
      model: config.mistral.chatModel,
      temperature: 0.1,
      maxTokens: 400,
    });

    const prompt = `Evaluate whether the latest client message is clear enough to create tasks/milestones directly.
Return strict JSON only with this shape:
{"isClear": boolean, "reason": string, "questions": string[]}

Rules:
- isClear MUST be false when the message is mostly a desire without concrete deliverables (e.g. "I need a new project") or when it lacks deadline/scope/acceptance criteria.
- If unclear, provide 1-5 precise clarification questions that would let you create concrete tasks/milestones for projectId=${params.projectId}.
- If clear, questions must be [].
- Keep reason short, machine-friendly snake_case.

projectId=${params.projectId}
latestMessage:
${latest}

recentMessages:
${params.messagesSnippet}

wikiContext:
${params.wikiSnippet}`;

    const response = await llm.invoke([
      new SystemMessage('You classify requirement clarity for project automation. Output JSON only.'),
      new HumanMessage(prompt),
    ]);

    const raw = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const maybeJson = raw.match(/\{[\s\S]*\}/)?.[0] || '{}';
    const parsed = JSON.parse(maybeJson) as {
      isClear?: unknown;
      reason?: unknown;
      questions?: unknown;
    };

    const isClear = !!parsed.isClear;
    const questions = normalizeQuestions(parsed.questions);
    const reason = typeof parsed.reason === 'string' && parsed.reason.trim()
      ? parsed.reason.trim()
      : isClear
        ? 'llm_clear'
        : 'llm_unclear';

    if (!isClear && questions.length === 0) {
      return fallbackHeuristic(latest);
    }

    return { isClear, reason, questions };
  } catch {
    return fallbackHeuristic(latest);
  }
}
