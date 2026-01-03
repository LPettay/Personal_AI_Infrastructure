#!/usr/bin/env bun
/**
 * SessionEnd Hook
 *
 * Saves session state for next session resume.
 * Triggered when a Claude Code session ends.
 */

import { readFileSync, existsSync } from 'fs';
import { endSession, getSessionState } from '../storage/session-service';
import { loadGoal } from '../storage/yaml-store';
import { createSnapshot } from '../models';
import { saveSnapshot, saveGoal } from '../storage/yaml-store';

interface SessionEndPayload {
  session_id: string;
  transcript_path?: string;
  cwd: string;
}

interface TranscriptMessage {
  role: string;
  content: Array<{ type: string; text?: string; name?: string }>;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Extract files modified from transcript
 */
function extractModifiedFiles(transcript: TranscriptMessage[]): string[] {
  const files = new Set<string>();

  for (const msg of transcript) {
    if (msg.role === 'assistant' && msg.content) {
      for (const block of msg.content) {
        // Look for tool uses that modify files
        if (block.type === 'tool_use' && block.name) {
          const toolName = block.name;
          if (['Write', 'Edit', 'MultiEdit'].includes(toolName)) {
            // Try to extract file path from input
            const input = (block as any).input;
            if (input?.file_path) {
              files.add(input.file_path);
            }
          }
        }
      }
    }
  }

  return [...files];
}

/**
 * Extract a summary from the last assistant message
 */
function extractLastSummary(transcript: TranscriptMessage[]): string {
  // Find last assistant message
  for (let i = transcript.length - 1; i >= 0; i--) {
    const msg = transcript[i];
    if (msg.role === 'assistant' && msg.content) {
      for (const block of msg.content) {
        if (block.type === 'text' && block.text) {
          // Take first 200 chars as summary
          const text = block.text.trim();
          if (text.length > 0) {
            return text.slice(0, 200) + (text.length > 200 ? '...' : '');
          }
        }
      }
    }
  }
  return '';
}

/**
 * Extract pending tasks from transcript (look for todo patterns)
 */
function extractPendingTasks(transcript: TranscriptMessage[]): string[] {
  const tasks: string[] = [];
  const taskPatterns = [
    /next:?\s*(.+)/i,
    /todo:?\s*(.+)/i,
    /remaining:?\s*(.+)/i,
    /still need to:?\s*(.+)/i,
  ];

  for (const msg of transcript) {
    if (msg.role === 'assistant' && msg.content) {
      for (const block of msg.content) {
        if (block.type === 'text' && block.text) {
          for (const pattern of taskPatterns) {
            const match = block.text.match(pattern);
            if (match && match[1]) {
              const task = match[1].trim();
              if (task.length > 0 && task.length < 200) {
                tasks.push(task);
              }
            }
          }
        }
      }
    }
  }

  return [...new Set(tasks)].slice(0, 5); // Dedupe and limit
}

async function main() {
  try {
    // Read hook payload
    const input = await readStdin();
    let payload: SessionEndPayload;

    try {
      payload = JSON.parse(input);
    } catch {
      console.error('[unified-session] SessionEnd: No valid payload');
      return;
    }

    // Try to read transcript for context extraction
    let files: Array<{ path: string; last_edit: string }> = [];
    let tasks: string[] = [];
    let focus = '';

    if (payload.transcript_path && existsSync(payload.transcript_path)) {
      try {
        const transcriptContent = readFileSync(payload.transcript_path, 'utf-8');
        const lines = transcriptContent.trim().split('\n');
        const transcript: TranscriptMessage[] = [];

        for (const line of lines) {
          try {
            transcript.push(JSON.parse(line));
          } catch {
            // Skip invalid lines
          }
        }

        if (transcript.length > 0) {
          const modifiedFiles = extractModifiedFiles(transcript);
          const now = new Date().toISOString();
          files = modifiedFiles.map((path) => ({ path, last_edit: now }));

          tasks = extractPendingTasks(transcript);
          focus = extractLastSummary(transcript);
        }
      } catch (error) {
        console.error(`[unified-session] Error reading transcript: ${error}`);
      }
    }

    // Save session state
    endSession(payload.session_id, {
      focus: focus || undefined,
      files: files.length > 0 ? files : undefined,
      tasks: tasks.length > 0 ? tasks : undefined,
    });

    // Create snapshot for active goal if one exists
    const state = getSessionState();
    if (state.active_context?.goal) {
      const goal = loadGoal(state.active_context.goal);
      if (goal) {
        const snapshot = createSnapshot(
          goal,
          'Session ended',
          focus || 'Session ended without explicit summary',
          'session_end'
        );
        goal.snapshots.push(snapshot.id);
        saveSnapshot(snapshot);
        saveGoal(goal);
      }
    }

    console.log('[unified-session] Session state saved');

  } catch (error) {
    // Fail silently to not block session end
    console.error(`[unified-session] SessionEnd error: ${error}`);
  }
}

main();
