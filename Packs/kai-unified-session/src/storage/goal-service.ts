/**
 * Goal Service
 *
 * High-level CRUD operations for goals with automatic indexing and snapshots.
 */

import {
  Goal,
  CreateGoalInput,
  UpdateGoalInput,
  createGoal,
  updateGoal as updateGoalModel,
  Snapshot,
  createSnapshot,
  computeChanges,
  Branch,
  createBranch,
  abandonBranch,
  Project,
  CreateProjectInput,
  createProject,
  addGoalToProject,
  findBestMatchingProject,
} from '../models';

import {
  saveGoal,
  loadGoal,
  archiveGoal,
  listGoals,
  loadAllGoals,
  saveSnapshot,
  loadSnapshot,
  listSnapshots,
  loadAllSnapshots,
  saveBranch,
  loadBranch,
  listBranches,
  loadAllBranches,
  saveProject,
  loadProject,
  findProjectByPath,
  loadAllProjects,
} from './yaml-store';

import { rebuildIndex } from './index-builder';

// ============================================================================
// Goal CRUD
// ============================================================================

export interface CreateGoalOptions {
  createdBy?: string;
  autoSnapshot?: boolean;
  autoIndex?: boolean;
}

/**
 * Create a new goal
 */
export async function create(
  input: CreateGoalInput,
  options: CreateGoalOptions = {}
): Promise<Goal> {
  const { createdBy = 'main', autoSnapshot = true, autoIndex = true } = options;

  // Create the goal
  const goal = createGoal(input, createdBy);

  // Save it
  saveGoal(goal);

  // Create initial snapshot
  if (autoSnapshot) {
    const snapshot = createSnapshot(goal, 'Goal created', `Initial goal: ${goal.title}`, 'manual');
    goal.snapshots.push(snapshot.id);
    saveSnapshot(snapshot);
    saveGoal(goal);
  }

  // Update project if it exists
  const project = findProjectByPath(input.project);
  if (project) {
    const updatedProject = addGoalToProject(project, goal.id, 'active');
    saveProject(updatedProject);
  }

  // Rebuild index
  if (autoIndex) {
    await rebuildIndex();
  }

  return goal;
}

/**
 * Get a goal by ID
 */
export function get(goalId: string): Goal | null {
  return loadGoal(goalId);
}

/**
 * List all goal IDs
 */
export function list(includeArchived: boolean = false): string[] {
  return listGoals(includeArchived);
}

/**
 * Load all goals
 */
export function getAll(includeArchived: boolean = false): Goal[] {
  return loadAllGoals(includeArchived);
}

export interface UpdateGoalOptions {
  updatedBy?: string;
  autoSnapshot?: boolean;
  snapshotEvent?: string;
  autoIndex?: boolean;
}

/**
 * Update an existing goal
 */
export async function update(
  goalId: string,
  input: UpdateGoalInput,
  options: UpdateGoalOptions = {}
): Promise<Goal | null> {
  const { updatedBy = 'main', autoSnapshot = true, snapshotEvent, autoIndex = true } = options;

  const goal = loadGoal(goalId);
  if (!goal) {
    return null;
  }

  // Store previous state for diff
  const previousState = { ...goal };

  // Update the goal
  const updatedGoal = updateGoalModel(goal, input, updatedBy);

  // Create snapshot if significant changes
  if (autoSnapshot && (input.progress !== undefined || input.status !== undefined)) {
    const changes = computeChanges(previousState as Record<string, unknown>, updatedGoal as Record<string, unknown>);

    if (changes.length > 0) {
      const event = snapshotEvent || generateSnapshotEvent(input);
      const summary = generateSnapshotSummary(previousState, updatedGoal, changes);

      const snapshot = createSnapshot(updatedGoal, event, summary, 'auto_progress', changes);
      updatedGoal.snapshots.push(snapshot.id);
      saveSnapshot(snapshot);
    }
  }

  // Save updated goal
  saveGoal(updatedGoal);

  // Update project status if goal status changed
  if (input.status && input.status !== previousState.status) {
    const project = findProjectByPath(updatedGoal.project);
    if (project) {
      const updatedProject = addGoalToProject(project, goalId, input.status as 'active' | 'paused' | 'completed' | 'abandoned');
      saveProject(updatedProject);
    }
  }

  // Rebuild index
  if (autoIndex) {
    await rebuildIndex();
  }

  return updatedGoal;
}

