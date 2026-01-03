#!/usr/bin/env bun
/**
 * SessionStart Hook
 *
 * Loads session context and generates resume prompt for Claude.
 * Triggered when a new Claude Code session starts.
 * Detects project from cwd and shows project-specific goals.
 */

import { startSession, generateStartContext } from '../storage/session-service';
import { ensureDirectories } from '../lib/paths';

interface SessionStartPayload {
  session_id: string;
  cwd: string;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function main() {
  try {
    // Ensure directories exist
    ensureDirectories();

    // Read hook payload
    const input = await readStdin();
    let payload: SessionStartPayload;

    try {
      payload = JSON.parse(input);
    } catch {
      // No payload or invalid JSON, generate context anyway
      payload = { session_id: 'unknown', cwd: process.cwd() };
    }

    // Start/update session
    startSession(payload.session_id);

    // Generate and output context for Claude (with cwd for project detection)
    const context = generateStartContext(payload.cwd);
    console.log(context);

  } catch (error) {
    // Fail silently to not block session start
    console.error(`[unified-session] SessionStart error: ${error}`);
  }
}

main();
