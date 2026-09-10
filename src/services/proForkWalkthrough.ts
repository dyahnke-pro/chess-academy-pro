// proForkWalkthrough — convert a ProOpeningForkTree into a WalkthroughTree so the
// pro's aggregated games play as a fork-in-the-road lesson through the EXISTING
// walkthrough hands (useTeachWalkthrough), not a bespoke runtime.
//
// David 2026-09-10, LOCKED: "Always the why!! This is what sets my app apart."
// So EVERY node narrates the pro's frequency AND a grounded why. The why-chain
// is board-truth only (G0/G3), never invented:
//   1. corpus note at THIS exact position (teachingNoteForBoard → the 90% voice)
//   2. describeMoveGeometry (chess.js geometry — what the move does)
//   3. a minimal move-type descriptor (capture/check/castle/develop) as a floor
// Frequency + move are computed; the model never decides anything here.
import { Chess } from 'chess.js';
import { describeMoveGeometry } from './groundedAnswer';
import { teachingNoteForBoard } from './danyaTeachingService';
import { sanToSpeech } from '../utils/sanToSpeech';
import type { WalkthroughTree, WalkthroughTreeNode, WalkthroughTreeChild } from '../types/walkthroughTree';
import type { ProOpeningForkTree, ProFork } from './proOpeningForks';

const BRANCH_PLIES = 6; // how far to walk each non-majority fork branch

function sansOf(pgn: string): string[] {
  return pgn.replace(/\b\d+\.(\.\.)?/g, ' ').replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, ' ').trim().split(/\s+/).filter(Boolean);
}

/** Grounded why for a move — corpus note, then geometry, then a move-type floor.
 *  Never empty (David: "always the why"). */
function whyFor(historyBefore: string[], fenBefore: string, san: string, moverColor: 'white' | 'black', openingName: string): string {
  const chess = new Chess(fenBefore);
  let mv;
  try { mv = chess.move(san); } catch { mv = null; }
  const fenAfter = chess.fen();
  const note = teachingNoteForBoard([...historyBefore, san], fenAfter, openingName);
  const noteWhy = note?.teaches?.trim() || note?.explains?.trim() || '';
  if (noteWhy) return noteWhy;
  const geo = describeMoveGeometry(fenBefore, san, moverColor)?.trim();
  if (geo) return geo;
  // Floor: describe the move mechanically from chess.js — always concrete
  // (names a piece/square/concept), never generic filler. Board-true, and
  // deliberately understated so a quiet developing move is never dressed up
  // as more than it is (David 2026-07-19: "don't overstate the why").
  if (mv) {
    if (mv.flags.includes('k')) return 'castling kingside — the king steps into safety and the rook joins the game';
    if (mv.flags.includes('q')) return 'castling queenside — the king tucks away and the rook comes toward the centre';
    if (mv.san.includes('#')) return 'delivering checkmate';
    if (mv.san.includes('+')) return `a check on ${mv.to}, forcing the king to react`;
    if (mv.flags.includes('c') || mv.flags.includes('e')) return `capturing on ${mv.to}`;
    if (mv.piece === 'n' || mv.piece === 'b') return `developing the ${mv.piece === 'n' ? 'knight' : 'bishop'} toward the centre`;
    if (mv.piece === 'p') {
      const central = 'cdef'.includes(mv.to[0]) && (mv.to[1] === '4' || mv.to[1] === '5');
      return central ? `claiming space in the centre with the pawn to ${mv.to}` : `advancing the pawn to ${mv.to}`;
    }
    if (mv.piece === 'r') return `bringing the rook to ${mv.to}`;
    if (mv.piece === 'q') return `bringing the queen to ${mv.to}`;
    if (mv.piece === 'k') return `stepping the king to ${mv.to}`;
  }
  return `playing ${sanToSpeech(san)}`;
}

/** "his pick in 4 of 6 games" / "his choice here". */
function freqClause(count: number, total: number): string {
  if (total <= 1 || count >= total) return 'his choice here';
  return `his pick in ${count} of ${total} games`;
}

