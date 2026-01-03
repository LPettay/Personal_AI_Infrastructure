# kai-unified-session

**Pack Specification v0.1.0**

A persistent goal graph and session continuity layer for PAI. Enables cross-device, cross-project, continuous AI collaboration with full temporal history and branching exploration.

---

## Vision

> "One session, everywhere. Pick up where you left off. Your goals, your progress, your context — always available."

This pack fulfills PAI's promise of an AI that knows your goals and gets better over time by providing:

1. **Persistent goal tracking** — Current State → Desired State, versioned
2. **Session continuity** — No more "new session" friction
3. **Cross-device sync** — Same context on any machine
4. **Parallel work streams** — Multiple projects, multiple agents, unified view
5. **Temporal history** — See how goals evolved, branch and explore

---

## Core Principles

Aligned with PAI's 15 principles:

| Principle | Application |
|-----------|-------------|
| Foundational Algorithm | Goals are explicit Current → Desired with verification |
| Scaffolding > Model | Infrastructure makes any model session-aware |
| As Deterministic as Possible | YAML schemas, git versioning, predictable state |
| UNIX Philosophy | Small tools, text interfaces, composable |
| Meta / Self Update | Goals can trigger system improvements |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        kai-unified-session                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ Goal Graph  │  │  Snapshots  │  │  Branches   │                 │
│  │   (YAML)    │  │   (YAML)    │  │   (YAML)    │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                         │
│         └────────────────┴────────────────┘                         │
│                          │                                          │
│                    ┌─────▼─────┐                                    │
│                    │   Index   │  ← Fast queries                    │
│                    │  (JSON)   │                                    │
│                    └─────┬─────┘                                    │
│                          │                                          │
│         ┌────────────────┼────────────────┐                         │
│         │                │                │                         │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐                 │
│  │   Hooks     │  │    CLI      │  │   Sync      │                 │
│  │ Integration │  │  Commands   │  │  Protocol   │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │      Existing PAI Systems      │
              ├────────────────────────────────┤
              │ kai-hook-system (events)       │
              │ kai-history-system (capture)   │
              │ kai-skill-system (routing)     │
              │ kai-observability (monitoring) │
              └────────────────────────────────┘
```

---

## Data Models

### 1. Goal

The fundamental unit. Represents a Current State → Desired State transformation.

**File:** `$PAI_DIR/goals/active/{goal_id}.yaml`

```yaml
# Goal Schema v1
schema_version: 1

id: goal_2026010215301234
created: 2026-01-02T15:30:00-08:00
updated: 2026-01-02T21:45:00-08:00

# The Core Loop
current_state: |
  Dashboard shows static data loaded on page refresh.
  No real-time updates. Users must manually reload.

desired_state: |
  Dashboard updates in real-time via WebSocket.
  New events appear within 500ms of occurrence.
  Connection status visible to user.

# Verification (Critical per PAI principles)
verification:
  criteria:
    - Events appear in UI within 500ms of server receipt
    - Connection indicator shows live/disconnected state
    - Reconnection is automatic after network interruption
  method: manual | automated | hybrid
  test_commands:
    - "curl -X POST localhost:4000/test-event"
    - "bun test src/websocket.test.ts"

# Status
status: active | paused | completed | abandoned | blocked
progress: 0.65  # 0.0 to 1.0, optional

# Context
title: "Real-time WebSocket Dashboard"
description: |
  Enable live updates in the observability dashboard so events
  stream in real-time without page refresh.
tags: [observability, websocket, frontend]
project: kai-observability-server
priority: high | medium | low

# Relationships (Graph Edges)
parent: goal_2026010112000000  # Optional, for sub-goals
children:
  - goal_2026010215350001  # "Set up WebSocket server"
  - goal_2026010215350002  # "Implement Vue client connection"
  - goal_2026010215350003  # "Add reconnection logic"

depends_on: []  # Goals that block this one
informs: []     # Goals this one provides input to
evolved_from: goal_2025123100000000  # Previous iteration

