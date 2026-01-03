/**
 * Session Service
 *
 * High-level operations for session state management and continuity.
 */

import { hostname } from 'os';
import {
  SessionState,
  createEmptySessionState,
  updateSessionState,
  generateResumePrompt,
  addParallelContext,
  RecentFile,
  ActiveAgent,
  ParallelContext,
} from '../models';
import { saveSessionState, loadSessionState } from './yaml-store';
import { loadGoal } from './yaml-store';
import { getActiveGoals } from './index-builder';

/**
 * Get the current device name
 */
function getDeviceName(): string {
  try {
    return hostname();
  } catch {
    return 'unknown';
  }
}

/**
 * Load or create session state
 */
export function getSessionState(): SessionState {
  return loadSessionState();
}

/**
 * Save session state
 */
export function saveState(state: SessionState): void {
  saveSessionState(state);
}

/**
 * Start a new session (called by SessionStart hook)
 */
export function startSession(sessionId: string): SessionState {
  const existing = loadSessionState();

  const updated = updateSessionState(existing, {
    session: sessionId,
    device: getDeviceName(),
  });

  saveSessionState(updated);
  return updated;
}

/**
 * End a session (called by SessionEnd hook)
 */
export function endSession(
  sessionId: string,
  summary?: {
    focus?: string;
    files?: RecentFile[];
    tasks?: string[];
    questions?: string[];
  }
): SessionState {
  const existing = loadSessionState();

  const updated = updateSessionState(existing, {
    session: sessionId,
    device: getDeviceName(),
    focus: summary?.focus,
    files: summary?.files,
    tasks: summary?.tasks,
    questions: summary?.questions,
  });

  saveSessionState(updated);
  return updated;
}

/**
 * Set the active goal for the current session
 */
export function setActiveGoal(
  goalId: string,
  branch: string = 'branch_main'
): SessionState {
  const goal = loadGoal(goalId);
  if (!goal) {
    throw new Error(`Goal not found: ${goalId}`);
  }

  const existing = loadSessionState();

  const updated = updateSessionState(existing, {
    goal: goalId,
    branch,
    focus: goal.title,
  });

  saveSessionState(updated);
  return updated;
}

/**
 * Update focus description
 */
export function setFocus(focus: string): SessionState {
  const existing = loadSessionState();

  const updated = updateSessionState(existing, {
    focus,
  });

  saveSessionState(updated);
  return updated;
}

/**
 * Add a file to recent files
 */
export function addRecentFile(path: string): SessionState {
  const existing = loadSessionState();
  const files = existing.active_context?.recent_files || [];

  // Remove if already exists
  const filtered = files.filter((f) => f.path !== path);

  // Add to front
  const updated = [
    { path, last_edit: new Date().toISOString() },
    ...filtered,
  ].slice(0, 10); // Keep last 10

  const newState = updateSessionState(existing, {
    files: updated,
  });

  saveSessionState(newState);
  return newState;
}

/**
 * Add a pending task
 */
export function addPendingTask(task: string): SessionState {
  const existing = loadSessionState();
  const tasks = existing.active_context?.pending_tasks || [];

  if (!tasks.includes(task)) {
    tasks.push(task);
  }

  const updated = updateSessionState(existing, {
    tasks,
  });

  saveSessionState(updated);
  return updated;
}

/**
 * Remove a pending task (completed)
 */
export function completePendingTask(task: string): SessionState {
  const existing = loadSessionState();
  const tasks = existing.active_context?.pending_tasks || [];

  const updated = updateSessionState(existing, {
    tasks: tasks.filter((t) => t !== task),
  });

  saveSessionState(updated);
  return updated;
}

/**
 * Add a pending question
 */
export function addPendingQuestion(question: string): SessionState {
  const existing = loadSessionState();
  const questions = existing.active_context?.pending_questions || [];

  if (!questions.includes(question)) {
    questions.push(question);
  }

  const updated = updateSessionState(existing, {
    questions,
  });

  saveSessionState(updated);
  return updated;
}

/**
 * Update agent status
 */
