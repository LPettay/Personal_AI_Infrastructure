/**
 * Goal Model
 *
 * The fundamental unit of the unified session system.
 * Represents a Current State → Desired State transformation.
 */

export type GoalStatus = 'active' | 'paused' | 'completed' | 'abandoned' | 'blocked';
export type Priority = 'high' | 'medium' | 'low';
export type VerificationMethod = 'manual' | 'automated' | 'hybrid';

export interface Verification {
  criteria: string[];
  method: VerificationMethod;
  test_commands?: string[];
}

export interface SessionReference {
  session_id: string;
  date: string;
  summary: string;
}

export interface AgentAssignment {
  id: string;
  task: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  started?: string;
  completed?: string;
}

export interface Decision {
  decision: string;
  rationale: string;
  date: string;
  reversible: boolean;
}

export interface GoalContext {
  primary_files: string[];
  related_files?: string[];
  sessions: SessionReference[];
  agents: AgentAssignment[];
  learnings: string[];
  decisions: Decision[];
}

export interface BranchReference {
  id: string;
  name: string;
  status: 'active' | 'merged' | 'abandoned';
  reason?: string;
  snapshot?: string;
  current?: boolean;
}

export interface Goal {
  // Schema
  schema_version: 1;

  // Identity
  id: string;
  created: string;
  updated: string;

  // The Core Loop
  current_state: string;
  desired_state: string;

  // Verification (Critical per PAI principles)
  verification: Verification;

  // Status
  status: GoalStatus;
  progress: number; // 0.0 to 1.0

  // Context
  title: string;
  description: string;
  tags: string[];
  project: string;
  priority: Priority;

  // Relationships (Graph Edges)
  parent?: string;
  children: string[];
  depends_on: string[];
  informs: string[];
  evolved_from?: string;

  // Work Context
  context: GoalContext;

  // Branches
  branches: BranchReference[];

  // Timeline
  snapshots: string[];

  // Metadata
  created_by: string;
  last_touched_by: string;
}

/**
 * Input for creating a new goal (minimal required fields)
 */
export interface CreateGoalInput {
  title: string;
  current_state: string;
  desired_state: string;
  project: string;

  // Optional fields
  description?: string;
  tags?: string[];
  priority?: Priority;
  parent?: string;
  verification?: Partial<Verification>;
}

/**
 * Input for updating an existing goal
 */
export interface UpdateGoalInput {
  title?: string;
  current_state?: string;
  desired_state?: string;
  description?: string;
  status?: GoalStatus;
  progress?: number;
  tags?: string[];
  priority?: Priority;
  verification?: Partial<Verification>;
}

/**
 * Generate a new goal ID
 */
export function generateGoalId(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 6);
  return `goal_${timestamp}${random}`;
}

/**
 * Create a new goal with defaults
 */
export function createGoal(input: CreateGoalInput, createdBy: string = 'main'): Goal {
  const now = new Date().toISOString();
  const id = generateGoalId();

  return {
    schema_version: 1,
    id,
    created: now,
    updated: now,

    current_state: input.current_state,
    desired_state: input.desired_state,

    verification: {
      criteria: input.verification?.criteria || [],
      method: input.verification?.method || 'manual',
      test_commands: input.verification?.test_commands,
    },

    status: 'active',
    progress: 0,

    title: input.title,
    description: input.description || '',
    tags: input.tags || [],
    project: input.project,
    priority: input.priority || 'medium',

    parent: input.parent,
    children: [],
    depends_on: [],
    informs: [],
    evolved_from: undefined,

    context: {
      primary_files: [],
      related_files: [],
      sessions: [],
      agents: [],
      learnings: [],
      decisions: [],
    },

    branches: [
      {
        id: 'branch_main',
        name: 'main',
        status: 'active',
        current: true,
      },
    ],

    snapshots: [],

    created_by: createdBy,
    last_touched_by: createdBy,
  };
}

/**
 * Update a goal with new values
 */
export function updateGoal(goal: Goal, input: UpdateGoalInput, updatedBy: string = 'main'): Goal {
  return {
    ...goal,
    ...input,
    updated: new Date().toISOString(),
    last_touched_by: updatedBy,
    verification: input.verification
      ? { ...goal.verification, ...input.verification }
      : goal.verification,
  };
}
