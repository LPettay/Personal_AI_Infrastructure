/**
 * Model Exports
 */

export * from './goal';
export * from './snapshot';
export * from './branch';
export * from './project';
export * from './session-state';

/**
 * Index Model
 *
 * Fast-query JSON index rebuilt from YAML sources.
 */

export interface GoalIndexEntry {
  title: string;
  status: string;
  progress: number;
  project: string;
  parent?: string;
  children: string[];
  tags: string[];
  updated: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'parent' | 'child' | 'depends_on' | 'informs' | 'evolved_from';
}

export interface GoalIndex {
  schema_version: 1;
  generated: string;

  goals: Record<string, GoalIndexEntry>;

  by_status: Record<string, string[]>;
  by_project: Record<string, string[]>;
  by_tag: Record<string, string[]>;

  graph: {
    edges: GraphEdge[];
  };
}

/**
 * Create an empty index
 */
export function createEmptyIndex(): GoalIndex {
  return {
    schema_version: 1,
    generated: new Date().toISOString(),
    goals: {},
    by_status: {},
    by_project: {},
    by_tag: {},
    graph: { edges: [] },
  };
}