/**
 * Archive a goal (move to archived folder)
 */
export async function archive(goalId: string, autoIndex: boolean = true): Promise<boolean> {
  const result = archiveGoal(goalId);

  if (result && autoIndex) {
    await rebuildIndex();
  }

  return result;
}

/**
 * Complete a goal
 */
export async function complete(
  goalId: string,
  summary?: string,
  updatedBy: string = 'main'
): Promise<Goal | null> {
  const goal = await update(
    goalId,
    { status: 'completed', progress: 1.0 },
    { updatedBy, snapshotEvent: 'Goal completed', autoSnapshot: true }
  );

  if (goal && summary) {
    // Add final snapshot with summary
    const snapshot = createSnapshot(goal, 'Goal completed', summary, 'milestone');
    goal.snapshots.push(snapshot.id);
    saveSnapshot(snapshot);
    saveGoal(goal);
  }

  return goal;
}

/**
 * Abandon a goal
 */
export async function abandon(
  goalId: string,
  reason: string,
  updatedBy: string = 'main'
): Promise<Goal | null> {
  const goal = await update(
    goalId,
    { status: 'abandoned' },
    { updatedBy, snapshotEvent: `Goal abandoned: ${reason}`, autoSnapshot: true }
  );

  return goal;
}

/**
 * Pause a goal
 */
export async function pause(goalId: string, updatedBy: string = 'main'): Promise<Goal | null> {
  return update(goalId, { status: 'paused' }, { updatedBy, snapshotEvent: 'Goal paused' });
}

/**
 * Resume a paused goal
 */
export async function resume(goalId: string, updatedBy: string = 'main'): Promise<Goal | null> {
  return update(goalId, { status: 'active' }, { updatedBy, snapshotEvent: 'Goal resumed' });
}

/**
 * Update goal progress
 */
export async function setProgress(
  goalId: string,
  progress: number,
  updatedBy: string = 'main'
): Promise<Goal | null> {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return update(goalId, { progress: clampedProgress }, { updatedBy });
}

// ============================================================================
// Snapshot Operations
// ============================================================================

/**
 * Get a snapshot
 */
export function getSnapshot(goalId: string, snapshotId: string): Snapshot | null {
  return loadSnapshot(goalId, snapshotId);
}

/**
 * List snapshots for a goal
 */
export function getSnapshots(goalId: string): Snapshot[] {
  return loadAllSnapshots(goalId);
}

/**
 * Create a manual snapshot
 */
export function createManualSnapshot(
  goalId: string,
  event: string,
  summary: string
): Snapshot | null {
  const goal = loadGoal(goalId);
  if (!goal) {
    return null;
  }

  const snapshot = createSnapshot(goal, event, summary, 'manual');
  goal.snapshots.push(snapshot.id);
  saveSnapshot(snapshot);
  saveGoal(goal);

  return snapshot;
}

// ============================================================================
// Branch Operations
// ============================================================================

/**
 * Create a new branch for a goal
 */
export async function createGoalBranch(
  goalId: string,
  name: string,
  description: string = ''
): Promise<Branch | null> {
  const goal = loadGoal(goalId);
  if (!goal) {
    return null;
  }

  // Create snapshot at branch point
  const branchSnapshot = createSnapshot(
    goal,
    `Branch created: ${name}`,
    `Starting exploration: ${description || name}`,
    'branch_create'
  );
  goal.snapshots.push(branchSnapshot.id);
  saveSnapshot(branchSnapshot);

  // Create the branch
  const branch = createBranch(goal, name, description);
  saveBranch(branch);

  // Update goal with new branch
  goal.branches.push({
    id: branch.id,
    name: branch.name,
    status: 'active',
  });

  saveGoal(goal);
  await rebuildIndex();

  return branch;
}

/**
 * Switch to a different branch
 */
export function switchBranch(goalId: string, branchId: string): Goal | null {
  const goal = loadGoal(goalId);
  if (!goal) {
    return null;
  }

  // Update current flags
  goal.branches = goal.branches.map((b) => ({
    ...b,
    current: b.id === branchId,
  }));

  saveGoal(goal);
  return goal;
}

/**
 * Abandon a branch
 */