# Work Context
context:
  primary_files:
    - src/observability/apps/server/src/index.ts
    - src/observability/apps/client/src/App.vue
  related_files:
    - src/observability/apps/server/src/types.ts

  sessions:
    - session_id: ses_abc123
      date: 2026-01-02
      summary: "Initial research on WebSocket options"
    - session_id: ses_def456
      date: 2026-01-02
      summary: "Implemented basic server, testing client"

  agents:
    - id: researcher-1
      task: "Investigate WebSocket vs SSE tradeoffs"
      status: completed
    - id: engineer-1
      task: "Implement WebSocket server"
      status: active

  learnings:
    - "Bun's native WebSocket is simpler than ws package"
    - "Vue 3 reactivity works well with WebSocket onmessage"

  decisions:
    - decision: "Use native Bun WebSocket over ws package"
      rationale: "Simpler API, no dependencies, better performance"
      date: 2026-01-02
      reversible: true

# Branches (Alternative Approaches)
branches:
  - id: branch_sse
    name: "Server-Sent Events approach"
    status: abandoned
    reason: "SSE is unidirectional, need bidirectional for future features"
    snapshot: snap_2026010216000000

  - id: branch_websocket
    name: "Native WebSocket approach"
    status: active
    current: true

# Timeline
snapshots:
  - snap_2026010215300000  # Initial creation
  - snap_2026010218000000  # After research phase
  - snap_2026010221000000  # After server implementation

# Metadata
created_by: main  # Agent that created this goal
last_touched_by: engineer-1
```

---

### 2. Snapshot

Point-in-time capture of goal state. Enables time travel and understanding evolution.

**File:** `$PAI_DIR/goals/snapshots/{goal_id}/{snapshot_id}.yaml`

```yaml
# Snapshot Schema v1
schema_version: 1

id: snap_2026010218000000
goal_id: goal_2026010215301234
created: 2026-01-02T18:00:00-08:00
trigger: manual | auto_progress | branch_create | milestone

# State at this moment
current_state: |
  Dashboard shows static data loaded on page refresh.

desired_state: |
  Dashboard updates in real-time via WebSocket.

progress: 0.25
status: active

# What happened
event: "Completed research phase"
summary: |
  Investigated WebSocket vs SSE vs polling.
  Decision: Use native Bun WebSocket.
  Next: Implement server-side WebSocket handler.

# Diff from previous snapshot
changes:
  - field: progress
    from: 0.0
    to: 0.25
  - field: context.decisions
    added: "Use native Bun WebSocket over ws package"
  - field: context.learnings
    added: "Bun's native WebSocket is simpler than ws package"

# Links
previous_snapshot: snap_2026010215300000
branch: branch_websocket  # Which branch this is on
session: ses_abc123       # Session that created this
```

---

### 3. Branch

Alternative exploration path. Like git branches for goals.

**File:** `$PAI_DIR/goals/branches/{goal_id}/{branch_id}.yaml`

```yaml
# Branch Schema v1
schema_version: 1

id: branch_sse
goal_id: goal_2026010215301234
created: 2026-01-02T16:00:00-08:00
updated: 2026-01-02T17:30:00-08:00

name: "Server-Sent Events approach"
description: |
  Exploring SSE as alternative to WebSocket.
  Simpler server-side, but unidirectional.

status: active | merged | abandoned
parent_branch: branch_main  # Branched from
branch_point: snap_2026010215300000  # Snapshot where branch started

# Branch-specific state
current_state: |
  Implemented basic SSE endpoint.
  Events flow server → client.

progress: 0.3

# Snapshots on this branch
snapshots:
  - snap_branch_sse_001
  - snap_branch_sse_002

# Resolution
resolution:
  status: abandoned
  reason: "SSE is unidirectional, need bidirectional for future features"
  decided: 2026-01-02T17:30:00-08:00
  decided_by: main

# Merge info (if merged)
merged_to: null
merge_snapshot: null
```

---

### 4. Project

Groups goals by project/codebase.

**File:** `$PAI_DIR/goals/projects/{project_id}.yaml`

```yaml
# Project Schema v1
schema_version: 1

id: proj_kai_observability
name: kai-observability-server
path: /Users/lance/Documents/Personal/Projects/PAI/Personal_AI_Infrastructure/Packs/kai-observability-server

description: |
  Real-time observability dashboard for PAI agent activity.

# Goal references
active_goals:
  - goal_2026010215301234
  - goal_2026010300000001

paused_goals:
  - goal_2025123100000000

completed_goals:
  - goal_2025122900000001
  - goal_2025122900000002

