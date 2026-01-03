/**
 * Project Model
 *
 * Groups goals by project/codebase.
 * Acts as a registry for external repositories.
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
  path: string;  // Primary path to the project
  created: string;
  updated: string;

  // Repository info
  repo?: string;  // Git remote URL (e.g., git@github.com:user/repo.git)
  branch?: string;  // Default branch (e.g., main)

  // Path matching
  aliases: string[];  // Alternative paths that map to this project
  auto_detect: boolean;  // Whether to auto-detect when cwd is in this project

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

export interface CreateProjectInput {
  name: string;
  path: string;
  description?: string;
  repo?: string;
  branch?: string;
  aliases?: string[];
  auto_detect?: boolean;
  tech_stack?: string[];
  conventions?: string[];
}

/**
 * Create a new project
 */
export function createProject(input: CreateProjectInput): Project {
  const now = new Date().toISOString();

  // Normalize path (remove trailing slash)
  const normalizedPath = input.path.replace(/\/+$/, '');

  return {
    schema_version: 1,
    id: generateProjectId(input.name),
    name: input.name,
    path: normalizedPath,
    created: now,
    updated: now,

    repo: input.repo,
    branch: input.branch || 'main',

    aliases: input.aliases || [],
    auto_detect: input.auto_detect ?? true,

    description: input.description || '',

    active_goals: [],
    paused_goals: [],
    completed_goals: [],
    abandoned_goals: [],

    default_agents: [],
    tech_stack: input.tech_stack || [],
    conventions: input.conventions || [],
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

/**
 * Check if a path matches a project
 * Returns true if the path is within the project's path or any of its aliases
 */
export function pathMatchesProject(project: Project, testPath: string): boolean {
  if (!project.auto_detect) {
    return false;
  }

  // Normalize the test path
  const normalizedTestPath = testPath.replace(/\/+$/, '');

  // Check primary path
  if (normalizedTestPath === project.path || normalizedTestPath.startsWith(project.path + '/')) {
    return true;
  }

  // Check aliases
  for (const alias of project.aliases) {
    const normalizedAlias = alias.replace(/\/+$/, '');
    if (normalizedTestPath === normalizedAlias || normalizedTestPath.startsWith(normalizedAlias + '/')) {
      return true;
    }
  }

  return false;
}

/**
 * Find the best matching project for a path
 * Returns the project with the longest matching path (most specific match)
 */
export function findBestMatchingProject(projects: Project[], testPath: string): Project | null {
  let bestMatch: Project | null = null;
  let bestMatchLength = 0;

  for (const project of projects) {
    if (!pathMatchesProject(project, testPath)) {
      continue;
    }

    // Check which path matched and use its length for specificity
    const matchLength = project.path.length;

    if (matchLength > bestMatchLength) {
      bestMatch = project;
      bestMatchLength = matchLength;
    }

    // Also check aliases
    for (const alias of project.aliases) {
      if (testPath.startsWith(alias) && alias.length > bestMatchLength) {
        bestMatch = project;
        bestMatchLength = alias.length;
      }
    }
  }

  return bestMatch;
}
