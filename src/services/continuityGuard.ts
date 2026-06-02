/**
 * continuityGuard — runtime continuity detection for played lines
 * ---------------------------------------------------------------
 * David 2026-06-02: "continuity errors are important to look out for."
 *
 * The masterclass/pro-rep content is gated for continuity at BUILD time
 * (continuityPreflight in the loop audit, narrationAccuracy, lessonIntegrity,
 * middlegamePlanFenCoherence, …). But on a REAL device nothing re-checks a
 * line as the user actually plays it — and the players replay moves with a
 * silent `catch { break; }`, so a board jump (an illegal move from the prior
 * FEN, e.g. from an on-device data reconciliation that produced a bad line)
 * is swallowed: the lesson just stops, no signal.
 *
 * This guard runs a deterministic, read-only validation pass over a
 * `PlayableMiddlegameLine` (the WLPP rungs, gems, plan lines, common-mistake
 * lines all flow through `PlayableLinePlayer`). On any violation it emits a
 * `continuity-error` audit, which the analytics defect bridge forwards to
 * PostHog Error Tracking as an alertable issue — with the board FEN attached.
 *
 * Checks (all deterministic — no NLP, low false-positive):
 *   1. illegal-move        — a move isn't legal from the prior position
 *                            (board jump / field drift), or the start FEN is
 *                            itself unparseable.
 *   2. narration-misaligned— annotations / learnCues aren't parallel to moves
 *                            (a cue slid off its move).
 *   3. arrow-misaligned    — the lead arrow (arrows[i][0]) doesn't point at
 *                            move i's actual from→to.
 *
 * Contract: pure check + fire-and-forget report. Never throws.
 */
import { Chess } from 'chess.js';
import { logAppAudit } from './appAuditor';
import type { PlayableMiddlegameLine } from '../types';

export type ContinuityCode = 'illegal-move' | 'narration-misaligned' | 'arrow-misaligned';

export interface ContinuityViolation {
  code: ContinuityCode;
  /** Move index the violation occurred at, or -1 for whole-line issues. */
  moveIndex: number;
  detail: string;
}

export interface ContinuityContext {
  /** Component / surface that owns the line (audit `source`). */
  source: string;
  /** Optional opening id for triage (audit `context`). */
  openingId?: string;
}

/** A minimal structural view of a played line — `PlayableMiddlegameLine`
 *  satisfies it, so callers pass the line directly. */
export interface ContinuityLine {
  fen: string;
  moves: string[];
  title?: string;
  annotations?: string[];
  learnCues?: string[];
  arrows?: Array<Array<{ from: string; to: string }>>;
}

/** Deterministically validate a played line's continuity. Returns every
 *  violation found (empty array = clean). Pure — no side effects. */
export function checkLineContinuity(line: ContinuityLine): ContinuityViolation[] {
  const violations: ContinuityViolation[] = [];
  const n = line.moves.length;

  // 1. Narration / marker arrays must be parallel to the moves.
  if (line.annotations && line.annotations.length !== n) {
    violations.push({
      code: 'narration-misaligned',
      moveIndex: -1,
      detail: `annotations length ${line.annotations.length} ≠ moves length ${n}`,
    });
  }
  if (line.learnCues && line.learnCues.length !== n) {
    violations.push({
      code: 'narration-misaligned',
      moveIndex: -1,
      detail: `learnCues length ${line.learnCues.length} ≠ moves length ${n}`,
    });
  }

  // 2. Replay the line: every move legal from the prior FEN, and the lead
  //    arrow points at the move it accompanies.
  let chess: Chess;
  try {
    chess = new Chess(line.fen);
  } catch {
    violations.push({ code: 'illegal-move', moveIndex: -1, detail: `unparseable start FEN: ${line.fen}` });
    return violations;
  }

  for (let i = 0; i < n; i++) {
    const san = line.moves[i];
    let from: string;
    let to: string;
    try {
      const mv = chess.move(san);
      from = mv.from;
      to = mv.to;
    } catch {
      violations.push({
        code: 'illegal-move',
        moveIndex: i,
        detail: `"${san}" is illegal from ${chess.fen()}`,
      });
      // Subsequent positions are meaningless once the board diverges.
      break;
    }
    const lead = line.arrows?.[i]?.[0];
    if (lead && (lead.from !== from || lead.to !== to)) {
      violations.push({
        code: 'arrow-misaligned',
        moveIndex: i,
        detail: `lead arrow ${lead.from}-${lead.to} ≠ move ${san} (${from}-${to})`,
      });
    }
  }

  return violations;
}

/** Run the check and, on any violation, emit a `continuity-error` audit
 *  (fire-and-forget → also forwarded to PostHog Error Tracking). Returns the
 *  violations so callers/tests can assert. Never throws. */
export function reportLineContinuity(
  line: ContinuityLine,
  ctx: ContinuityContext,
): ContinuityViolation[] {
  let violations: ContinuityViolation[] = [];
  try {
    violations = checkLineContinuity(line);
    if (violations.length > 0) {
      void logAppAudit({
        kind: 'continuity-error',
        category: 'app',
        source: ctx.source,
        summary: `${violations.length} continuity violation(s) in "${line.title ?? 'line'}"`,
        details: violations.map((v) => `[${v.code} @${v.moveIndex}] ${v.detail}`).join('\n'),
        fen: line.fen,
        context: ctx.openingId,
      });
    }
  } catch {
    /* swallow — a detector must never break the surface it watches */
  }
  return violations;
}

/** Convenience overload for `PlayableMiddlegameLine` (the dominant shape). */
export function reportPlayableLineContinuity(
  line: PlayableMiddlegameLine,
  ctx: ContinuityContext,
): ContinuityViolation[] {
  return reportLineContinuity(line, ctx);
}
