/**
 * Organization settings JSON: settings.autoAgent
 * Persisted in auth-service Organization.settings (Json).
 */
export interface OrgAutoAgentSettings {
  /** Create tasks from new requirements in the client↔organizer workspace chat (uses linked wiki docs/media). */
  createTasksFromClientRequirements: boolean;
  /** Suggest/create milestones grouped from current or newly created tasks. */
  autoMilestonesFromTasks: boolean;
  /** Assign tasks using member skills vs task type/title and current workload (open tasks per assignee). */
  autoAssignBySkillsAndLoad: boolean;
  /** Run all enabled steps in order: tasks → milestones → assignment. */
  fullAuto: boolean;
  /**
   * When true, automated runs execute tool actions immediately (no dry-run confirmation).
   * Applies to the client-workspace automation pipeline, not the general AI chat UI.
   */
  skipUserConfirmation: boolean;
}

export const DEFAULT_ORG_AUTO_AGENT: OrgAutoAgentSettings = {
  createTasksFromClientRequirements: false,
  autoMilestonesFromTasks: false,
  autoAssignBySkillsAndLoad: false,
  fullAuto: false,
  skipUserConfirmation: false,
};

export function parseOrgAutoAgentSettings(raw: unknown): OrgAutoAgentSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_ORG_AUTO_AGENT };
  }
  const o = raw as Record<string, unknown>;
  return {
    createTasksFromClientRequirements: !!o.createTasksFromClientRequirements,
    autoMilestonesFromTasks: !!o.autoMilestonesFromTasks,
    autoAssignBySkillsAndLoad: !!o.autoAssignBySkillsAndLoad,
    fullAuto: !!o.fullAuto,
    skipUserConfirmation: !!o.skipUserConfirmation,
  };
}

export interface ResolvedAutoAgentPipeline {
  runTasks: boolean;
  runMilestones: boolean;
  runAssign: boolean;
  skipUserConfirmation: boolean;
}

export function resolveAutoAgentPipeline(settings: OrgAutoAgentSettings): ResolvedAutoAgentPipeline {
  const skipUserConfirmation = !!settings.skipUserConfirmation;
  if (settings.fullAuto) {
    return {
      runTasks: true,
      runMilestones: true,
      runAssign: true,
      skipUserConfirmation,
    };
  }
  return {
    runTasks: !!settings.createTasksFromClientRequirements,
    runMilestones: !!settings.autoMilestonesFromTasks,
    runAssign: !!settings.autoAssignBySkillsAndLoad,
    skipUserConfirmation,
  };
}
