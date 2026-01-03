#!/usr/bin/env bun
/**
 * Unified Session CLI
 *
 * Command-line interface for goal and session management.
 */

import {
  create,
  get,
  list,
  getAll,
  update,
  complete,
  abandon,
  pause,
  resume,
  setProgress,
  createManualSnapshot,
  getSnapshots,
  createGoalBranch,
  switchBranch,
  abandonGoalBranch,
  getBranches,
  getOrCreateProject,
  getProjects,
} from '../storage/goal-service';

import {
  getSessionState,
  setActiveGoal,
  generateDetailedContext,
} from '../storage/session-service';

import { getStats, searchGoals, rebuildIndex } from '../storage/index-builder';
import { ensureDirectories } from '../lib/paths';
import { CreateGoalInput } from '../models';

const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];

function printHelp() {
  console.log(`
Unified Session CLI

USAGE:
  pai <command> [subcommand] [options]

COMMANDS:
  goal create <title>        Create a new goal
  goal list [--all]          List goals (--all includes archived)
  goal show <id>             Show goal details
  goal complete <id>         Mark goal as complete
  goal abandon <id> <reason> Abandon a goal
  goal pause <id>            Pause a goal
  goal resume <id>           Resume a paused goal
  goal progress <id> <0-1>   Set goal progress

  goal snapshot <id> <event> Create a manual snapshot
  goal history <id>          Show goal snapshots

  goal branch <id> <name>    Create a new branch
  goal branches <id>         List branches for a goal
  goal switch <id> <branch>  Switch to a branch
  goal abandon-branch <id> <branch> <reason>

  project list               List all projects
  project create <name> <path>

  session status             Show current session state
  session context            Show detailed context
  session focus <id>         Set active goal

  index rebuild              Rebuild the goal index
  stats                      Show goal statistics

  help                       Show this help
`);
}