# Project-level context
default_agents:
  - type: researcher
    config: { thoroughness: medium }
  - type: engineer
    config: { style: pragmatic }

tech_stack:
  - Bun
  - TypeScript
  - Vue 3
  - Vite
  - Tailwind

conventions:
  - "Use Bun for all scripts"
  - "Prefer native APIs over packages"
  - "Vue 3 Composition API only"
```

---

### 5. Session State

Continuity layer for cross-device resume.

**File:** `$PAI_DIR/goals/session-state.yaml`

```yaml
# Session State Schema v1
schema_version: 1

last_updated: 2026-01-02T21:45:00-08:00
last_device: macbook-pro
last_session: ses_def456

# What was I doing?
active_context:
  goal: goal_2026010215301234
  branch: branch_websocket
  focus: "Implementing Vue client WebSocket connection"

  # Recent work
  recent_files:
    - path: src/observability/apps/client/src/App.vue
      last_edit: 2026-01-02T21:40:00-08:00
    - path: src/observability/apps/server/src/index.ts
      last_edit: 2026-01-02T21:30:00-08:00

  # Open threads
  pending_questions:
    - "Should reconnection be exponential backoff or fixed interval?"

  pending_tasks:
    - "Add connection status indicator to UI"
    - "Handle message queue during disconnection"

  # Running agents
  active_agents:
    - id: engineer-1
      task: "Implement WebSocket server"
      started: 2026-01-02T21:00:00-08:00
      status: working

# Quick resume prompt
resume_prompt: |
  You were working on the real-time WebSocket dashboard.

  Current progress: 65%
  Last action: Implemented basic WebSocket server, testing client connection.
  Next steps: Add connection status indicator, handle reconnection.

  Active files:
  - src/observability/apps/client/src/App.vue
  - src/observability/apps/server/src/index.ts

  Open question: Should reconnection use exponential backoff?

# Parallel work streams
parallel_contexts:
  - goal: goal_2026010300000001
    project: kai-history-system
    status: paused
    last_summary: "Researching compression options for JSONL files"
```

---

### 6. Index

Fast-query JSON index, rebuilt from YAML sources.

**File:** `$PAI_DIR/goals/index.json`

```json
{
  "schema_version": 1,
  "generated": "2026-01-02T21:45:00-08:00",

  "goals": {
    "goal_2026010215301234": {
      "title": "Real-time WebSocket Dashboard",
      "status": "active",
      "progress": 0.65,
      "project": "kai-observability-server",
      "parent": null,
      "children": ["goal_2026010215350001", "goal_2026010215350002"],
      "tags": ["observability", "websocket", "frontend"],
      "updated": "2026-01-02T21:45:00-08:00"
    }
  },

  "by_status": {
    "active": ["goal_2026010215301234", "goal_2026010215350001"],
    "paused": ["goal_2025123100000000"],
    "completed": ["goal_2025122900000001"]
  },

  "by_project": {
    "kai-observability-server": ["goal_2026010215301234"],
    "kai-history-system": ["goal_2026010300000001"]
  },

  "by_tag": {
    "websocket": ["goal_2026010215301234"],
    "frontend": ["goal_2026010215301234", "goal_2026010215350002"]
  },

  "graph": {
    "edges": [
      { "from": "goal_2026010215301234", "to": "goal_2026010215350001", "type": "parent" },
      { "from": "goal_2026010215301234", "to": "goal_2026010215350002", "type": "parent" }
    ]
  }
}
```

---

## Directory Structure

```
$PAI_DIR/
├── goals/
│   ├── active/                    # Active goal YAML files
│   │   ├── goal_2026010215301234.yaml
│   │   └── goal_2026010215350001.yaml
│   │
│   ├── archived/                  # Completed/abandoned goals
│   │   └── goal_2025122900000001.yaml
│   │
│   ├── snapshots/                 # Point-in-time captures
│   │   └── goal_2026010215301234/
│   │       ├── snap_2026010215300000.yaml
│   │       └── snap_2026010218000000.yaml
│   │
│   ├── branches/                  # Alternative explorations
│   │   └── goal_2026010215301234/
│   │       ├── branch_main.yaml
│   │       └── branch_sse.yaml
│   │
│   ├── projects/                  # Project groupings
│   │   ├── proj_kai_observability.yaml
│   │   └── proj_kai_history.yaml
│   │
│   ├── session-state.yaml         # Cross-device continuity
│   ├── index.json                 # Fast query index
│   └── .git/                      # Git versioning for goals
│
└── hooks/
    └── unified-session/           # Hook implementations
        ├── session-start.ts       # Load context on start
        ├── session-end.ts         # Save state on end
        ├── goal-progress.ts       # Auto-snapshot on progress
        └── agent-complete.ts      # Update goal from agent work
