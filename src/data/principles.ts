// principles — Phase 3 of the Danya review build: the DEVICE per
// misconception tag (David 2026-07-18; tape-calibrated: the principle is a
// TOOL the student applies on the spot, not a poster on the wall).
//
// G0 contract: the TAG is computed (classifier / verified fall-off); the
// device text is CURATED here — never LLM-invented, never paraphrased at
// runtime. The reveal speaks it verbatim after the grounded facts + the
// "we've seen this before" callback (misconceptionCallbacks).
//
// Voice register (Narration Voice Rules + the house voice): imperative,
// concept-first, one breath, names the CHECK the student runs before the
// move — no SAN, no digits, no interface talk. These are classical maxims
// (Capablanca/Lasker-register public-domain ideas) restated as devices.

import type { MisconceptionTagId } from './misconceptionTags';

/** The spoken device per tag. Every first-class tag has one; the
 *  `other` holding pen deliberately has none (nothing specific to teach). */
export const PRINCIPLE_DEVICES: Readonly<Partial<Record<MisconceptionTagId, string>>> = {
  // ── opening ──
  'left-book-early': 'The device: leave theory only for a reason you can say out loud — if you cannot name what the new move does better, the book move stands.',
  'neglected-development': 'The device: new move, new piece — while a minor piece still sleeps at home, its move comes before any pawn push or repeat.',
  'king-stuck-center': 'The device: castle before you open the centre — count the open central files, and if there is even one, the king moves first.',
  'greedy-pawn-grab': 'The device: price every pawn in time — a pawn is worth about three moves, so if taking it costs you three moves of development, you paid full price for nothing.',
  'tempo-handed': 'The device: before every move, ask what they get to do with the free move it gives them — if the answer is "develop with an attack," the move is not free.',
  'space-conceded': 'The device: a piece that stands in the centre holds a square — before it steps back, name who takes that square next, and whether a pawn can plant itself there for nothing.',
  // ── tactical ──
  'hung-material': 'The device: after you choose a move, run every capture the reply can make — every check, every take, before your hand commits.',
  'missed-tactic': 'The device: checks, captures, threats — in that order, every single move. The shot only stays invisible when the list never runs.',
  'calculation-depth': 'The device: calculate to a quiet position, not to a good feeling — follow every forcing reply until the captures and checks run out.',
  'missed-opponents-threat': "The device: their move first — before your plan, ask what the last move wants to do to you, and answer that before anything else.",
  'overvalued-attack': 'The device: count attackers against defenders before you sacrifice — if the defenders arrive faster than your reserves, the attack is a loan you cannot repay.',
  // ── positional ──
  'weakened-king-safety': 'The device: the pawns in front of your king move only for a concrete, named reason — every push opens a door that never closes again.',
  'created-pawn-weakness': 'The device: pawns never move backward — before every pawn push, name the square it gives up forever, and decide if the trade is worth it.',
  'misplaced-piece': 'The device: improve your worst piece — find the one doing the least, and give it a job before you start anything else.',
  'bad-trade': 'The device: trade your worst piece for their best, never the reverse — before any exchange, ask which side of the trade improves.',
  'overextended-pawn': 'The device: a pawn advances only as far as its neighbours can follow — before the push, find the pawn that will stand behind it, and if there is none, the push waits.',
  'bad-trade-material': 'The device: count the material before you trade — ahead, every piece off the board brings the win closer; behind, every piece off the board takes your chances with it.',
  // ── endgame ──
  'passive-king-endgame': 'The device: queens off, king on — the moment the endgame starts, the king walks toward the centre and works like a piece.',
  'mistimed-pawn-break': 'The device: prepare the break before you play it — every piece on its best square first, and only then the pawn goes.',
  'botched-conversion': 'The device: winning positions are won slowly — trade pieces, keep pawns, and take away the last counter-chance before you cash in.',
  'passed-pawn-neglected': 'The device: passed pawns are made to be pushed — every move it waits, they build a blockade in front of it, so run it while the road is open.',
  'passive-rook': 'The device: put your rook where it works — the seventh rank or an open file, behind a passed pawn, never sitting passive in front of one.',
  // ── general ──
  'no-plan': 'The device: name the target before you touch a piece — if the move serves no plan you can say in one sentence, it is not your move.',
};

/** The curated device for a tag, or null (unknown tag / the `other` pen). */
export function principleFor(tag: string): string | null {
  return (PRINCIPLE_DEVICES as Record<string, string | undefined>)[tag] ?? null;
}