export function proForkTreeToWalkthrough(fork: ProOpeningForkTree): WalkthroughTree | null {
  if (!fork || fork.spine.length === 0) return null;
  const total = fork.gameCount;
  const openingName = fork.openingLabel;
  const forkByPly = new Map<number, ProFork>();
  for (const f of fork.forks) forkByPly.set(f.ply, f);

  // Walk a line of SANs from a starting fen, building a linear node chain with
  // grounded narration. Returns the HEAD node (or null if nothing legal).
  function buildLinear(sans: string[], startFen: string, startHistory: string[]): WalkthroughTreeNode | null {
    const chess = new Chess(startFen);
    const history = [...startHistory];
    let head: WalkthroughTreeNode | null = null;
    let tail: WalkthroughTreeNode | null = null;
    for (let i = 0; i < sans.length; i += 1) {
      const fenBefore = chess.fen();
      const moverColor: 'white' | 'black' = fenBefore.split(' ')[1] === 'w' ? 'white' : 'black';
      let mv;
      try { mv = chess.move(sans[i]); } catch { break; }
      if (!mv) break;
      const why = whyFor(history, fenBefore, mv.san, moverColor, openingName);
      const node: WalkthroughTreeNode = {
        san: mv.san,
        movedBy: moverColor,
        idea: `${sanToSpeech(mv.san)} — ${why}.`,
        children: [],
      };
      history.push(mv.san);
      if (!head) head = node; else if (tail) tail.children = [{ node }];
      tail = node;
    }
    return head;
  }

  // Build the spine top-down; at a fork ply, branch into the pro's alternatives.
  function buildFrom(ply: number, fenBefore: string, history: string[]): WalkthroughTreeChild[] {
    if (ply >= fork.spine.length) return [];
    const forkHere = forkByPly.get(ply);
    const moverColor: 'white' | 'black' = fenBefore.split(' ')[1] === 'w' ? 'white' : 'black';

    if (forkHere && forkHere.branches.length >= 2) {
      // One child per real alternative the pro played. Majority first.
      return forkHere.branches.map((b) => {
        const chess = new Chess(fenBefore);
        let mv;
        try { mv = chess.move(b.san); } catch { mv = null; }
        if (!mv) return null;
        const why = whyFor(history, fenBefore, mv.san, moverColor, openingName);
        // Continue this branch down its representative game for a few plies.
        const sampleSans = sansOf(b.sample.pgn).slice(ply + 1, ply + 1 + BRANCH_PLIES);
        const cont = buildLinear(sampleSans, chess.fen(), [...history, mv.san]);
        const node: WalkthroughTreeNode = {
          san: mv.san,
          movedBy: moverColor,
          idea: `${sanToSpeech(mv.san)} — ${freqClause(b.count, total)}. ${why}.`,
          children: cont ? [{ node: cont }] : [],
        };
        return {
          label: `${sanToSpeech(mv.san)} — ${freqClause(b.count, total)}`,
          forkSubtitle: why,
          node,
        } as WalkthroughTreeChild;
      }).filter((c): c is WalkthroughTreeChild => c !== null);
    }

    // Linear spine node → recurse to the next ply.
    const spineSan = fork.spine[ply].san;
    const chess = new Chess(fenBefore);
    let mv;
    try { mv = chess.move(spineSan); } catch { mv = null; }
    if (!mv) return [];
    const why = whyFor(history, fenBefore, mv.san, moverColor, openingName);
    const node: WalkthroughTreeNode = {
      san: mv.san,
      movedBy: moverColor,
      idea: `${sanToSpeech(mv.san)} — ${why}.`,
      children: buildFrom(ply + 1, chess.fen(), [...history, mv.san]),
    };
    return [{ node }];
  }

  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const rootChildren = buildFrom(0, START_FEN, []);
  if (rootChildren.length === 0) return null;

  const proName = fork.playerId.charAt(0).toUpperCase() + fork.playerId.slice(1);
  const forkN = fork.forks.length;
  const intro = `Here's how ${proName} plays the ${openingName}, from ${total} of his real games. `
    + (forkN > 0
      ? `He doesn't always take the same road — at ${forkN === 1 ? 'one point' : `${forkN} points`} his games split, and you'll pick which line to follow.`
      : `We'll walk his main line move by move.`);

  return {
    openingName,
    derived: true,
    eco: '',
    intro,
    outro: `That's ${proName}'s ${openingName} — his real choices, with the reason behind each. Pick another fork to see a different road, or play it out yourself.`,
    studentSide: fork.studentSide,
    root: { san: null, movedBy: null, idea: '', children: rootChildren },
  };
}
