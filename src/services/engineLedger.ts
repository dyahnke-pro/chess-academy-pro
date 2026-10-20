// THE ENGINE'S OWN TIMELINE (Learn speed, 2026-10-20). Every search the one
// engine runs — the price, the mid-turn read, the coach's reply, the warm and
// pass reads — shares one worker, so a slow turn is a queue, and a queue can
// only be cut once it is seen. Each search records when it was asked for, when
// its `go` was sent, when it answered, and the depth it reached. A ring of
// recent searches, read by the audit driver; the coach never reads it.
// Leaf module: no imports.

export type EngineSearchKind = 'read' | 'bestmove';
/** 'shared': answered without a search of its own — a cache hit, or a call
 *  that joined a search already running. */
export type EngineSearchOutcome = 'done' | 'shared' | 'interrupted' | 'error';

export interface EngineLedgerEntry {
  id: number;
  kind: EngineSearchKind;
  fen: string;
  /** The depth asked (`go depth N`); null for a timed best-move search. */
  depth: number | null;
  /** The moves a scored search is restricted to (the one price). */
  searchmoves: string | null;
  priority: string;
  askedAt: number;
  /** When its `go` reached the worker — null when it never searched (a cache
   *  hit, or a call that joined a search already running). */
  startedAt: number | null;
  doneAt: number | null;
  depthReached: number | null;
  outcome: EngineSearchOutcome | null;
}

const RING = 400;
const entries: EngineLedgerEntry[] = [];
let nextId = 1;

export function ledgerAsk(kind: EngineSearchKind, fen: string, depth: number | null, searchmoves: string | null, priority: string): EngineLedgerEntry {
  const e: EngineLedgerEntry = { id: nextId++, kind, fen, depth, searchmoves, priority, askedAt: Date.now(), startedAt: null, doneAt: null, depthReached: null, outcome: null };
  entries.push(e);
  if (entries.length > RING) entries.shift();
  return e;
}

export function ledgerStart(e: EngineLedgerEntry | undefined): void {
  if (e && e.startedAt === null) e.startedAt = Date.now();
}

export function ledgerDone(e: EngineLedgerEntry | undefined, outcome: EngineSearchOutcome, depthReached: number | null = null): void {
  if (!e || e.doneAt !== null) return;
  e.doneAt = Date.now();
  e.outcome = outcome;
  e.depthReached = depthReached;
}

/** The recent searches, oldest first. */
export function engineLedger(): readonly EngineLedgerEntry[] {
  return entries;
}
