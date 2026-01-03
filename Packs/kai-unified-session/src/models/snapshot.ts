/**
 * Snapshot Model
 *
 * Point-in-time capture of goal state.
 * Enables time travel and understanding evolution.
 */

export type SnapshotTrigger = 'manual' | 'auto_progress' | 'branch_create' | 'milestone' | 'session_end';

export interface FieldChange {
  field: string;
  from?: unknown;
  to?: unknown;
  added?: unknown;
  removed?: unknown;
}

export interface Snapshot {
  // Schema
  schema_version: 1;

  // Identity
  id: string;
  goal_id: string;
  created: string;
  trigger: SnapshotTrigger;

  // State at this moment
  current_state: string;
  desired_state: string;
  progress: number;
  status: string;

  // What happened
  event: string;
  summary: string;

  // Diff from previous snapshot
  changes: FieldChange[];

  // Links
  previous_snapshot?: string;
  branch: string;
  session?: string;
}

/**
 * Generate a new snapshot ID
 */
export function generateSnapshotId(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 4);
  return `snap_${timestamp}${random}`;
}

/**
 * Create a snapshot from a goal
 */
export function createSnapshot(
  goal: {
    id: string;
    current_state: string;
    desired_state: string;
    progress: number;
    status: string;
    snapshots: string[];
    branches: Array<{ id: string; current?: boolean }>;
  },
  event: string,
  summary: string,
  trigger: SnapshotTrigger = 'manual',
  changes: FieldChange[] = [],
  session?: string
): Snapshot {
  const currentBranch = goal.branches.find((b) => b.current)?.id || 'branch_main';
  const previousSnapshot = goal.snapshots.length > 0 ? goal.snapshots[goal.snapshots.length - 1] : undefined;

  return {
    schema_version: 1,
    id: generateSnapshotId(),
    goal_id: goal.id,
    created: new Date().toISOString(),
    trigger,

    current_state: goal.current_state,
    desired_state: goal.desired_state,
    progress: goal.progress,
    status: goal.status,

    event,
    summary,
    changes,

    previous_snapshot: previousSnapshot,
    branch: currentBranch,
    session,
  };
}

/**
 * Compute changes between two goal states
 */
export function computeChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[] = ['progress', 'status', 'current_state', 'desired_state']
): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const field of fields) {
    const fromVal = before[field];
    const toVal = after[field];

    if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
      changes.push({
        field,
        from: fromVal,
        to: toVal,
      });
    }
  }

  return changes;
}
