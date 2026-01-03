/**
 * Index Builder
 *
 * Builds and maintains the fast-query JSON index from YAML goal files.
 */

import { Goal, GoalIndex, GoalIndexEntry, GraphEdge, createEmptyIndex } from '../models';
import { loadAllGoals, saveIndex, loadIndex } from './yaml-store';

/**
 * Build a complete index from all goals
 */
export function buildIndex(goals: Goal[]): GoalIndex {
  const index = createEmptyIndex();
  index.generated = new Date().toISOString();

  for (const goal of goals) {
    // Add to goals map
    const entry: GoalIndexEntry = {
      title: goal.title,
      status: goal.status,
      progress: goal.progress,
      project: goal.project,
      parent: goal.parent,
      children: goal.children,
      tags: goal.tags,
      updated: goal.updated,
    };
    index.goals[goal.id] = entry;

    // Index by status
    if (!index.by_status[goal.status]) {
      index.by_status[goal.status] = [];
    }
    index.by_status[goal.status].push(goal.id);

    // Index by project
    if (!index.by_project[goal.project]) {
      index.by_project[goal.project] = [];
    }
    index.by_project[goal.project].push(goal.id);

    // Index by tags
    for (const tag of goal.tags) {
      if (!index.by_tag[tag]) {
        index.by_tag[tag] = [];
      }
      index.by_tag[tag].push(goal.id);
    }

    // Build graph edges
    if (goal.parent) {
      index.graph.edges.push({
        from: goal.parent,
        to: goal.id,
        type: 'parent',
      });
    }

    for (const childId of goal.children) {
      index.graph.edges.push({
        from: goal.id,
        to: childId,
        type: 'child',
      });
    }

    for (const depId of goal.depends_on) {
      index.graph.edges.push({
        from: goal.id,
        to: depId,
        type: 'depends_on',
      });
    }

    for (const informsId of goal.informs) {
      index.graph.edges.push({
        from: goal.id,
        to: informsId,
        type: 'informs',
      });
    }

    if (goal.evolved_from) {
      index.graph.edges.push({
        from: goal.evolved_from,
        to: goal.id,
        type: 'evolved_from',
      });
    }
  }

  return index;
}

/**
 * Rebuild the index from disk
 */
export async function rebuildIndex(): Promise<GoalIndex> {
  const goals = loadAllGoals(true); // Include archived
  const index = buildIndex(goals);
  saveIndex(index);
  return index;
}

/**
 * Get the current index (from cache or rebuild)
 */
export function getIndex(): GoalIndex {
  const cached = loadIndex<GoalIndex>();
  if (cached) {
    return cached;
  }

  // Rebuild if missing
  const goals = loadAllGoals(true);
  const index = buildIndex(goals);
  saveIndex(index);
  return index;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get goals by status
 */
export function getGoalsByStatus(status: string): string[] {
  const index = getIndex();
  return index.by_status[status] || [];
}

/**
 * Get goals by project
 */
export function getGoalsByProject(project: string): string[] {
  const index = getIndex();
  return index.by_project[project] || [];
}

/**
 * Get goals by tag
 */
export function getGoalsByTag(tag: string): string[] {
  const index = getIndex();
  return index.by_tag[tag] || [];
}

/**
 * Get goals matching multiple tags (intersection)
 */
export function getGoalsByTags(tags: string[]): string[] {
  const index = getIndex();

  if (tags.length === 0) {
    return [];
  }

  // Start with first tag's goals
  let result = new Set(index.by_tag[tags[0]] || []);

  // Intersect with remaining tags
  for (let i = 1; i < tags.length; i++) {
    const tagGoals = new Set(index.by_tag[tags[i]] || []);
    result = new Set([...result].filter((id) => tagGoals.has(id)));
  }

  return [...result];
}

/**
 * Get all active goals
 */
export function getActiveGoals(): string[] {
  return getGoalsByStatus('active');
}

/**
 * Get child goals of a parent
 */
export function getChildGoals(parentId: string): string[] {
  const index = getIndex();
  return index.graph.edges
    .filter((e) => e.from === parentId && e.type === 'parent')
    .map((e) => e.to);
}

/**
 * Get parent of a goal
 */
export function getParentGoal(goalId: string): string | undefined {
  const index = getIndex();
  const entry = index.goals[goalId];
  return entry?.parent;
}

/**
 * Get all ancestors of a goal (parent chain)
 */
export function getAncestors(goalId: string): string[] {
  const ancestors: string[] = [];
  let current = getParentGoal(goalId);

  while (current) {
    ancestors.push(current);
    current = getParentGoal(current);
  }

  return ancestors;
}

/**
 * Get all descendants of a goal (recursive children)
 */
export function getDescendants(goalId: string): string[] {
  const descendants: string[] = [];
  const children = getChildGoals(goalId);

  for (const child of children) {
    descendants.push(child);
    descendants.push(...getDescendants(child));
  }

  return descendants;
}

/**
 * Search goals by title (simple substring match)
 */
export function searchGoals(query: string): string[] {
  const index = getIndex();
  const lowerQuery = query.toLowerCase();

  return Object.entries(index.goals)
    .filter(([_, entry]) => entry.title.toLowerCase().includes(lowerQuery))
    .map(([id]) => id);
}

/**
 * Get goal statistics
 */
export function getStats(): {
  total: number;
  byStatus: Record<string, number>;
  byProject: Record<string, number>;
} {
  const index = getIndex();

  const byStatus: Record<string, number> = {};
  for (const [status, goals] of Object.entries(index.by_status)) {
    byStatus[status] = goals.length;
  }

  const byProject: Record<string, number> = {};
  for (const [project, goals] of Object.entries(index.by_project)) {
    byProject[project] = goals.length;
  }

  return {
    total: Object.keys(index.goals).length,
    byStatus,
    byProject,
  };
}