```

---

## Hook Integration

### SessionStart Hook

Loads context and generates resume prompt.

```typescript
// $PAI_DIR/hooks/unified-session/session-start.ts

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.pai`;
const STATE_FILE = join(PAI_DIR, 'goals', 'session-state.yaml');

async function main() {
  if (!existsSync(STATE_FILE)) {
    console.log('No previous session state found.');
    return;
  }

  const state = parseYAML(readFileSync(STATE_FILE, 'utf-8'));

  // Output resume context for Claude
  console.log(`
<system-reminder>
## Session Continuity - Resuming Previous Work

${state.resume_prompt}

### Active Goal
- **ID:** ${state.active_context.goal}
- **Focus:** ${state.active_context.focus}

### Quick Actions
- "Continue where I left off" - Resume active goal
- "Show my goals" - List all active goals
- "Switch to [project]" - Change project context
- "What was I doing?" - Detailed context dump
</system-reminder>
  `);
}

main().catch(console.error);
```

### SessionEnd Hook

Saves state for next session.

```typescript
// $PAI_DIR/hooks/unified-session/session-end.ts

import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

interface SessionEndPayload {
  session_id: string;
  transcript_path: string;
}

async function main() {
  const input = await readStdin();
  const payload: SessionEndPayload = JSON.parse(input);

  // Analyze transcript to extract:
  // - Last goal worked on
  // - Files modified
  // - Pending questions/tasks
  // - Summary of work done

  const state = buildSessionState(payload);

  const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.pai`;
  writeFileSync(
    join(PAI_DIR, 'goals', 'session-state.yaml'),
    serializeYAML(state)
  );

  // Auto-snapshot active goals
  await snapshotActiveGoals('session_end');
}

main().catch(console.error);
```

### Stop Hook Enhancement

Updates goal progress based on work.

```typescript
// $PAI_DIR/hooks/unified-session/goal-progress.ts

// Triggered on Stop events
// Analyzes response for goal progress indicators:
// - "completed", "finished", "done" → increment progress
// - "blocked", "stuck", "issue" → flag for attention
// - File changes → update context.primary_files

async function main() {
  const input = await readStdin();
  const payload = JSON.parse(input);

  const activeGoal = await getActiveGoal();
  if (!activeGoal) return;

  const progressDelta = analyzeProgress(payload.stop_response);

  if (progressDelta > 0) {
    await updateGoalProgress(activeGoal.id, progressDelta);
    await createAutoSnapshot(activeGoal.id, 'progress_update');
  }
}
```

---

## CLI Commands

Implemented as a skill or standalone CLI.

```bash
# Goal Management
pai goal create "Real-time dashboard updates"     # Create new goal
pai goal list                                      # List active goals
pai goal list --all                                # Include archived
pai goal show <goal_id>                            # Show goal details
pai goal edit <goal_id>                            # Edit in $EDITOR
pai goal complete <goal_id>                        # Mark complete
pai goal abandon <goal_id> --reason "..."          # Abandon with reason
pai goal pause <goal_id>                           # Pause work
pai goal resume <goal_id>                          # Resume paused goal

# Progress & Snapshots
pai goal progress <goal_id> 0.75                   # Set progress
pai goal snapshot <goal_id> "Completed research"   # Manual snapshot
pai goal history <goal_id>                         # Show snapshot timeline
pai goal rollback <goal_id> <snapshot_id>          # Restore snapshot

# Branching
pai goal branch <goal_id> "Try SSE approach"       # Create branch
pai goal branches <goal_id>                        # List branches
pai goal switch <goal_id> <branch_id>              # Switch branch
pai goal merge <branch_id>                         # Merge branch to main
pai goal abandon-branch <branch_id> --reason "..." # Abandon branch

# Relationships
pai goal link <goal_id> --parent <parent_id>       # Set parent
pai goal link <goal_id> --blocks <other_id>        # Add dependency
pai goal tree <goal_id>                            # Show goal tree
pai goal graph                                     # Full goal graph (DOT format)

