# kai-unified-session

Persistent goal graph and session continuity layer for PAI.

> "One session, everywhere. Pick up where you left off."

## What It Does

- **Goal Tracking** — Explicit Current State → Desired State with progress and verification
- **Session Continuity** — Resume where you left off, any device
- **Branching** — Explore alternative approaches without losing work
- **Temporal History** — Snapshots capture goal evolution over time
- **Cross-Project** — Manage goals across multiple projects

## Quick Start

```bash
cd Packs/kai-unified-session
bun install

# Create a goal
bun run src/cli/index.ts goal create "Implement user authentication"

# List goals
bun run src/cli/index.ts goal list

# Update progress
bun run src/cli/index.ts goal progress <goal_id> 0.5

# Show stats
bun run src/cli/index.ts stats
```

## CLI Commands

### Goals

```bash
goal create <title>          # Create a new goal
goal list [--all]            # List goals
goal show <id>               # Show goal details
goal complete <id>           # Mark as complete
goal abandon <id> <reason>   # Abandon with reason
goal pause <id>              # Pause work
goal resume <id>             # Resume paused goal
goal progress <id> <0-1>     # Set progress (0.0 to 1.0)
```

### Snapshots

```bash
goal snapshot <id> <event>   # Create manual snapshot
goal history <id>            # View snapshot timeline
```

### Branches

```bash
goal branch <id> <name>      # Create exploration branch
goal branches <id>           # List branches
goal switch <id> <branch>    # Switch to branch
goal abandon-branch <id> <branch> <reason>
```

### Projects

```bash
project list                 # List all projects
project create <name> <path> # Create a project
```

### Session

```bash
session status               # Current session state
session context              # Detailed context dump
session focus <goal-id>      # Set active goal
```

### Index

```bash
index rebuild                # Rebuild goal index
stats                        # Show statistics
```

## Data Storage

Goals are stored as YAML files in `$PAI_DIR/goals/`:

```
$PAI_DIR/goals/
├── active/           # Active goal files
├── archived/         # Completed/abandoned goals
├── snapshots/        # Point-in-time captures
├── branches/         # Alternative explorations
├── projects/         # Project groupings
├── session-state.yaml
└── index.json        # Fast query index
```

## Hooks

The pack includes hooks for session continuity:

- **session-start.ts** — Loads context, generates resume prompt
- **session-end.ts** — Saves state for next session

To enable, add to your Claude Code settings:

```json
{
  "hooks": {
    "SessionStart": [
      { "command": "bun run $PAI_DIR/../Packs/kai-unified-session/src/hooks/session-start.ts" }
    ],
    "SessionEnd": [
      { "command": "bun run $PAI_DIR/../Packs/kai-unified-session/src/hooks/session-end.ts" }
    ]
  }
}
```

## Goal Structure

Each goal captures:

```yaml
# The Core Loop
current_state: "Where you are now"
desired_state: "Where you want to be"

# Verification (per PAI principles)
verification:
  criteria: ["Success criterion 1", "Success criterion 2"]
  method: manual | automated | hybrid

# Progress
status: active | paused | completed | abandoned
progress: 0.65  # 0.0 to 1.0

# Context
context:
  primary_files: [...]
  learnings: [...]
  decisions: [...]
  agents: [...]
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 kai-unified-session                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Models → Storage → Services → Hooks/CLI            │
│                                                      │
│  Goal, Snapshot, Branch, Project, SessionState      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Phase 1 Complete

- [x] Goal YAML schema and validation
- [x] Basic CRUD operations
- [x] Snapshot creation (manual + auto)
- [x] Branch creation and switching
- [x] Index generation and queries
- [x] Session state save/load
- [x] SessionStart/SessionEnd hooks
- [x] CLI for all operations

## Future Phases

- **Phase 2**: Enhanced temporal features (rollback, timeline viz)
- **Phase 3**: Branch merge, conflict resolution
- **Phase 4**: Graph visualization, dependency tracking
- **Phase 5**: Cross-device sync (git-based)
- **Phase 6**: Agent integration and coordination

## Dependencies

- **Runtime**: Bun
- **Required**: `yaml` package
- **Optional**: `kai-hook-system` for event integration

## License

Part of PAI (Personal AI Infrastructure)
