/**
 * YAML Storage Layer
 *
 * Handles reading/writing YAML files for goals, snapshots, branches, projects.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, renameSync } from 'fs';
import YAML from 'yaml';
import {
  Goal,
  Snapshot,
  Branch,
  Project,
  SessionState,
  createEmptySessionState,
} from '../models';
import {
  ensureDirectories,
  ensureGoalDirectories,
  getGoalPath,
  getSnapshotPath,
  getSnapshotDir,
  getBranchPath,
  getBranchDir,
  getProjectPath,
  paths,
} from '../lib/paths';

// ============================================================================
// YAML Utilities
// ============================================================================

function parseYAML<T>(content: string): T {
  return YAML.parse(content) as T;
}

function serializeYAML<T>(data: T): string {
  return YAML.stringify(data, {
    lineWidth: 0, // Don't wrap lines
    defaultStringType: 'QUOTE_DOUBLE',
    defaultKeyType: 'PLAIN',
  });
}

function readYAMLFile<T>(path: string): T | null {
  if (!existsSync(path)) {
    return null;
  }
  const content = readFileSync(path, 'utf-8');
  return parseYAML<T>(content);
}

function writeYAMLFile<T>(path: string, data: T): void {
  writeFileSync(path, serializeYAML(data), 'utf-8');
}

// ============================================================================
// Goal Storage
// ============================================================================

export function saveGoal(goal: Goal): void {
  ensureDirectories();
  ensureGoalDirectories(goal.id);
  writeYAMLFile(getGoalPath(goal.id), goal);
}

export function loadGoal(goalId: string): Goal | null {
  // Check active first, then archived
  let goal = readYAMLFile<Goal>(getGoalPath(goalId, false));
  if (!goal) {
    goal = readYAMLFile<Goal>(getGoalPath(goalId, true));
  }
  return goal;
}

export function archiveGoal(goalId: string): boolean {
  const activePath = getGoalPath(goalId, false);
  const archivedPath = getGoalPath(goalId, true);

  if (!existsSync(activePath)) {
    return false;
  }

  ensureDirectories();
  renameSync(activePath, archivedPath);
  return true;
}

export function deleteGoal(goalId: string): boolean {
  const activePath = getGoalPath(goalId, false);
  const archivedPath = getGoalPath(goalId, true);

  let deleted = false;

  if (existsSync(activePath)) {
    unlinkSync(activePath);
    deleted = true;
  }

  if (existsSync(archivedPath)) {
    unlinkSync(archivedPath);
    deleted = true;
  }

  return deleted;
}

export function listGoals(includeArchived: boolean = false): string[] {
  ensureDirectories();

  const activeDir = paths.active();
  const activeFiles = existsSync(activeDir)
    ? readdirSync(activeDir)
        .filter((f) => f.endsWith('.yaml'))
        .map((f) => f.replace('.yaml', ''))
    : [];

  if (!includeArchived) {
    return activeFiles;
  }

  const archivedDir = paths.archived();
  const archivedFiles = existsSync(archivedDir)
    ? readdirSync(archivedDir)
        .filter((f) => f.endsWith('.yaml'))
        .map((f) => f.replace('.yaml', ''))
    : [];

  return [...activeFiles, ...archivedFiles];
}

export function loadAllGoals(includeArchived: boolean = false): Goal[] {
  const ids = listGoals(includeArchived);
  const goals: Goal[] = [];

  for (const id of ids) {
    const goal = loadGoal(id);
    if (goal) {
      goals.push(goal);
    }
  }

  return goals;
}

// ============================================================================
// Snapshot Storage
// ============================================================================

export function saveSnapshot(snapshot: Snapshot): void {
  ensureGoalDirectories(snapshot.goal_id);
  writeYAMLFile(getSnapshotPath(snapshot.goal_id, snapshot.id), snapshot);
}

export function loadSnapshot(goalId: string, snapshotId: string): Snapshot | null {
  return readYAMLFile<Snapshot>(getSnapshotPath(goalId, snapshotId));
}

export function listSnapshots(goalId: string): string[] {
  const dir = getSnapshotDir(goalId);
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.replace('.yaml', ''))
    .sort(); // Chronological order (IDs are timestamp-based)
}

export function loadAllSnapshots(goalId: string): Snapshot[] {
  const ids = listSnapshots(goalId);
  const snapshots: Snapshot[] = [];

  for (const id of ids) {
    const snapshot = loadSnapshot(goalId, id);
    if (snapshot) {
      snapshots.push(snapshot);
    }
  }

  return snapshots;
}

// ============================================================================
// Branch Storage
// ============================================================================

export function saveBranch(branch: Branch): void {
  ensureGoalDirectories(branch.goal_id);
  writeYAMLFile(getBranchPath(branch.goal_id, branch.id), branch);
}

export function loadBranch(goalId: string, branchId: string): Branch | null {
  return readYAMLFile<Branch>(getBranchPath(goalId, branchId));
}

export function listBranches(goalId: string): string[] {
  const dir = getBranchDir(goalId);
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.replace('.yaml', ''));
}

export function loadAllBranches(goalId: string): Branch[] {
  const ids = listBranches(goalId);
  const branches: Branch[] = [];

  for (const id of ids) {
    const branch = loadBranch(goalId, id);
    if (branch) {
      branches.push(branch);
    }
  }

  return branches;
}

// ============================================================================
// Project Storage
// ============================================================================

export function saveProject(project: Project): void {
  ensureDirectories();
  writeYAMLFile(getProjectPath(project.id), project);
}

export function loadProject(projectId: string): Project | null {
  return readYAMLFile<Project>(getProjectPath(projectId));
}

export function listProjects(): string[] {
  ensureDirectories();
  const dir = paths.projects();

  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.replace('.yaml', ''));
}

export function loadAllProjects(): Project[] {
  const ids = listProjects();
  const projects: Project[] = [];

  for (const id of ids) {
    const project = loadProject(id);
    if (project) {
      projects.push(project);
    }
  }

  return projects;
}

export function findProjectByPath(path: string): Project | null {
  const projects = loadAllProjects();
  // Use the model's path matching which handles symlinks
  const { findBestMatchingProject } = require('../models/project');
  return findBestMatchingProject(projects, path);
}

// ============================================================================
// Session State Storage
// ============================================================================

export function saveSessionState(state: SessionState): void {
  ensureDirectories();
  writeYAMLFile(paths.sessionState(), state);
}

export function loadSessionState(): SessionState {
  const state = readYAMLFile<SessionState>(paths.sessionState());
  if (!state) {
    return createEmptySessionState();
  }
  return state;
}

// ============================================================================
// Index Storage
// ============================================================================

export function saveIndex(index: object): void {
  ensureDirectories();
  writeFileSync(paths.index(), JSON.stringify(index, null, 2), 'utf-8');
}

export function loadIndex<T>(): T | null {
  const indexPath = paths.index();
  if (!existsSync(indexPath)) {
    return null;
  }
  const content = readFileSync(indexPath, 'utf-8');
  return JSON.parse(content) as T;
}