# Context
pai goal context                                   # Show current context
pai goal focus <goal_id>                           # Set active focus
pai goal assign <goal_id> --agent researcher       # Assign agent

# Projects
pai project list                                   # List projects
pai project goals <project_id>                     # Goals for project
pai project switch <project_id>                    # Change project context

# Session
pai session status                                 # Current session state
pai session resume                                 # Generate resume prompt
pai session sync                                   # Sync state (for cross-device)
```

---

## Sync Protocol

For cross-device continuity.

### Option A: Git-based Sync

Simple, uses existing infrastructure.

```bash
# Goals directory is a git repo
cd $PAI_DIR/goals
git init

# Sync is just git
pai session sync
# Equivalent to:
# git add -A && git commit -m "Session state $(date)" && git pull --rebase && git push
```

**Pros:** Simple, conflict resolution via git, full history
**Cons:** Requires git remote setup, not real-time

### Option B: File Sync Service

Use existing sync (iCloud, Dropbox, Syncthing).

```bash
# Configure PAI_DIR to synced location
export PAI_DIR="$HOME/Dropbox/PAI"
# or
export PAI_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/PAI"
```

**Pros:** Zero setup if already using sync, real-time
**Cons:** Conflict handling varies by service

### Option C: Custom Sync Server (Future)

For real-time collaboration and advanced features.

```yaml
# $PAI_DIR/config/sync.yaml
sync:
  enabled: true
  server: https://pai-sync.yourdomain.com
  auth: bearer_token_here

  realtime: true
  conflict_resolution: last_write_wins | merge | manual
```

---

## AI Integration

### Skill Definition

```yaml
# $PAI_DIR/skills/goals/SKILL.md
---
name: Goals
description: |
  Goal tracking and session continuity. USE WHEN user mentions goals,
  progress, "where was I", "what am I working on", switching projects,
  or resuming work.
---

# Goals Skill

Manages the goal graph and session continuity.

## Commands

| Trigger | Action |
|---------|--------|
| "What am I working on?" | Show active goal context |
| "Create a goal for..." | Create new goal |
| "I finished [task]" | Update progress, create snapshot |
| "Let's try a different approach" | Create branch |
| "Go back to [approach]" | Switch branch |
| "Switch to [project]" | Change project context |
| "Show my goals" | List active goals |

## Workflow Routing

- Creating goals → `Workflows/CreateGoal.md`
- Updating progress → `Workflows/UpdateProgress.md`
- Branching → `Workflows/BranchGoal.md`
- Reviewing history → `Workflows/GoalHistory.md`
```

### Auto-Context Injection

On session start, inject active goal context:

```typescript
// In session-start hook, output to stdout for Claude to see:

console.log(`
<goal-context>
Active Goal: ${goal.title}
Progress: ${Math.round(goal.progress * 100)}%

Current State:
${goal.current_state}

Desired State:
${goal.desired_state}

Recent Learnings:
${goal.context.learnings.map(l => `- ${l}`).join('\n')}

Next Steps:
${state.pending_tasks.map(t => `- ${t}`).join('\n')}
</goal-context>
`);
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Goal YAML schema and validation
- [ ] Basic CRUD operations (create, read, update, archive)
- [ ] Index generation and queries
- [ ] Session state save/load
- [ ] SessionStart/SessionEnd hooks

### Phase 2: Temporal Features
- [ ] Snapshot creation (manual + auto)
- [ ] Snapshot diff and history view
- [ ] Rollback to snapshot
- [ ] Timeline visualization

### Phase 3: Branching
- [ ] Branch creation from goal
- [ ] Branch switching
- [ ] Branch merge/abandon
- [ ] Branch-aware snapshots

### Phase 4: Graph Features
- [ ] Parent/child relationships
- [ ] Dependency tracking (blocks/informs)
- [ ] Progress rollup from children
- [ ] Graph visualization (DOT export)

### Phase 5: Cross-Device
- [ ] Git-based sync
- [ ] Conflict detection
- [ ] Merge strategies
- [ ] Multi-device testing

### Phase 6: Agent Integration
- [ ] Agent assignment to goals
- [ ] Agent progress reporting
- [ ] Parallel agent coordination
- [ ] Agent handoff between sessions

