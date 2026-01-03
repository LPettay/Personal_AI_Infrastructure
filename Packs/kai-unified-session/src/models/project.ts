/**
 * Project Model
 *
 * Groups goals by project/codebase.
 */

export interface AgentConfig {
  type: string;
  config: Record<string, unknown>;
}

export interface Project {
  // Schema
  schema_version: 1;

  // Identity
  id: string;
  name: string;
  path: string;
  created: string;
  updated: string;

  // Description
  description: string;

  // Goal references
  active_goals: string[];
  paused_goals: string[];
  completed_goals: string[];
  abandoned_goals: string[];

  // Project-level context
  default_agents: AgentConfig[];
  tech_stack: string[];
  conventions: string[];
}

/**
 * Generate a project ID from name
 */
export function generateProjectId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 30);
  return `proj_${slug}`;
}

/**
 * Create a new project
 */
export function createProject(
  name: string,
  path: string,
  description: string = ''
): Project {
  const now = new Date().toISOString();

  return {
    schema_version: 1,
    id: generateProjectId(name),
    name,
    path,
    created: now,
    updated: now,

    description,

    active_goals: [],
    paused_goals: [],
    completed_goals: [],
    abandoned_goals: [],

    default_agents: [],
    tech_stack: [],
    conventions: [],
  };
}

/**
 * Add a goal to a project
 */
export function addGoalToProject(
  project: Project,
  goalId: string,
  status: 'active' | 'paused' | 'completed' | 'abandoned' = 'active'
): Project {
  const updated = { ...project, updated: new Date().toISOString() };

  // Remove from all lists first
  updated.active_goals = updated.active_goals.filter((id) => id !== goalId);
  updated.paused_goals = updated.paused_goals.filter((id) => id !== goalId);
  updated.completed_goals = updated.completed_goals.filter((id) => id !== goalId);
  updated.abandoned_goals = updated.abandoned_goals.filter((id) => id !== goalId);

  // Add to appropriate list
  switch (status) {
    case 'active':
      updated.active_goals.push(goalId);
      break;
    case 'paused':
      updated.paused_goals.push(goalId);
      break;
    case 'completed':
      updated.completed_goals.push(goalId);
      break;
    case 'abandoned':
      updated.abandoned_goals.push(goalId);
      break;
  }

  return updated;
}

/**
 * Get all goal IDs for a project
 */
export function getAllProjectGoals(project: Project): string[] {
  return [
    ...project.active_goals,
    ...project.paused_goals,
    ...project.completed_goals,
    ...project.abandoned_goals,
  ];
}
