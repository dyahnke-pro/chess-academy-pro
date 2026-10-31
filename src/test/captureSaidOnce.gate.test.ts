import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';
import { afterCapture, NO_PREV_CAPTURE, type PrevCaptureContext } from '../services/captureRun';
import { moveThoughtFacts } from '../services/moveThoughtFacts';
import { buildReviewMoveBriefing, moveAspects } from '../services/reviewMoveBriefing';
import { moveJob, MINE, THEIRS, type PriorCapture } from '../services/bookMoveWhy';
import { plyFactsForMove, plyFactsClause } from '../services/pvPlayback';
import { seatMoveSubject } from '../services/reviewFullData';
import { moveWhy, bestMoveReason } from '../services/deliberation';
import { detectNewThreat } from '../services/groundedAnswer';
import { goodButWeakerBeat } from '../services/drillReasons';
import { counterThreat, counterThreatLine } from '../services/counterThreat';
import { findPinBreaks, pinBreakLine } from '../services/pinBreak';
import { threatProof } from '../services/threatProof';
import { captureLeadsTo } from '../services/captureLeadsTo';
import { afterCaptureSan } from '../utils/captureWords';

// SAY A CAPTURE ONCE (WO-STORY-MATRIX-01 Phase 1 step 4; David 2026-10-30:
// "Redundant to say Qxd8 (narrated like: queen takes d8, takes the queen)").
// The voice reads a capture's SAN as one — "Qxd8" is "queen takes d 8" — so a
// line that names the move and then "takes the queen", "wins their pawn on c5"
// or "captures the pawn" says the capture twice. The Danya bench found it on
// 69 of 748 lines from some ten producers. Every producer now says a capture
// through `captureWords` (after the SAN: what it leads to; or in piece words
// with no SAN), and this gate runs the REAL producers over every capture of
// real master games and fails on any line that says one twice.

