import { withArticle } from './andList';

// ONE WAY TO SAY A CAPTURE (WO-STORY-MATRIX-01 Phase 1 step 4; David
// 2026-10-30: "Redundant to say Qxd8 (narrated like: queen takes d8, takes
// the queen)"). A capture's SAN already says the capture: the voice reads
// "Qxd8" as "queen takes d 8" (`sanToSpeech`, `sanitizeForTTS`). A line that
// names the move and then says "takes the queen", "wins their pawn on c5" or
// "captures the pawn" says it twice — 69 of 748 lines on the Danya bench, from
// some ten producers, each with capture wording of its own.
//
// The capture is said ONCE, one of two ways:
//  - AFTER ITS SAN, only what it leads to: the material it nets, said as a
//    count ("wins a pawn" — never "the pawn", which is the capture again),
//    that nothing can take back, the trade it completes or keeps going;
//  - IN PIECE WORDS, with no SAN at all: "your queen takes theirs on d8".
// Every producer reads these; none keeps capture wording of its own.
// Gate: `captureSaidOnce.gate.test.ts`.

export type CapturePiece = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

const NAME: Record<CapturePiece, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

const NAMES: ReadonlySet<string> = new Set(Object.values(NAME));

/** A piece letter ("n") or name ("knight") as its name; anything else is
 *  "piece". Producers hand over either. */
export function capturePieceName(p: string | null | undefined): string {
  if (!p) return 'piece';
  const k = p.toLowerCase();
  return Object.prototype.hasOwnProperty.call(NAME, k) ? NAME[k as CapturePiece] : NAMES.has(k) ? k : 'piece';
}

/** WHAT A CAPTURE LEADS TO, said after its SAN. */
export type CaptureLeadsTo =
  /** It nets material: the count of what it took, and — `free` — that
   *  nothing can take back; `gave` is the piece the take-back costs the
   *  capturer when it nets less than what it took ("wins a rook for a
   *  knight" — never "wins a rook" for the exchange, Learn walk 2026-10-10:
   *  "Bxa5 Nxa5 is a queen for a bishop, said as 'winning your queen'").
   *  REQUIRED: every caller says whether the capturer is given back. */
  | { kind: 'nets'; captured: string; free: boolean; gave: string | null }
  /** A take-back that ends the trade, or — `next` set — the trade goes on
   *  with that capture ("…Ncxd4"). */
  | { kind: 'take-back'; next: string | null }
  /** A take-back that comes out ahead: what the taker gets for what the
   *  other side took first. `seat` is the taker from the student's seat. */
  | { kind: 'take-back-gain'; got: string; gave: string; seat: 'you' | 'they' }
  /** A capture they can answer in kind. */
  | { kind: 'trade'; piece: string; captured: string }
  /** A capture that hands over more than it takes. */
  | { kind: 'gives-up'; piece: string; captured: string };

/** "wins …" after a subject ("it wins a pawn"), or "winning …" in a list
 *  after the move ("You play Bxc5, winning a pawn"). */
export type CaptureForm = 'verb' | 'participle';

/**
 * WHAT A CAPTURE LEADS TO, for a line that has just said its SAN — never the
 * capture again. "Bxc5 — it wins a pawn, and nothing can take back";
 * "Bxf3 — it completes the trade"; "Qxb6 — it keeps the trade going, with Rxb6
 * next"; "Kxf7 — it gets them a knight for the pawn you took".
 */
export function afterCaptureSan(leadsTo: CaptureLeadsTo, form: CaptureForm): string {
  const v = (verb: string, participle: string): string => (form === 'verb' ? verb : participle);
  switch (leadsTo.kind) {
    case 'nets': {
      const count = withArticle(capturePieceName(leadsTo.captured));
      if (leadsTo.free) return v(`wins ${count}, and nothing can take back`, `winning ${count}, with nothing to take back`);
      const what = leadsTo.gave ? `${count} for ${withArticle(capturePieceName(leadsTo.gave))}` : count;
      return v(`wins ${what}`, `winning ${what}`);
    }
    case 'take-back':
      return leadsTo.next
        ? v(`keeps the trade going, with ${leadsTo.next} next`, `keeping the trade going, with ${leadsTo.next} next`)
        : v('completes the trade', 'completing the trade');
    case 'take-back-gain': {
      const taker = leadsTo.seat === 'you' ? 'you' : 'them';
      const first = leadsTo.seat === 'you' ? 'they' : 'you';
      const what = `${withArticle(capturePieceName(leadsTo.got))} for the ${capturePieceName(leadsTo.gave)} ${first} took`;
      return v(`gets ${taker} ${what}`, `getting ${taker} ${what}`);
    }
    case 'trade': {
      const mine = capturePieceName(leadsTo.piece);
      const theirs = capturePieceName(leadsTo.captured);
      const what = mine === theirs ? `${theirs}s` : `the ${mine} for the ${theirs}`;
      return v(`trades ${what}`, `trading ${what}`);
    }
    case 'gives-up': {
      const what = `the ${capturePieceName(leadsTo.piece)} for the ${capturePieceName(leadsTo.captured)}`;
      return v(`gives up ${what}`, `giving up ${what}`);
    }
  }
}

/**
 * `afterCaptureSan`'s verb in other words, its own first — for a surface that
 * says the same kind of capture many times a game and rotates (v5 re-run
 * 2026-10-29: "Wins their pawn on a2, and nothing can take back." four times
 * in one review). `seat` is the capturer from the student's seat.
 */
export function afterCaptureSanForms(leadsTo: CaptureLeadsTo, seat: 'you' | 'they'): string[] {
  const first = afterCaptureSan(leadsTo, 'verb');
  if (leadsTo.kind !== 'nets' || !leadsTo.free) return [first];
  const loser = seat === 'you' ? 'them' : 'you';
  const piece = capturePieceName(leadsTo.captured);
  // The third is his own words (hand walk 2340: "that's a free pawn").
  return [first, `costs ${loser} ${withArticle(piece)} — nothing can take back`, `is ${withArticle(`free ${piece}`)}: nothing can take back`];
}

/**
 * ONE CAPTURE IN PIECE WORDS, for a line that does NOT say the SAN: "your
 * queen takes theirs on d8", "their rook takes your knight on h2". `seat` is
 * the taker from the student's seat; null says it seat-free ("the bishop takes
 * the pawn on c5").
 */
export function captureInWords(c: { piece: string; captured: string; square: string }, seat: 'you' | 'they' | null): string {
  const mine = capturePieceName(c.piece);
  const theirs = capturePieceName(c.captured);
  if (seat === null) return `the ${mine} takes ${mine === theirs ? 'the other' : 'the'} ${theirs} on ${c.square}`;
  const own = seat === 'you' ? 'your' : 'their';
  const other = seat === 'you' ? 'their' : 'your';
  const otherAlone = seat === 'you' ? 'theirs' : 'yours';
  return mine === theirs ? `${own} ${mine} takes ${otherAlone} on ${c.square}` : `${own} ${mine} takes ${other} ${theirs} on ${c.square}`;
}