---

## Dependencies

**Required:**
- `kai-hook-system` — Event infrastructure

**Recommended:**
- `kai-history-system` — Links sessions/learnings to goals
- `kai-skill-system` — Natural language goal commands

**Runtime:**
- Bun (TypeScript execution)
- Git (for sync option A)

---

## File Manifest

```
kai-unified-session/
├── SPEC.md                    # This file
├── README.md                  # User documentation
├── INSTALL.md                 # Installation guide
├── VERIFY.md                  # Verification steps
│
├── src/
│   ├── models/
│   │   ├── goal.ts            # Goal type definitions
│   │   ├── snapshot.ts        # Snapshot type definitions
│   │   ├── branch.ts          # Branch type definitions
│   │   └── project.ts         # Project type definitions
│   │
│   ├── storage/
│   │   ├── yaml-store.ts      # YAML file operations
│   │   ├── index-builder.ts   # JSON index generation
│   │   └── git-sync.ts        # Git-based sync
│   │
│   ├── hooks/
│   │   ├── session-start.ts   # Load context
│   │   ├── session-end.ts     # Save state
│   │   ├── goal-progress.ts   # Auto-progress tracking
│   │   └── agent-complete.ts  # Agent result integration
│   │
│   ├── cli/
│   │   ├── goal.ts            # Goal commands
│   │   ├── project.ts         # Project commands
│   │   └── session.ts         # Session commands
│   │
│   └── lib/
│       ├── yaml.ts            # YAML parsing/serialization
│       ├── id.ts              # ID generation
│       └── graph.ts           # Graph operations
│
├── skills/
│   └── goals/
│       ├── SKILL.md           # Skill definition
│       └── Workflows/
│           ├── CreateGoal.md
│           ├── UpdateProgress.md
│           ├── BranchGoal.md
│           └── GoalHistory.md
│
├── config/
│   └── settings-hooks.json    # Hook registrations
│
└── schemas/
    ├── goal.schema.json       # JSON Schema for validation
    ├── snapshot.schema.json
    ├── branch.schema.json
    └── project.schema.json
```

---

## Example Usage

### Creating a Goal

```
User: "I want to add real-time updates to the observability dashboard"

Jarvis: I'll create a goal for this.

[Creates goal_2026010215301234.yaml]

Goal created: "Real-time updates for observability dashboard"

Current State: Dashboard shows static data, requires refresh
Desired State: Live updates via WebSocket within 500ms

Would you like me to break this into sub-goals?
```

### Resuming Work

```
[New session starts, SessionStart hook fires]

Jarvis: Welcome back. Here's where you left off:

**Active Goal:** Real-time WebSocket Dashboard (65% complete)

Last session you:
- Implemented basic WebSocket server
- Started Vue client connection

Open question: Should reconnection use exponential backoff?

Next steps:
- Add connection status indicator to UI
- Handle message queue during disconnection

Ready to continue, or would you like to switch context?
```

### Branching Exploration

```
User: "Let me try a different approach - what about Server-Sent Events?"

Jarvis: Creating a branch to explore SSE.

[Creates branch_sse from current state]

You're now on branch: "SSE approach"
Original progress preserved on main branch.

I'll research SSE implementation and we can compare approaches.
```

---

## Success Criteria

This pack succeeds when:

1. **Zero friction resume** — Any session starts with full context
2. **Goals are explicit** — Current → Desired always visible
3. **Nothing is lost** — All exploration preserved in branches/snapshots
4. **Cross-device works** — Same state on any machine
5. **Parallel work flows** — Multiple projects don't interfere
6. **History is navigable** — Can see how any goal evolved
7. **Agents are coordinated** — Work persists beyond session boundaries

---

## Open Questions

1. **Snapshot frequency** — Auto on every progress update? Only on milestones?
2. **Index rebuild** — On every write? Lazy? Background job?
3. **Large goal graphs** — Performance at 100+ goals? 1000+?
4. **Conflict UX** — How to surface sync conflicts to user?
5. **Agent state** — How much agent context to preserve between sessions?

---

## References

- PAI Foundational Algorithm (Current → Desired + 7-phase loop)
- PAI Principle #10: Meta / Self Update System
- PAI Principle #13: Custom History System
- Git data model (commits, branches, DAG)
- Roam/Obsidian graph models
