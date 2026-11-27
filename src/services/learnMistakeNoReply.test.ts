// THE MISTAKE TURN IS WRITTEN WHEN NO REPLY COMES (the sicilianClosed1000
// replay, lichess vvidmF0a: the mistake-lesson rows came out 11 where the
// game holds 12 mistake turns). The turn — their pending lesson, then the
// student's — was composed only inside the coach's reply branch, so a game
// that ended on the student's move lost its last turn: their 32.Rf6 (a
// blunder that walks into mate in two) was never written, because the
// student's 32…Rc1+ was the game's last move and no reply followed.
//
// Decided at the root: the row is one per mistake turn, spoken or not, so the
// turn is composed on the student's move whether or not a reply comes. The
// pure door already takes a missing reply (`theirReplySan: null`); the page's
// no-reply branch now calls it.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';
import games from '../test/fixtures/learn-replay-games.json';

const audit = vi.hoisted(() => ({ rows: [] as Array<{ kind: string; context?: string }> }));
vi.mock('./appAuditor', () => ({ logAppAudit: (e: { kind: string; context?: string }) => { audit.rows.push(e); return Promise.resolve(); } }));

import { learnMistakeTurns, type TurnRead } from './learnMistakeTurn';

interface FixLine { uci: string; cp: number | null; mate: number | null; pv: string[] }
const game = (games as { games: Array<{ id: string; sans: string[]; reads: Array<{ before: FixLine[]; after: FixLine[] }> }> }).games.find((g) => g.id === 'sicilianClosed1000');
if (!game) throw new Error('fixture game missing');
const fenAt = (ply: number): string => { const c = new Chess(); for (const san of game.sans.slice(0, ply)) c.move(san); return c.fen(); };
const MATE_CP = 100_000;
const toRead = (lines: FixLine[]): TurnRead => ({
  isMate: lines[0].mate !== null,
  mateIn: lines[0].mate,
  evaluation: lines[0].cp ?? (lines[0].mate !== null && lines[0].mate > 0 ? MATE_CP : -MATE_CP),
  topLines: lines.map((l) => ({ evaluation: l.cp ?? 0, mate: l.mate, moves: l.pv })),
});

describe('the last mistake turn of a game with no reply', () => {
  it('their 32.Rf6 is composed and its row written on the student\'s 32…Rc1+', () => {
    audit.rows.length = 0;
    const theirs = game.reads[62];   // ply 63, White's Rf6
    const yours = game.reads[63];    // ply 64, Black's Rc1+ — the game's last move
    // Rf6 costs White a won-for-Black ending into a mate: best h4 -474, after
    // Rf6 Black mates in two.
    const cost = 2000;
    const turn = learnMistakeTurns({
      pending: {
        fenBefore: fenAt(62), playedSan: 'Rf6', moverColor: 'white', before: toRead(theirs.before), after: toRead(theirs.after),
        costCp: cost, bestSan: 'h4', priorMove: null, ply: 63, fenAfter: fenAt(63),
      },
      pendingOnBoard: true,
      yours: {
        fenBefore: fenAt(63), playedSan: 'Rc1+', moverColor: 'black', before: toRead(yours.before), after: toRead(yours.after),
        costCp: 0, bestSan: 'Rc1+', priorMove: null, theirReplySan: null, ply: 64,
      },
      fenAfterReply: fenAt(64), student: 'b', holdOf: () => undefined, memory: null, focusOwnsMove: false,
    });
    const rows = audit.rows.filter((r) => r.kind === 'mistake-lesson').map((r) => JSON.parse(r.context ?? '{}') as { seat: string });
    expect(rows.map((r) => r.seat)).toContain('them');
    expect(turn.memory).toBeTruthy();
  });

  it('the Learn page composes the turn in its no-reply branch', () => {
    const page = readFileSync(resolve(__dirname, '../components/Coach/CoachTeachPage.tsx'), 'utf8');
    const at = page.indexOf('// No legal coach reply (game over)');
    expect(at).toBeGreaterThan(0);
    const branch = page.slice(at, page.indexOf('gameOverStep: true', at));
    expect(branch).toMatch(/learnMistakeTurns\(\{/);
    expect(branch).toMatch(/theirReplySan: null/);
    expect(branch).toMatch(/channel: 'mistake'/);
  });
});
