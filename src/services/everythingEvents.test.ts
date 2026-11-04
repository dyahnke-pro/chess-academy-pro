// EVERY LINE A DECIDING PLACE WEIGHED IS REPORTED BY THE PLACE ITSELF
// (David 2026-11-04: "Unlock everything right now so we can actually build a
// proper narration plan"). Every printout built from a hand-written list of
// computers missed a class (the opening data, the engine's deep threats, the
// gems), so the run reads the app's own deciding places: each must report
// every fact it was handed — said and held, by the computer that made it.
// These tests fail on the code before the reporters existed: no row arrives.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn().mockResolvedValue({ evaluation: 30, bestMove: null, topLines: [] }),
  },
}));

import { emitEverything, onEverything, resetEverything, everythingListening, type EverythingRow } from './everythingEvents';
import { NO_PROOF } from './proof';
import { NAMES_NO_MOVE } from './studentMoveNaming';
import { claimKey } from './voicePackage';
import { decideTurn } from '../test/learnDoorFixtures';
import { reviewSegments, type ReplayGame } from '../test/replayGame';
import { generateReviewNarration, type ReviewMoveInput } from './coachFeatureService';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

function listen(): EverythingRow[] {
  const rows: EverythingRow[] = [];
  onEverything((r) => rows.push(r));
  return rows;
}

beforeEach(() => resetEverything());

describe('the leaf', () => {
  it('builds nothing while nobody listens, and numbers rows in arrival order', () => {
    expect(everythingListening()).toBe(false);
    emitEverything({ surface: 'learn', door: 'moment', lines: [{ computer: 'x', text: 'a', said: true, why: null }] });
    const rows = listen();
    expect(everythingListening()).toBe(true);
    emitEverything({ surface: 'learn', door: 'moment', lines: [{ computer: 'x', text: 'a', said: true, why: null }] });
    emitEverything({ surface: 'learn', door: 'moment', lines: [{ computer: 'x', text: 'b', said: false, why: 'held' }] });
    expect(rows.map((r) => r.seq)).toEqual([1, 2]);
  });
});

describe('the Learn door reports every fact it weighed', () => {
  it('said and held, each by its computer, held with the door\'s own reason', () => {
    const rows = listen();
    const SAID = 'already-heard:e5';
    decideTurn([
      { id: 'a', lane: 'fundamental', role: 'teach', text: 'Mark it: your knight on f3 attacks the pawn on e5.', fen: FEN, proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE },
      { id: 'b', lane: 'planArc', role: 'teach', text: 'Their pawn on e5 is the target of the whole plan.', fen: FEN, claims: [SAID], proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE },
    ], undefined, new Set([claimKey(SAID)]));
    const row = rows.find((r) => r.door === 'learn-turn');
    expect(row, 'the Learn door reported nothing').toBeDefined();
    expect(row?.lines).toHaveLength(2);
    expect(row?.lines.every((l) => l.computer.length > 0)).toBe(true);
    expect(row?.lines.find((l) => l.text.startsWith('Mark it'))?.said).toBe(true);
    const held = row?.lines.find((l) => l.text.startsWith('Their pawn'));
    expect(held?.said).toBe(false);
    expect(held?.why, 'a held line must carry the door\'s reason').toBeTruthy();
    expect(row?.at?.fen).toBe(FEN);
  });
});

describe('Review reports its moment door and its composer, move by move', () => {
  it('the Gotham game: every Review move\'s facts arrive, said and held, by computer', () => {
    const game = JSON.parse(readFileSync('src/test/fixtures/gotham-jelena.json', 'utf8')) as ReplayGame;
    const rows = listen();
    reviewSegments(game, 1500);
    const doors = new Set(rows.map((r) => r.door));
    expect(doors.has('moment'), 'the moment door reported nothing').toBe(true);
    expect(doors.has('composer'), 'the composer reported nothing').toBe(true);
    const lines = rows.flatMap((r) => r.lines);
    expect(lines.some((l) => l.said)).toBe(true);
    expect(lines.some((l) => !l.said && !!l.why), 'no held line carried its reason').toBe(true);
    expect(lines.every((l) => l.computer.trim().length > 0)).toBe(true);
  }, 60_000);
});

describe('the finished Review walk reports every line it says, with the facet that said it', () => {
  it('one walk row per narrated move, at that move\'s board', async () => {
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6', 'Nc3', 'Nf6'];
    const c = new Chess();
    const moves: ReviewMoveInput[] = sans.map((san, i) => {
      c.move(san);
      return { ply: i + 1, san, isCoachMove: (i + 1) % 2 === 0, classification: 'book', evaluation: -20, preMoveEval: -20, bestMove: null, fenAfter: c.fen() } as unknown as ReviewMoveInput;
    });
    const rows = listen();
    const n = await generateReviewNarration({ moves, playerColor: 'white', openingName: null, result: '1-0', playerRating: 1500, coachNarration: 'silent', uncapped: true });
    const walk = rows.filter((r) => r.door === 'review-walk');
    const narrated = n.segments.filter((s) => (s.narration ?? '').trim());
    expect(walk.length).toBe(narrated.length);
    for (const r of walk) {
      const seg = n.segments.find((s) => s.ply === r.at?.ply);
      expect(seg?.fenAfter).toBe(r.at?.fen);
      expect(r.lines.every((l) => l.said && l.text.length > 0 && !l.text.includes('['))).toBe(true);
    }
  }, 60_000);
});