async function main() {
  ensureDirectories();

  if (!command || command === 'help') {
    printHelp();
    return;
  }

  try {
    switch (command) {
      case 'goal':
        await handleGoalCommand();
        break;

      case 'project':
        await handleProjectCommand();
        break;

      case 'session':
        await handleSessionCommand();
        break;

      case 'index':
        if (subcommand === 'rebuild') {
          console.log('Rebuilding index...');
          await rebuildIndex();
          console.log('Index rebuilt.');
        }
        break;

      case 'stats':
        const stats = getStats();
        console.log('\nGoal Statistics:');
        console.log(`  Total: ${stats.total}`);
        console.log('\n  By Status:');
        for (const [status, count] of Object.entries(stats.byStatus)) {
          console.log(`    ${status}: ${count}`);
        }
        console.log('\n  By Project:');
        for (const [project, count] of Object.entries(stats.byProject)) {
          console.log(`    ${project}: ${count}`);
        }
        break;

      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

async function handleGoalCommand() {
  const id = args[2];

  switch (subcommand) {
    case 'create': {
      const title = args.slice(2).join(' ');
      if (!title) {
        console.error('Usage: goal create <title>');
        process.exit(1);
      }

      const input: CreateGoalInput = {
        title,
        current_state: 'Not started',
        desired_state: 'To be defined',
        project: process.cwd(),
      };

      const goal = await create(input);
      console.log(`Created goal: ${goal.id}`);
      console.log(`  Title: ${goal.title}`);
      break;
    }

    case 'list': {
      const includeArchived = args.includes('--all');
      const goals = getAll(includeArchived);

      if (goals.length === 0) {
        console.log('No goals found.');
        return;
      }

      console.log('\nGoals:');
      for (const goal of goals) {
        const pct = Math.round(goal.progress * 100);
        const status = goal.status.padEnd(10);
        console.log(`  [${status}] ${goal.id}`);
        console.log(`             ${goal.title} (${pct}%)`);
      }
      break;
    }

    case 'show': {
      if (!id) {
        console.error('Usage: goal show <id>');
        process.exit(1);
      }

      const goal = get(id);
      if (!goal) {
        console.error(`Goal not found: ${id}`);
        process.exit(1);
      }

      console.log(`\nGoal: ${goal.title}`);
      console.log(`  ID: ${goal.id}`);
      console.log(`  Status: ${goal.status}`);
      console.log(`  Progress: ${Math.round(goal.progress * 100)}%`);
      console.log(`  Project: ${goal.project}`);
      console.log(`  Created: ${goal.created}`);
      console.log(`  Updated: ${goal.updated}`);
      console.log(`\nCurrent State:\n  ${goal.current_state}`);
      console.log(`\nDesired State:\n  ${goal.desired_state}`);

      if (goal.context.learnings.length > 0) {
        console.log('\nLearnings:');
        for (const learning of goal.context.learnings) {
          console.log(`  - ${learning}`);
        }
      }
      break;
    }

    case 'complete': {
      if (!id) {
        console.error('Usage: goal complete <id>');
        process.exit(1);
      }

      const goal = await complete(id);
      if (goal) {
        console.log(`Goal completed: ${goal.title}`);
      } else {
        console.error(`Goal not found: ${id}`);
      }
      break;
    }

    case 'abandon': {
      const reason = args.slice(3).join(' ') || 'No reason provided';
      if (!id) {
        console.error('Usage: goal abandon <id> <reason>');
        process.exit(1);
      }

      const goal = await abandon(id, reason);
      if (goal) {
        console.log(`Goal abandoned: ${goal.title}`);
      } else {
        console.error(`Goal not found: ${id}`);
      }
      break;
    }

    case 'pause': {
      if (!id) {
        console.error('Usage: goal pause <id>');
        process.exit(1);
      }

      const goal = await pause(id);
      if (goal) {
        console.log(`Goal paused: ${goal.title}`);
      } else {
        console.error(`Goal not found: ${id}`);
      }
      break;
    }

    case 'resume': {
      if (!id) {
        console.error('Usage: goal resume <id>');
        process.exit(1);
      }

      const goal = await resume(id);
      if (goal) {
        console.log(`Goal resumed: ${goal.title}`);
      } else {
        console.error(`Goal not found: ${id}`);
      }
      break;
    }

    case 'progress': {
      const progressVal = parseFloat(args[3]);
      if (!id || isNaN(progressVal)) {
        console.error('Usage: goal progress <id> <0-1>');
        process.exit(1);
      }

      const goal = await setProgress(id, progressVal);
      if (goal) {
        console.log(`Progress updated: ${Math.round(goal.progress * 100)}%`);
      } else {
        console.error(`Goal not found: ${id}`);
      }
      break;
    }

    case 'snapshot': {
      const event = args.slice(3).join(' ');
      if (!id || !event) {
        console.error('Usage: goal snapshot <id> <event>');
        process.exit(1);
      }

      const snapshot = createManualSnapshot(id, event, event);
      if (snapshot) {
        console.log(`Snapshot created: ${snapshot.id}`);
      } else {
        console.error(`Goal not found: ${id}`);
      }
      break;
    }

    case 'history': {
      if (!id) {
        console.error('Usage: goal history <id>');
        process.exit(1);
      }

      const snapshots = getSnapshots(id);
      if (snapshots.length === 0) {
        console.log('No snapshots found.');
        return;
      }

      console.log('\nSnapshots:');
      for (const snap of snapshots) {
        console.log(`  ${snap.id}`);
        console.log(`    ${snap.created} - ${snap.event}`);
        console.log(`    Progress: ${Math.round(snap.progress * 100)}%`);
      }
      break;
    }

    case 'branch': {
      const name = args.slice(3).join(' ');
      if (!id || !name) {
        console.error('Usage: goal branch <id> <name>');
        process.exit(1);
      }

      const branch = await createGoalBranch(id, name);
      if (branch) {
        console.log(`Branch created: ${branch.id}`);
      } else {
        console.error(`Goal not found: ${id}`);
      }
      break;
    }

    case 'branches': {
      if (!id) {
        console.error('Usage: goal branches <id>');
        process.exit(1);
      }

      const branches = getBranches(id);
      if (branches.length === 0) {
        console.log('No branches found.');
        return;
      }

      console.log('\nBranches:');
      for (const branch of branches) {
        const current = branch.status === 'active' ? ' (current)' : '';
        console.log(`  ${branch.id} [${branch.status}]${current}`);
        console.log(`    ${branch.name}`);
      }
      break;
    }

    case 'switch': {
      const branchId = args[3];
      if (!id || !branchId) {
        console.error('Usage: goal switch <id> <branch>');
        process.exit(1);
      }

      const goal = switchBranch(id, branchId);
      if (goal) {
        console.log(`Switched to branch: ${branchId}`);
      } else {
        console.error(`Goal not found: ${id}`);
      }
      break;
    }

    case 'abandon-branch': {
      const branchId = args[3];
      const reason = args.slice(4).join(' ') || 'No reason provided';
      if (!id || !branchId) {
        console.error('Usage: goal abandon-branch <id> <branch> <reason>');
        process.exit(1);
      }

      const branch = await abandonGoalBranch(id, branchId, reason);
      if (branch) {
        console.log(`Branch abandoned: ${branchId}`);
      } else {
        console.error(`Branch not found: ${branchId}`);
      }
      break;
    }

    case 'search': {
      const query = args.slice(2).join(' ');
      if (!query) {
        console.error('Usage: goal search <query>');
        process.exit(1);
      }

      const results = searchGoals(query);
      if (results.length === 0) {
        console.log('No goals found matching query.');
        return;
      }

      console.log(`\nFound ${results.length} goals:`);
      for (const goalId of results) {
        const goal = get(goalId);
        if (goal) {
          console.log(`  ${goalId}: ${goal.title}`);
        }
      }
      break;
    }

    default:
      console.error(`Unknown goal command: ${subcommand}`);
      printHelp();
      process.exit(1);
  }
}

async function handleProjectCommand() {
  switch (subcommand) {
    case 'list': {
      const projects = getProjects();
      if (projects.length === 0) {
        console.log('No projects found.');
        return;
      }

      console.log('\nProjects:');
      for (const project of projects) {
        console.log(`  ${project.id}`);
        console.log(`    Name: ${project.name}`);
        console.log(`    Path: ${project.path}`);
        console.log(`    Active goals: ${project.active_goals.length}`);
      }
      break;
    }

    case 'create': {
      const name = args[2];
      const path = args[3];
      if (!name || !path) {
        console.error('Usage: project create <name> <path>');
        process.exit(1);
      }

      const project = getOrCreateProject(name, path);
      console.log(`Project created/found: ${project.id}`);
      break;
    }

    default:
      console.error(`Unknown project command: ${subcommand}`);
      printHelp();
      process.exit(1);
  }
}

async function handleSessionCommand() {
  switch (subcommand) {
    case 'status': {
      const state = getSessionState();
      console.log('\nSession State:');
      console.log(`  Last session: ${state.last_session}`);
      console.log(`  Last device: ${state.last_device}`);
      console.log(`  Last updated: ${state.last_updated}`);

      if (state.active_context) {
        console.log(`\n  Active goal: ${state.active_context.goal}`);
        console.log(`  Branch: ${state.active_context.branch}`);
        console.log(`  Focus: ${state.active_context.focus}`);
      }
      break;
    }

    case 'context': {
      const context = generateDetailedContext();
      console.log(context);
      break;
    }

    case 'focus': {
      const goalId = args[2];
      if (!goalId) {
        console.error('Usage: session focus <goal-id>');
        process.exit(1);
      }

      try {
        const state = setActiveGoal(goalId);
        console.log(`Active goal set: ${state.active_context?.goal}`);
      } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
      }
      break;
    }

    default:
      console.error(`Unknown session command: ${subcommand}`);
      printHelp();
      process.exit(1);
  }
}

main();