// ── THE DEFECT, READ OFF A LINE ─────────────────────────────────────────────
// A move written in the line: a capture SAN, any other piece move or
// castling, or a capture already said in words ("the knight takes e5" — the
// spoken form `sayMoveClause` writes). A bare square is never a move token:
// "on e5" is a square, and a pawn push cannot be told from it.
const MOVE_TOKEN = /(?<![A-Za-z0-9-])(?:…|\.\.\.)?(?:([KQRBN][a-h]?[1-8]?x[a-h][1-8]|[a-h]x[a-h][1-8])|[KQRBN][a-h]?[1-8]?[a-h][1-8]|O-O(?:-O)?)(?:=[QRBN])?[+#]?(?![A-Za-z0-9-])|\b(?:[a-h]-)?(?:king|queen|rook|bishop|knight|pawn) (?:takes|taking on) ([a-h][1-8])\b/gi;
/** A capture verb on the piece it takes ("wins the pawn", "takes their knight
 *  on c5" — a piece on ANOTHER square is another capture, "taking their bishop
 *  on d3 a move later"), on its square, on "it" — or the capture SAN as the
 *  subject of a second capture verb ("Ncxd4 takes again"). Net material said
 *  as a count after the SAN ("Bxc5 wins a pawn") is what the capture leads
 *  to, and passes. */
const VERB_ON_VICTIM = /\b(?:takes?|took|taking|captures?|captured|capturing|wins?|won|winning|grabs?|grabbed|grabbing|snaps? up|snapped up|snapping up|picks? (?:up|off)|picked (?:up|off)|picking (?:up|off)|collects?|collected|collecting|recaptures?|recaptured|recapturing)\s+(back\s+)?(?:the|their|your)\s+(?:[a-h]-)?(?:pawn|knight|bishop|rook|queen|piece)s?\b(?!\s+pair)(?:\s+on\s+([a-h][1-8]))?/gi;
const VERB_ON_SQUARE = /\b(?:takes?|taking|captures?|capturing|recaptures?|recapturing)\s+(back\s+)?on\s+([a-h][1-8])\b/gi;
const VERB_ON_IT = /\b(?:takes?|taking|captures?|capturing|grabs?|grabbing|wins?|winning)\s+it\b/gi;
const SAN_AS_SUBJECT = /^\s+(?:takes|captures|recaptures|grabs|took)\b/i;
/** Another piece doing the capture, said in words — a different capture. */
const PIECE_SUBJECT = /\b(?:the|their|your|his|her)\s+(?:[a-h]-)?(?:king|queen|rook|bishop|knight|pawn)s?\b/i;
const PRONOUN_SUBJECT = /\b(?:you|they|white|black|he|she|we)\b/i;

interface Token { at: number; end: number; capture: boolean; square: string | null; pawn: boolean }

function tokens(sentence: string): Token[] {
  const out: Token[] = [];
  for (const m of sentence.matchAll(MOVE_TOKEN)) {
    const capSan = m[1] as string | undefined;
    const spokenSq = m[2] as string | undefined;
    const capture = !!capSan || !!spokenSq;
    const square = capSan ? capSan.slice(-2) : spokenSq ?? null;
    out.push({ at: m.index, end: m.index + m[0].length, capture, square, pawn: !!capSan && /^[a-h]/.test(capSan) });
  }
  return out;
}

/** The capture a token made took the piece on `sq` — its own square, or the
 *  pawn beside it en passant. */
function tookOn(t: Token, sq: string): boolean {
  if (!t.square) return true;
  return sq === t.square || (t.pawn && sq[0] === t.square[0] && Math.abs(Number(sq[1]) - Number(t.square[1])) === 1);
}

/** Every place a line says a capture twice, as the clause that does. */
function doubledCaptures(line: string): string[] {
  const hits: string[] = [];
  for (const sentence of line.split(/(?<=[.!?;])\s+/)) {
    const toks = tokens(sentence);
    for (const t of toks) {
      if (t.capture && SAN_AS_SUBJECT.test(sentence.slice(t.end))) hits.push(sentence.slice(t.at, t.end + 14));
    }
    const check = (re: RegExp, squareOf: ((m: RegExpMatchArray) => string | null) | null): void => {
      for (const m of sentence.matchAll(re)) {
        const at = m.index;
        const before = toks.filter((t) => t.end <= at);
        const t = before[before.length - 1] as Token | undefined;
        if (!t?.capture) continue;
        const sq = squareOf ? squareOf(m) : null;
        if (sq && !tookOn(t, sq)) continue;
        const between = sentence.slice(t.end, at);
        if (PIECE_SUBJECT.test(between)) continue;
        if (m[1] && PRONOUN_SUBJECT.test(between)) continue;
        hits.push(sentence.slice(t.at, at + m[0].length));
      }
    };
    check(VERB_ON_VICTIM, (m) => (m[2] as string | undefined) ?? null);
    check(VERB_ON_SQUARE, (m) => (m[2] as string | undefined) ?? null);
    check(VERB_ON_IT, null);
  }
  return hits;
}

describe('the detector reads the defect, and only the defect', () => {
  it('flags every shape the bench found', () => {
    for (const bad of [
      'You play Bxc5 — it wins the pawn.',
      'They play Bxf3 — it takes back the bishop and wins the bishop pair.',
      'Your …Bxc5 wins their pawn on c5, and nothing can take back.',
      'Your cxd4 captures the pawn and opens the c-file.',
      'The move is Qxe8 — it wins the queen on e8.',
      "You're now threatening Nxf7 — it wins the pawn on f7 and forks the queen on d8 and rook on h8.",
      'They play cxd4 — it takes back the pawn, but …Ncxd4 takes again.',
      'You play Nxd4 — it takes on d4 and hits their queen on d8 and rook on a8 at once.',
      'The bishop takes e5 is a good move — it wins the knight.',
      'and Bxf3 takes it — the knight falls.',
      'exd6 wins the pawn on d5 en passant.',
    ]) expect(doubledCaptures(bad), bad).not.toEqual([]);
  });
  it('lets a capture said once through', () => {
    for (const good of [
      'You play Bxc5 — it wins a pawn, and nothing can take back.',
      'Bxf7+ — if the king takes, your queen takes theirs on d8: the king was its only guard.',
      'They play Bxf3 — it completes the trade and wins the bishop pair.',
      'Nxe5 — but their queen takes back, and you give up more than you win.',
      'Your queen takes theirs on d8.',
      'You play Rxf2, taking their bishop on d3 a move later, where it hits their queen on e3.',
      'Bxh4 wins a bishop outright — you cannot take back enough.',
      'exd6 — the pawn on d5 is gone.',
      'You play Re8 — it takes the half-open e-file, where the rook belongs.',
      'You play Bxc5, and they take back on c5 with the knight.',
    ]) expect(doubledCaptures(good), good).toEqual([]);
  });
});

// ── THE PRODUCERS, OVER REAL GAMES ──────────────────────────────────────────
interface Ply { game: number; gameId: string; fenBefore: string; fenAfter: string; san: string; mover: 'w' | 'b'; prev: PrevCaptureContext; line: string[]; theirLast: { fenBefore: string; san: string } | null; prior: PriorCapture | null; captured: boolean }

/** Every ply of the first `games` master games the app ships, and of the
 *  games named in `also`. */
function realPlies(games: number, also: readonly string[]): Ply[] {
  const all = JSON.parse(readFileSync(resolve(__dirname, '../data/model-games.json'), 'utf8')) as Array<{ id: string; pgn: string }>;
  const out: Ply[] = [];
  for (const [game, g] of all.entries()) {
    if (game >= games && !also.includes(g.id)) continue;
    const c = new Chess();
    try { c.loadPgn(g.pgn); } catch { continue; }
    const sans = c.history();
    const b = new Chess();
    let prev = NO_PREV_CAPTURE;
    let last: { fenBefore: string; san: string; to: string; captured?: string; promoted: boolean } | null = null;
    for (const [i, san] of sans.entries()) {
      const fenBefore = b.fen();
      const m = b.move(san);
      out.push({
        game, gameId: g.id, fenBefore, fenAfter: b.fen(), san: m.san, mover: m.color, prev, line: sans.slice(i + 1, i + 13),
        theirLast: last ? { fenBefore: last.fenBefore, san: last.san } : null,
        prior: last?.captured ? { to: last.to as PriorCapture['to'], captured: last.captured as PriorCapture['captured'], promoted: last.promoted } : null,
        captured: !!m.captured,
      });
      prev = afterCapture(prev, m);
      last = { fenBefore, san: m.san, to: m.to, captured: m.captured, promoted: !!m.promotion };
    }
  }
  return out;
}

type Producer = (p: Ply) => Array<string | null | undefined>;
const lineSan = (p: Ply): string => `${p.mover === 'b' ? '…' : ''}${p.san}`;
/** Which plies a producer runs on: every capture, or every ply of the first
 *  N games and of one named game (a producer that speaks about a threat or a
 *  pin, not the move's own capture). */
type Plies = 'captures' | { games: number; also?: readonly string[] };
/** The one game among the first 24 where a pin breaks with a capture (…Bb5,
 *  the rook on e5 walks out with a discovered attack). */
const PIN_BREAK_GAME = 'mg-lichess-aZ6oVKX6';
/** Two games among the first 24 where a move threatens a capture that wins
 *  material ("threatening Bxe5 — it …") — the first six hold only one such
 *  threat, so without these the threat test passed on the old wording. */
const THREAT_GAMES = ['mg-lichess-BfvmTiCI', 'mg-caro-tartakower'];
const PRODUCERS: Record<string, { plies: Plies; run: Producer }> = {
  // The one composer's facts — every lesson, Learn and Review line.
  moveThoughtFacts: {
    plies: 'captures',
    run: (p) => [true, false].flatMap((seat) => moveThoughtFacts({ fenBefore: p.fenBefore, san: p.san, moverIsStudent: seat, prev: p.prev, line: p.line, theirLast: p.theirLast, phrases: null })
      .flatMap((f) => [f.text, f.alsoText])),
  },
  reviewMoveBriefing: {
    plies: 'captures',
    run: (p) => [true, false, undefined].map((seat) => buildReviewMoveBriefing({ fenBefore: p.fenBefore, san: p.san, prev: p.prev, moverIsStudent: seat, line: p.line, theirLast: p.theirLast, phrases: null, criticalMoment: true })),
  },
  moveAspects: {
    plies: 'captures',
    run: (p) => (moveAspects({ fenBefore: p.fenBefore, san: p.san, prev: p.prev, moverIsStudent: true })?.aspects ?? [])
      .flatMap((a) => [`You play ${p.san}, ${a.text}.`, `You play ${p.san} — it ${a.verb}.`]),
  },
  // The move's job, said after its SAN by every caller.
  moveJob: {
    plies: 'captures',
    run: (p) => [MINE, THEIRS].flatMap((w) => {
      const j = moveJob(p.fenBefore, p.san, p.mover, w, p.prior);
      return j ? [j.clause, j.compact, ...(j.forms ?? [])].filter((x): x is string => !!x).map((c) => `${lineSan(p)} — ${c}.`) : [];
    }),
  },
  // Review's inventory line ("Your cxd4 …") and the engine line's clause.
  plyFacts: {
    plies: 'captures',
    run: (p) => [
      plyFactsForMove(p.fenBefore, p.san, p.prev),
      ...[true, false].map((s) => { const m = plyFactsForMove(p.fenBefore, p.san, p.prev); return m ? seatMoveSubject(m, s) : null; }),
      plyFactsForMove(p.fenBefore, p.san, p.prev, true),
      plyFactsForMove(p.fenBefore, p.san, p.prev, false),
      ((): string | null => { const c = plyFactsClause(p.fenBefore, p.san, { prev: p.prev, sanSaid: true }); return c ? `${p.san} — it ${c}.` : null; })(),
      ((): string | null => { const c = plyFactsClause(p.fenBefore, p.san, { prev: p.prev, victimOwner: 'your', sanSaid: false }); return c ? `Your opponent ${c}.` : null; })(),
    ],
  },
  // The deliberation's reasons: "The move is X — it …".
  deliberation: {
    plies: 'captures',
    run: (p) => {
      const lastSan = p.theirLast?.san ?? null;
      const w = moveWhy(p.fenBefore, p.san, p.mover, lastSan);
      const b = bestMoveReason(p.fenBefore, p.san, p.mover, { mateIn: null, opponentLastSan: lastSan });
      return [w ? `The move is ${p.san} — it ${w}.` : null, b ? `The move is ${p.san} — it ${b}.` : null];
    },
  },
  // The threat a move makes, said "threatening <SAN> — <detail>" everywhere.
  threat: {
    plies: { games: 6, also: THREAT_GAMES },
    run: (p) => { const t = detectNewThreat(p.fenBefore, p.fenAfter, p.mover); return t ? [`You're now threatening ${t.san} — it ${t.detail}.`] : []; },
  },
  drillReasons: {
    plies: 'captures',
    run: (p) => [goodButWeakerBeat({ fenBefore: p.fenBefore, wrongSan: p.san, evalAfterWrong: p.mover === 'w' ? 400 : -400, evalAfterBest: p.mover === 'w' ? 900 : -900 })],
  },
  counterThreat: {
    plies: { games: 6 },
    run: (p) => { const c = counterThreat(p.fenBefore, p.san); return c ? [counterThreatLine(c, true), counterThreatLine(c, false)] : []; },
  },
  pinBreak: {
    plies: { games: 6, also: [PIN_BREAK_GAME] },
    run: (p) => findPinBreaks(p.fenAfter).flatMap((b) => [pinBreakLine(b, 'w'), pinBreakLine(b, 'b')]),
  },
  // The threat against the student after their opponent's move.
  threatProof: {
    plies: { games: 6 },
    run: (p) => {
      const student: 'w' | 'b' = p.mover === 'w' ? 'b' : 'w';
      const squares = new Chess(p.fenAfter).board().flat().flatMap((s) => (s && s.color === student ? [s.square] : []));
      const pr = threatProof(p.fenAfter, student, squares);
      return pr ? [pr.short, pr.full] : [];
    },
  },
  // What a capture leads to, rendered after its SAN in both forms.
  captureLeadsTo: {
    plies: 'captures',
    run: (p) => { const l = captureLeadsTo(p.fenBefore, p.san); return l ? [`${p.san} — it ${afterCaptureSan(l, 'verb')}.`, `You play ${p.san}, ${afterCaptureSan(l, 'participle')}.`] : []; },
  },
};

// Every capture of 12 games, some 200 (CAPTURE_GATE_GAMES widens it).
const CAPTURE_GAMES = Number(process.env.CAPTURE_GATE_GAMES ?? 12);
const PLIES = realPlies(CAPTURE_GAMES, [PIN_BREAK_GAME, ...THREAT_GAMES]);

describe('every producer says a capture once, on every capture of real games', () => {
  it('the corpus is real and holds captures', () => {
    expect(PLIES.filter((p) => p.captured).length).toBeGreaterThan(150);
  });
  for (const [name, producer] of Object.entries(PRODUCERS)) {
    it(`${name}: no line says its capture twice`, () => {
      const scanned: string[] = [];
      let saysCapture = 0;
      const bad: string[] = [];
      // A producer that throws says nothing, and nothing said cannot be
      // doubled: a throw is a failure here, never a silent pass.
      const threw: string[] = [];
      for (const p of PLIES) {
        const pl = producer.plies;
        if (pl === 'captures'
          ? !p.captured || (p.game >= CAPTURE_GAMES && p.gameId !== PIN_BREAK_GAME)
          : p.game >= pl.games && !(pl.also ?? []).includes(p.gameId)) continue;
        let lines: Array<string | null | undefined> = [];
        try { lines = producer.run(p); } catch (e) { threw.push(`${p.fenBefore} ${p.san}: ${String(e)}`); }
        for (const l of lines) {
          if (!l) continue;
          scanned.push(l);
          if (tokens(l).some((t) => t.capture)) saysCapture += 1;
          for (const hit of doubledCaptures(l)) bad.push(`${p.fenBefore} ${p.san}: ${hit}   «${l}»`);
        }
      }
      // NOT VACUOUS: the producer spoke, and spoke about captures.
      expect(scanned.length, `${name} produced no lines`).toBeGreaterThan(0);
      expect(saysCapture, `${name} said no capture`).toBeGreaterThan(0);
      if (process.env.CAPTURE_GATE_REPORT) console.log(`${name}: ${scanned.length} lines scanned, ${saysCapture} say a capture, ${bad.length} doubled\n${bad.slice(0, 25).join('\n')}`);
      expect(threw, `${name} threw`).toEqual([]);
      expect(bad, `${name}: ${bad.length} lines say a capture twice`).toEqual([]);
    }, 300_000);
  }
});
