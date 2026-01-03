/**
 * Session State Model
 *
 * Continuity layer for cross-device resume.
 * Captures "where was I" for seamless session pickup.
 */

export interface RecentFile {
  path: string;
  last_edit: string;
}

export interface ActiveAgent {
  id: string;
  task: string;
  started: string;
  status: 'pending' | 'working' | 'completed' | 'failed';
}

export interface ActiveContext {
  goal: string;
  branch: string;
  focus: string;

  recent_files: RecentFile[];
  pending_questions: string[];
  pending_tasks: string[];
  active_agents: ActiveAgent[];
}

export interface ParallelContext {
  goal: string;
  project: string;
  status: 'active' | 'paused';
  last_summary: string;
}

export interface SessionState {
  // Schema
  schema_version: 1;

  // When
  last_updated: string;
  last_device: string;
  last_session: string;

  // What was I doing?
  active_context: ActiveContext | null;

  // Quick resume prompt (generated)
  resume_prompt: string;

  // Parallel work streams
  parallel_contexts: ParallelContext[];
}

/**
 * Create an empty session state
 */
export function createEmptySessionState(device: string = 'unknown'): SessionState {
  return {
    schema_version: 1,
    last_updated: new Date().toISOString(),
    last_device: device,
    last_session: '',

    active_context: null,
    resume_prompt: 'No previous session context available.',
    parallel_contexts: [],
  };
}

/**
 * Generate a resume prompt from session state
 */
export function generateResumePrompt(state: SessionState): string {
  if (!state.active_context) {
    return 'No previous session context available. What would you like to work on?';
  }

  const ctx = state.active_context;
  const lines: string[] = [];

  lines.push(`You were working on: **${ctx.focus}**`);
  lines.push('');

  if (ctx.recent_files.length > 0) {
    lines.push('**Recent files:**');
    for (const file of ctx.recent_files.slice(0, 5)) {
      lines.push(`- ${file.path}`);
    }
    lines.push('');
  }

  if (ctx.pending_tasks.length > 0) {
    lines.push('**Next steps:**');
    for (const task of ctx.pending_tasks) {
      lines.push(`- ${task}`);
    }
    lines.push('');
  }

  if (ctx.pending_questions.length > 0) {
    lines.push('**Open questions:**');
    for (const question of ctx.pending_questions) {
      lines.push(`- ${question}`);
    }
    lines.push('');
  }

  if (ctx.active_agents.length > 0) {
    const working = ctx.active_agents.filter((a) => a.status === 'working');
    if (working.length > 0) {
      lines.push('**Active agents:**');
      for (const agent of working) {
        lines.push(`- ${agent.id}: ${agent.task}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Update session state with new context
 */
export function updateSessionState(
  state: SessionState,
  updates: {
    session?: string;
    device?: string;
    goal?: string;
    branch?: string;
    focus?: string;
    files?: RecentFile[];
    questions?: string[];
    tasks?: string[];
    agents?: ActiveAgent[];
  }
): SessionState {
  const now = new Date().toISOString();

  const newContext: ActiveContext = state.active_context
    ? { ...state.active_context }
    : {
        goal: '',
        branch: 'branch_main',
        focus: '',
        recent_files: [],
        pending_questions: [],
        pending_tasks: [],
        active_agents: [],
      };

  if (updates.goal !== undefined) newContext.goal = updates.goal;
  if (updates.branch !== undefined) newContext.branch = updates.branch;
  if (updates.focus !== undefined) newContext.focus = updates.focus;
  if (updates.files !== undefined) newContext.recent_files = updates.files;
  if (updates.questions !== undefined) newContext.pending_questions = updates.questions;
  if (updates.tasks !== undefined) newContext.pending_tasks = updates.tasks;
  if (updates.agents !== undefined) newContext.active_agents = updates.agents;

  const updated: SessionState = {
    ...state,
    last_updated: now,
    last_device: updates.device ?? state.last_device,
    last_session: updates.session ?? state.last_session,
    active_context: newContext,
  };

  updated.resume_prompt = generateResumePrompt(updated);

  return updated;
}

/**
 * Add or update a parallel context
 */
export function addParallelContext(
  state: SessionState,
  context: ParallelContext
): SessionState {
  const existing = state.parallel_contexts.findIndex((c) => c.goal === context.goal);

  const parallel = [...state.parallel_contexts];
  if (existing >= 0) {
    parallel[existing] = context;
  } else {
    parallel.push(context);
  }

  return {
    ...state,
    last_updated: new Date().toISOString(),
    parallel_contexts: parallel,
  };
}
