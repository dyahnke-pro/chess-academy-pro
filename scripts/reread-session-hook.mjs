#!/usr/bin/env node
/**
 * reread-session-hook — SessionStart(compact) hook. On a context reset it
 * injects a directive to reread the full session transcript before continuing
 * the voiced-narration HAND-authoring work (David 2026-08-25, non-negotiable:
 * "Every time your context resets I want you to read this entire session for
 * context").
 *
 * Wired ONLY from .claude/settings.local.json (gitignored, this container only)
 * so it never fires for other sessions on this repo. This script is inert
 * unless that local hook invokes it.
 */
let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  let j = {};
  try { j = JSON.parse(data); } catch { /* no stdin payload */ }
  const tp = j.transcript_path
    || '/root/.claude/projects/-home-user-chess-academy-pro/c28ca97f-1531-571c-af53-a425646f387d.jsonl';
  const additionalContext =
    'NON-NEGOTIABLE (David 2026-08-25): before continuing the voiced-narration '
    + 'HAND-authoring work, REREAD THE ENTIRE SESSION TRANSCRIPT at ' + tp
    + ' for full context. The narrations are hand-written by you — ZERO LLM, '
    + 'nothing dropped (rephrase, never drop). The video makes the opening line; '
    + 'our teaching is matched to it move-by-move, board-true, with the '
    + 'hypothetical lines kept. These feed teach-me-X, matchups, and Tier-1 '
    + 'free-play/review/tactics — the most important coach teaching data.';
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext },
  }));
});
