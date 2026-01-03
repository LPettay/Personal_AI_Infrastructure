/**
 * Path utilities for the unified session system
 */

import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Get the PAI directory from environment or default
 */
export function getPaiDir(): string {
  return process.env.PAI_DIR || join(process.env.HOME || '', '.pai');
}

/**
 * Get the goals root directory
 */
export function getGoalsDir(): string {
  return join(getPaiDir(), 'goals');
}

/**
 * Get specific subdirectories
 */
export const paths = {
  active: () => join(getGoalsDir(), 'active'),
  archived: () => join(getGoalsDir(), 'archived'),
  snapshots: () => join(getGoalsDir(), 'snapshots'),
  branches: () => join(getGoalsDir(), 'branches'),
  projects: () => join(getGoalsDir(), 'projects'),
  sessionState: () => join(getGoalsDir(), 'session-state.yaml'),
  index: () => join(getGoalsDir(), 'index.json'),
};

/**
 * Get path to a specific goal file
 */
export function getGoalPath(goalId: string, archived: boolean = false): string {
  const dir = archived ? paths.archived() : paths.active();
  return join(dir, `${goalId}.yaml`);
}

/**
 * Get path to a goal's snapshot directory
 */
export function getSnapshotDir(goalId: string): string {
  return join(paths.snapshots(), goalId);
}

/**
 * Get path to a specific snapshot file
 */
export function getSnapshotPath(goalId: string, snapshotId: string): string {
  return join(getSnapshotDir(goalId), `${snapshotId}.yaml`);
}

/**
 * Get path to a goal's branch directory
 */
export function getBranchDir(goalId: string): string {
  return join(paths.branches(), goalId);
}

/**
 * Get path to a specific branch file
 */
export function getBranchPath(goalId: string, branchId: string): string {
  return join(getBranchDir(goalId), `${branchId}.yaml`);
}

/**
 * Get path to a project file
 */
export function getProjectPath(projectId: string): string {
  return join(paths.projects(), `${projectId}.yaml`);
}

/**
 * Ensure all required directories exist
 */
export function ensureDirectories(): void {
  const dirs = [
    getGoalsDir(),
    paths.active(),
    paths.archived(),
    paths.snapshots(),
    paths.branches(),
    paths.projects(),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Ensure a goal's subdirectories exist
 */
export function ensureGoalDirectories(goalId: string): void {
  const dirs = [getSnapshotDir(goalId), getBranchDir(goalId)];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