export async function abandonGoalBranch(
  goalId: string,
  branchId: string,
  reason: string,
  decidedBy: string = 'main'
): Promise<Branch | null> {
  const branch = loadBranch(goalId, branchId);
  if (!branch) {
    return null;
  }

  const abandoned = abandonBranch(branch, reason, decidedBy);
  saveBranch(abandoned);

  // Update goal's branch reference
  const goal = loadGoal(goalId);
  if (goal) {
    goal.branches = goal.branches.map((b) =>
      b.id === branchId ? { ...b, status: 'abandoned', reason } : b
    );
    saveGoal(goal);
  }

  await rebuildIndex();
  return abandoned;
}

/**
 * Get all branches for a goal
 */
export function getBranches(goalId: string): Branch[] {
  return loadAllBranches(goalId);
}

// ============================================================================
// Project Operations
// ============================================================================

/**
 * Register a new project
 */
export function registerProject(input: CreateProjectInput): Project {
  // Check if project already exists by path
  const existing = findProjectByPath(input.path);
  if (existing) {
    // Update existing project with new info
    const updated: Project = {
      ...existing,
      name: input.name,
      description: input.description || existing.description,
      repo: input.repo || existing.repo,
      branch: input.branch || existing.branch,
      aliases: input.aliases || existing.aliases,
      auto_detect: input.auto_detect ?? existing.auto_detect,
      tech_stack: input.tech_stack || existing.tech_stack,
      conventions: input.conventions || existing.conventions,
      updated: new Date().toISOString(),
    };
    saveProject(updated);
    return updated;
  }

  // Create new project
  const project = createProject(input);
  saveProject(project);

  return project;
}

/**
 * Create or get a project (legacy compatibility)
 */
export function getOrCreateProject(name: string, path: string, description: string = ''): Project {
  return registerProject({ name, path, description });
}

/**
 * Get all projects
 */
export function getProjects(): Project[] {
  return loadAllProjects();
}

/**
 * Get a project by ID
 */
export function getProject(projectId: string): Project | null {
  return loadProject(projectId);
}

/**
 * Detect project from a path (cwd)
 */
export function detectProjectFromPath(path: string): Project | null {
  const projects = loadAllProjects();
  return findBestMatchingProject(projects, path);
}

/**
 * Get goals for a project
 */
export function getProjectGoals(projectId: string): Goal[] {
  const project = loadProject(projectId);
  if (!project) {
    return [];
  }

  const allGoalIds = [
    ...project.active_goals,
    ...project.paused_goals,
    ...project.completed_goals,
    ...project.abandoned_goals,
  ];

  const goals: Goal[] = [];
  for (const goalId of allGoalIds) {
    const goal = loadGoal(goalId);
    if (goal) {
      goals.push(goal);
    }
  }

  return goals;
}

/**
 * Get active goals for a project
 */
export function getProjectActiveGoals(projectId: string): Goal[] {
  const project = loadProject(projectId);
  if (!project) {
    return [];
  }

  const goals: Goal[] = [];
  for (const goalId of project.active_goals) {
    const goal = loadGoal(goalId);
    if (goal) {
      goals.push(goal);
    }
  }

  return goals;
}

// ============================================================================
// Helpers
// ============================================================================

function generateSnapshotEvent(input: UpdateGoalInput): string {
  if (input.status === 'completed') return 'Goal completed';
  if (input.status === 'abandoned') return 'Goal abandoned';
  if (input.status === 'paused') return 'Goal paused';
  if (input.status === 'active') return 'Goal resumed';
  if (input.progress !== undefined) return 'Progress updated';
  return 'Goal updated';
}

function generateSnapshotSummary(
  before: Goal,
  after: Goal,
  changes: Array<{ field: string; from?: unknown; to?: unknown }>
): string {
  const lines: string[] = [];

  for (const change of changes) {
    if (change.field === 'progress') {
      const fromPct = Math.round((before.progress || 0) * 100);
      const toPct = Math.round((after.progress || 0) * 100);
      lines.push(`Progress: ${fromPct}% → ${toPct}%`);
    } else if (change.field === 'status') {
      lines.push(`Status: ${before.status} → ${after.status}`);
    } else {
      lines.push(`${change.field} updated`);
    }
  }

  return lines.join('\n');
}
