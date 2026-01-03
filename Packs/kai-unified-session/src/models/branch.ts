/**
 * Branch Model
 *
 * Alternative exploration path for a goal.
 * Like git branches, but for goals.
 */

export type BranchStatus = 'active' | 'merged' | 'abandoned';

export interface BranchResolution {
  status: 'merged' | 'abandoned';
  reason?: string;
  decided: string;
  decided_by: string;
}

export interface Branch {
  // Schema
  schema_version: 1;

  // Identity
  id: string;
  goal_id: string;
  created: string;
  updated: string;

  // Info
  name: string;
  description: string;

  // Status
  status: BranchStatus;
  parent_branch: string;
  branch_point: string; // Snapshot ID where branch started

  // Branch-specific state (diverged from main)
  current_state?: string;
  progress?: number;

  // Snapshots on this branch
  snapshots: string[];

  // Resolution (if not active)
  resolution?: BranchResolution;

  // Merge info (if merged)
  merged_to?: string;
  merge_snapshot?: string;
}

/**
 * Generate a new branch ID
 */
export function generateBranchId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 20);
  return `branch_${slug}`;
}

/**
 * Create a new branch from a goal
 */
export function createBranch(
  goal: {
    id: string;
    snapshots: string[];
    branches: Array<{ id: string; current?: boolean }>;
  },
  name: string,
  description: string = ''
): Branch {
  const now = new Date().toISOString();
  const currentBranch = goal.branches.find((b) => b.current)?.id || 'branch_main';
  const latestSnapshot = goal.snapshots.length > 0 ? goal.snapshots[goal.snapshots.length - 1] : '';

  return {
    schema_version: 1,
    id: generateBranchId(name),
    goal_id: goal.id,
    created: now,
    updated: now,

    name,
    description,

    status: 'active',
    parent_branch: currentBranch,
    branch_point: latestSnapshot,

    current_state: undefined,
    progress: undefined,

    snapshots: [],

    resolution: undefined,
    merged_to: undefined,
    merge_snapshot: undefined,
  };
}

/**
 * Abandon a branch
 */
export function abandonBranch(branch: Branch, reason: string, decidedBy: string = 'main'): Branch {
  return {
    ...branch,
    status: 'abandoned',
    updated: new Date().toISOString(),
    resolution: {
      status: 'abandoned',
      reason,
      decided: new Date().toISOString(),
      decided_by: decidedBy,
    },
  };
}

/**
 * Merge a branch
 */
export function mergeBranch(
  branch: Branch,
  targetBranch: string,
  mergeSnapshot: string,
  decidedBy: string = 'main'
): Branch {
  return {
    ...branch,
    status: 'merged',
    updated: new Date().toISOString(),
    resolution: {
      status: 'merged',
      decided: new Date().toISOString(),
      decided_by: decidedBy,
    },
    merged_to: targetBranch,
    merge_snapshot: mergeSnapshot,
  };
}
