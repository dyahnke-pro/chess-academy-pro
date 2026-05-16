#!/usr/bin/env node
// scripts/audit-kid-static.mjs
// ----------------------------------------------------------------------
// Static contract audit for the kids section. No browser, no network —
// pure source-file scanning. Asserts the non-negotiables documented in
// CLAUDE.md "Kids section — non-negotiables".
//
// Findings are bucketed by severity:
//   - error   → contract violation; CI gate, exit code 1
//   - warn    → likely violation but allowed in edge cases; logged
//   - info    → contextual signal, no action needed
//
// Run: node scripts/audit-kid-static.mjs
//   or: npm run kid:audit-static
//
// Pair with scripts/audit-kid-section.mjs for the runtime side.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KID_DIR = join(ROOT, 'src/components/Kid');
const SERVICES_DIR = join(ROOT, 'src/services');

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

const errors = [];
const warnings = [];
const info = [];

function add(bucket, file, message) {
  bucket.push({ file: relative(ROOT, file), message });
}

// ─── Contract #1: getCoachChatResponse import banned in Kid surfaces ──
// Non-negotiable #3 — every kid LLM call must go through
// getKidLlmResponse, which pins skipPersonality: true.
const kidSourceFiles = walk(KID_DIR).filter(
  (f) => /\.(ts|tsx)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f),
);
for (const f of kidSourceFiles) {
  const src = readFileSync(f, 'utf8');
  if (/from ['"][^'"]*coachApi['"]/.test(src) && /getCoachChatResponse/.test(src)) {
    add(errors, f, 'imports getCoachChatResponse — must use getKidLlmResponse');
  }
}

// Same check, scoped to kid-related services: kidPuzzleService et al.
// MUST call getKidLlmResponse, not getCoachChatResponse.
const kidServiceFiles = readdirSync(SERVICES_DIR)
  .filter((f) => /^(kid|Kid)/.test(f) && /\.ts$/.test(f) && !/\.test\.ts$/.test(f))
  .map((f) => join(SERVICES_DIR, f));
for (const f of kidServiceFiles) {
  const src = readFileSync(f, 'utf8');
  if (/getCoachChatResponse/.test(src)) {
    add(errors, f, 'kid-prefixed service uses getCoachChatResponse — must use getKidLlmResponse');
  }
}