export function updateAgent(agent: ActiveAgent): SessionState {
  const existing = loadSessionState();
  const agents = existing.active_context?.active_agents || [];

  const idx = agents.findIndex((a) => a.id === agent.id);
  if (idx >= 0) {
    agents[idx] = agent;
  } else {
    agents.push(agent);
  }

  const updated = updateSessionState(existing, {
    agents,
  });

  saveSessionState(updated);
  return updated;
}

/**
 * Add a parallel work context
 */
export function addParallel(context: ParallelContext): SessionState {
  const existing = loadSessionState();
  const updated = addParallelContext(existing, context);
  saveSessionState(updated);
  return updated;
}

/**
 * Generate context for session start
 */
export function generateStartContext(): string {
  const state = loadSessionState();

  if (!state.active_context?.goal) {
    // No previous context, show active goals summary
    const activeGoalIds = getActiveGoals();

    if (activeGoalIds.length === 0) {
      return `
<session-context>
No active goals. What would you like to work on?

Quick actions:
- "Create a goal for [description]" - Start tracking a new goal
- "Show my projects" - See available projects
</session-context>
`;
    }

    const goalSummaries: string[] = [];
    for (const id of activeGoalIds.slice(0, 5)) {
      const goal = loadGoal(id);
      if (goal) {
        const pct = Math.round(goal.progress * 100);
        goalSummaries.push(`- **${goal.title}** (${pct}%) - ${goal.project}`);
      }
    }

    return `
<session-context>
## Active Goals

${goalSummaries.join('\n')}

${activeGoalIds.length > 5 ? `...and ${activeGoalIds.length - 5} more\n` : ''}
Quick actions:
- "Continue [goal name]" - Resume work on a goal
- "What was I doing?" - Show last session context
- "Create a goal for [description]" - Start a new goal
</session-context>
`;
  }

  // Have previous context
  const goal = loadGoal(state.active_context.goal);
  const goalTitle = goal?.title || 'Unknown goal';
  const goalProgress = goal ? Math.round(goal.progress * 100) : 0;

  return `
<session-context>
## Resuming Previous Session

**Last active goal:** ${goalTitle} (${goalProgress}% complete)
**Last device:** ${state.last_device}
**Last updated:** ${state.last_updated}

${state.resume_prompt}

Quick actions:
- "Continue where I left off" - Resume this goal
- "Switch to [project/goal]" - Change context
- "Show my goals" - List all active goals
</session-context>
`;
}

/**
 * Generate a detailed context dump
 */
export function generateDetailedContext(): string {
  const state = loadSessionState();
  const lines: string[] = ['## Session State Details', ''];

  lines.push(`**Last Session:** ${state.last_session}`);
  lines.push(`**Last Device:** ${state.last_device}`);
  lines.push(`**Last Updated:** ${state.last_updated}`);
  lines.push('');

  if (state.active_context) {
    const ctx = state.active_context;

    lines.push('### Active Context');
    lines.push(`**Goal:** ${ctx.goal}`);
    lines.push(`**Branch:** ${ctx.branch}`);
    lines.push(`**Focus:** ${ctx.focus}`);
    lines.push('');

    if (ctx.recent_files.length > 0) {
      lines.push('### Recent Files');
      for (const file of ctx.recent_files) {
        lines.push(`- ${file.path} (${file.last_edit})`);
      }
      lines.push('');
    }

    if (ctx.pending_tasks.length > 0) {
      lines.push('### Pending Tasks');
      for (const task of ctx.pending_tasks) {
        lines.push(`- [ ] ${task}`);
      }
      lines.push('');
    }

    if (ctx.pending_questions.length > 0) {
      lines.push('### Open Questions');
      for (const q of ctx.pending_questions) {
        lines.push(`- ${q}`);
      }
      lines.push('');
    }

    if (ctx.active_agents.length > 0) {
      lines.push('### Active Agents');
      for (const agent of ctx.active_agents) {
        lines.push(`- **${agent.id}** [${agent.status}]: ${agent.task}`);
      }
      lines.push('');
    }
  }

  if (state.parallel_contexts.length > 0) {
    lines.push('### Parallel Work Streams');
    for (const ctx of state.parallel_contexts) {
      lines.push(`- **${ctx.project}** [${ctx.status}]: ${ctx.last_summary}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
