// The 202-board test's read of ONE board, composed exactly as
// scripts/board-read-stored.ts composes it, over a reader the caller supplies.
// `fixtureReader` serves recorded engine reads and THROWS on a board it was
// never given — a read the fixture lacks is a loud failure, never a silent null.
import { Chess } from 'chess.js';
import { boardReadFacts } from '../services/boardReadFacts';
import { decideRead, readContextOf } from '../services/readDecider';
import { readHasShot } from '../services/positionReadComposer';
import type { AnalysisLine } from '../types';

export const readKey = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');
export type Reads = Record<string, AnalysisLine[]>;
export type Reader = (fen: string) => Promise<AnalysisLine[] | null>;

export interface DanyaRead { read: string; facts: Array<{ kind: string; text: string; claims?: readonly string[]; computer?: string }>; said: string[]; kept: Array<{ kind: string; computer?: string; from: string; text: string; squares: readonly string[] }> }

export function fixtureReader(reads: Reads): Reader {
  return (fen: string) => {
    const r = reads[readKey(fen)];
    if (!r) throw new Error(`danya fixture: no engine read for ${fen} — rebuild the fixture (RECORD_READS)`);
    return Promise.resolve(r);
  };
}

/** `said`: the game story's claims so far — a puzzle read in order passes
 *  what the moves before it said (once a game). */
export async function readDanyaBoard(fen: string, before: AnalysisLine[], read: Reader, said: readonly string[] | null = null): Promise<DanyaRead> {
  const side = new Chess(fen).turn();
  const pf = await boardReadFacts({ fen, studentColor: side, rating: 1800, before, read, withhold: false, readTempting: true, engineFutures: false, story: null,
    tense: 'now', history: [], theory: false, studentNeedContext: null } as unknown as Parameters<typeof boardReadFacts>[0]);
  const decided = decideRead(pf.facts, readContextOf({
    fen,
    top: before[0] ? { evaluation: before[0].evaluation, mate: before[0].mate ?? null } : null,
    bestUci: before[0]?.moves[0] ?? null,
    withheld: null,
    studentShot: readHasShot(fen, side, before, false),
    said,
    line: before[0]?.moves ?? [],
  }));
  return {
    read: [...decided.facts.map((f) => f.text), decided.habit ?? ''].map((t) => t.trim()).filter(Boolean).join(' '),
    facts: pf.facts.map((f) => ({ kind: f.kind, text: f.text, claims: f.claims ?? [], computer: f.computer })),
    said: decided.said,
    kept: decided.facts.map((f) => ({ kind: f.kind, computer: f.computer, from: f.from, text: f.text, squares: f.squares })),
  };
}