// ─── Contract #12: KidChessboard is the only board under /kid/* ───────
// Direct imports of Board/ChessBoard, Board/ControlledChessBoard, or
// react-chessboard from src/components/Kid/ are banned.
for (const f of kidSourceFiles) {
  const src = readFileSync(f, 'utf8');
  if (/from ['"]\.\.\/Board\/ChessBoard['"]/.test(src)) {
    add(errors, f, 'imports Board/ChessBoard directly — use KidChessboard');
  }
  if (/from ['"]\.\.\/Board\/ControlledChessBoard['"]/.test(src)) {
    add(errors, f, 'imports Board/ControlledChessBoard directly — use KidChessboard');
  }
  if (/from ['"]react-chessboard['"]/.test(src) && !/SquareHandlerArgs/.test(src)) {
    add(errors, f, 'imports react-chessboard directly — use KidChessboard');
  }
}

// ─── Contract #11: bottom-nav phantom padding ─────────────────────────
// /kid/* routes are siblings of AppLayout — no bottom nav renders.
// pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] reserves dead space.
for (const f of kidSourceFiles) {
  const src = readFileSync(f, 'utf8');
  if (/pb-\[calc\(6\.5rem/.test(src)) {
    add(warnings, f, 'uses pb-[calc(6.5rem...)] — kid routes have no bottom nav (consider pb-6)');
  }
}

// ─── Contract #9: no setView-based navigation ─────────────────────────
// Every kid hub must route via React Router, not in-place setView.
// Top-level KidView state is allowed only for non-navigation cases
// (e.g. KidModePage's findKing toggle — not a hub).
for (const f of kidSourceFiles) {
  const src = readFileSync(f, 'utf8');
  // Hub-shaped setView would import a child game and render conditionally.
  if (/setView\(['"](bishopVsPawns|colorWars|kingEscape|kingMarch)/.test(src)) {
    add(errors, f, 'uses setView for hub navigation — must route via React Router');
  }
}

// ─── Contract #10: useBoardContext not used in kid surfaces ───────────
// Kid mode never reads from / writes to coach state.
for (const f of kidSourceFiles) {
  const src = readFileSync(f, 'utf8');
  if (/useBoardContext/.test(src)) {
    add(warnings, f, 'uses useBoardContext — kid mode should not touch coach board state');
  }
}

// ─── Contract #5: no per-move praise (banned acknowledgment phrases) ──
// Praise only at milestones. Per-move triggers (after each chess move
// the kid makes) should not speak praise. We can't tell intent from
// static source perfectly, so flag known offender phrases for review.
const BANNED_PHRASES = [
  /'(Great|Amazing|Awesome|Excellent|Wow|Fantastic|Perfect|Brilliant|Super)\b[^']*'/gi,
  /"(Great|Amazing|Awesome|Excellent|Wow|Fantastic|Perfect|Brilliant|Super)\b[^"]*"/gi,
];
for (const f of kidSourceFiles) {
  const src = readFileSync(f, 'utf8');
  for (const phrase of BANNED_PHRASES) {
    phrase.lastIndex = 0; // reset for each file
    let match;
    while ((match = phrase.exec(src)) !== null) {
      const idx = match.index;
      const before = src.slice(Math.max(0, idx - 200), idx);
      if (/voiceService\.(speak|speakAlert|speakForced)\s*\(/.test(before)
        || /kidSpeak\s*\(\s*['"`]/.test(before)
        || /CORRECT_MESSAGES|CELEBRATION_MESSAGES|MILESTONE/.test(before)) {
        add(warnings, f, `acknowledgment phrase routed to voice: ${match[0].slice(0, 50)}…`);
      }
    }
  }
}

// ─── Info: list every kid LLM call site that DOES use getKidLlmResponse
// (sanity that the wrapper is being adopted as expected).
for (const f of kidServiceFiles) {
  const src = readFileSync(f, 'utf8');
  if (/getKidLlmResponse/.test(src)) {
    add(info, f, 'uses getKidLlmResponse ✓');
  }
}

// ─── Contract #14: legacy /kid/mini-games not referenced ──────────────
// Phase 5 renamed to /kid/pawn-games. References should redirect via
// router or be removed.
for (const f of kidSourceFiles) {
  const src = readFileSync(f, 'utf8');
  if (/['"`]\/kid\/mini-games(?!\/[^'"`]*$)/.test(src)) {
    // Match /kid/mini-games or /kid/mini-games/whatever as a string lit
    if (/navigate\(['"`]\/kid\/mini-games/.test(src)) {
      add(errors, f, 'navigates to legacy /kid/mini-games — should be /kid/pawn-games');
    }
  }
}

// ─── Report ───────────────────────────────────────────────────────────
console.log('\n=== Kids section — static audit ===\n');
console.log(`Files scanned: ${kidSourceFiles.length} kid components + ${kidServiceFiles.length} kid-prefixed services\n`);

if (errors.length > 0) {
  console.log(`❌ ERRORS (${errors.length}):`);
  for (const e of errors) console.log(`  ${e.file}: ${e.message}`);
  console.log('');
}
if (warnings.length > 0) {
  console.log(`⚠️  WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log(`  ${w.file}: ${w.message}`);
  console.log('');
}
if (info.length > 0) {
  console.log(`ℹ️  INFO (${info.length}):`);
  for (const i of info) console.log(`  ${i.file}: ${i.message}`);
  console.log('');
}

console.log(`Summary: ${errors.length} errors, ${warnings.length} warnings, ${info.length} info`);
if (errors.length > 0) process.exit(1);
