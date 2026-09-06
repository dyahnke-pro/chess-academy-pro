/**
 * principleVoice — the FUNDAMENTAL, spoken (deterministic, DNA register).
 *
 * The verdict LEADS a flagged move's beat; everything else the review computed
 * follows as supporting evidence (David 2026-09-05: "I want the fundamental
 * flaw to be stated first and then the other computer narration following it
 * as supporting evidence"). Every word here is a code template over the
 * attributor's evidence — the squares and moves named are the ones it proved
 * on the board — so the line is identical on every open and every device, and
 * no model rephrases it (G0 `preferRaw`; David: "This all needs to be
 * deterministic!!"). Variety comes from stems rotated on the ply index, never
 * from a model. Perspective: the student is "you/your", the opponent
 * "they/their" (locked 2026-08-28).
 *
 * A fundamental that already spoke in full earlier in the game is repeated in
 * a short stem — the walk accumulates, it does not nag (G.4).
 */
import type { PrincipleAttribution, FundamentalId } from './principleAttribution';

const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
const nth = (n: number): string => ORD[n] ?? `${n}th`;

function listMoves(moves: readonly string[], joiner = ' then '): string {
  return moves.join(joiner);
}

/** The full verdict for one attribution. `v` picks the stem variant. */
function fullVerdict(a: PrincipleAttribution, v: number): string {
  const f = a.facts;
  const e = a.evidence;
  const kick = e.moves.length ? listMoves(e.moves) : null;
  switch (a.id) {
    case 'same-piece-twice': {
      const s = [
        `That's the same ${f.piece} for the ${nth(Number(f.nth))} time while ${f.homeMinors} of your pieces still sit at home — every re-move hands the opponent a free turn.`,
        `The ${f.piece} moves again — its ${nth(Number(f.nth))} trip — with ${f.homeMinors} pieces still undeveloped. In the opening, a new move wants a new piece.`,
        `Your ${f.piece} is on its ${nth(Number(f.nth))} move and ${f.homeMinors} pieces haven't left the back rank. That's a tempo spent on a piece that already had its turn.`,
      ];
      return s[v % s.length];
    }
    case 'tempo-handed': {
      const s = [
        `That hands them a tempo: ${kick} comes with a threat on your ${f.target}, and you have to spend a move answering it instead of building.`,
        `Tempo lost — after this they get ${kick} for free, hitting your ${f.target}, and your next move is forced to react.`,
        `The cost is time: ${kick} now attacks your ${f.target}, so they develop with a threat and you move the same piece again.`,
      ];
      return s[v % s.length];
    }
    case 'space-conceded': {
      const s = [
        `You gave up ${f.square}: with the piece gone, ${f.push} plants a pawn there for free and the centre is theirs.`,
        `That concedes the ${f.square} square — ${f.push} can now sit there and nothing of yours can take it back.`,
        `Space handed over: stepping off ${f.square} lets ${f.push} claim it, and a pawn that far up cramps everything behind it.`,
      ];
      return s[v % s.length];
    }
    case 'neglected-development': {
      const s = [
        `Development first: ${f.homeMinors} of your pieces are still at home, and ${f.better} brought one out instead.`,
        `Pieces before pawns — with ${f.homeMinors} still undeveloped, this was the moment for ${f.better}.`,
        `That's a move that develops nothing while ${f.homeMinors} pieces wait at home; ${f.better} puts one to work.`,
      ];
      return s[v % s.length];
    }
    case 'early-queen-sortie': {
      const s = [
        `The queen came out too early: on ${f.square} she's a target, and ${f.kick} develops a piece by hitting her.`,
        `An early queen sortie — ${f.kick} attacks her on ${f.square} with a developing move, so they gain time for free.`,
        `Queen before the pieces: ${f.kick} kicks her off ${f.square} and every tempo she spends running is theirs.`,
      ];
      return s[v % s.length];
    }
    case 'king-left-in-centre': {
      const s = [
        `The king is still in the centre and castling was there — now ${f.punish} lands while he's exposed.`,
        `Castle first: leaving the king in the middle lets ${f.punish} come with the king still on its file.`,
        `That leaves the king uncastled one move too long, and ${f.punish} arrives before he gets to safety.`,
      ];
      return s[v % s.length];
    }
    case 'greedy-pawn-grab': {
      const s = [
        `The pawn on ${f.pawn} was poisoned: taking it costs time, and ${f.punish} collects it straight away.`,
        `A pawn grab with the pieces still at home — ${f.punish} answers, and the pawn isn't worth the tempo.`,
        `Greedy: the ${f.pawn} pawn buys you nothing but ${f.punish}, and you're behind in development for it.`,
      ];
      return s[v % s.length];
    }
    case 'early-edge-pawns': {
      const s = [
        `An edge pawn this early does nothing for the centre — ${f.better} fights for it instead.`,
        `The ${f.pawn} push spends a tempo on the rim while the centre is still up for grabs; ${f.better} was the move.`,
        `Edge pawns wait: with the centre unresolved, ${f.better} is where the tempo belongs.`,
      ];
      return s[v % s.length];
    }
    case 'knights-before-bishops': {
      const s = [
        `Both bishops are committed before a single knight — and ${f.kick} hits the one on ${f.square} with gain.`,
        `Knights before bishops: the bishop on ${f.square} gives them a target, and ${f.kick} takes it with tempo.`,
        `The bishops declared their squares too soon; ${f.kick} kicks the one on ${f.square} for free.`,
      ];
      return s[v % s.length];
    }
    case 'buried-own-bishop': {
      const s = [
        `That buries your own bishop: with ${f.blocker} in the way, the bishop on ${f.bishop} has nowhere to go.`,
        `Your bishop on ${f.bishop} is shut in behind ${f.blocker} — a piece that can't move is a piece you don't have.`,
        `The bishop on ${f.bishop} loses its diagonal to ${f.blocker}; keep your own pieces breathing.`,
      ];
      return s[v % s.length];
    }
    case 'premature-centre-break': {
      const s = [
        `A centre break ${f.reason} is premature — ${f.punish} opens it while you're not ready.`,
        `Open the centre only when you're ready: ${f.reason}, and ${f.punish} punishes the push on ${f.pawn}.`,
        `The ${f.pawn} break comes too soon — ${f.reason} — and ${f.punish} is the bill.`,
      ];
      return s[v % s.length];
    }
    case 'knight-to-the-rim': {
      const s = [
        `A knight on the rim is dim: on ${f.square} it covers little, and ${f.kick} drives it back anyway.`,
        `The knight on ${f.square} is on the edge of the board — ${f.kick} kicks it, and it never did anything there.`,
        `Knights belong in the centre; on ${f.square} this one gets hit by ${f.kick} for nothing.`,
      ];
      return s[v % s.length];
    }
    case 'loose-piece': {
      const s = [
        `Loose pieces drop off: the ${f.piece} on ${f.square} is left hanging, and ${kick ?? 'the capture'} just takes it.`,
        `That leaves the ${f.piece} on ${f.square} undefended — ${kick ?? 'a capture'} wins it outright.`,
        `The ${f.piece} on ${f.square} hangs after this; ${kick ?? 'taking it'} is free material.`,
      ];
      return s[v % s.length];
    }
    case 'ignored-threat': {
      const s = [
        `Their threat first: the ${f.piece} on ${f.square} was already attacked, and this move doesn't deal with it — ${kick ?? 'the capture'} wins it.`,
        `The ${f.piece} on ${f.square} was hanging before you moved, and it's still hanging after; ${kick ?? 'they take it'} next.`,
        `Answer the threat before your own plan — the ${f.piece} on ${f.square} stays en prise and ${kick ?? 'the capture'} collects.`,
      ];
      return s[v % s.length];
    }
    case 'passive-when-forcing-existed': {
      const s = [
        `Checks, captures, threats — there was a forcing move here: ${f.better} wins by force, and this quiet move lets it go.`,
        `A forcing win was on the board — ${f.better} — and a quiet move walked past it.`,
        `Always run the forcing moves first: ${f.better} was decisive, and this doesn't force anything.`,
      ];
      return s[v % s.length];
    }
    case 'weakened-king-shield': {
      const s = [
        `That loosens the shelter in front of your king on ${f.king}: the ${f.pawn} pawn moved, and ${f.punish} comes through the gap.`,
        `Pawns in front of the king move only for a reason — this one opens a line, and ${f.punish} uses it.`,
        `The king on ${f.king} is airier for it: ${f.punish} lands where the ${f.pawn} pawn used to guard.`,
      ];
      return s[v % s.length];
    }
    case 'created-pawn-weakness': {
      const s = [
        `That creates a lasting weakness: the pawn on ${f.pawn} can't be defended by another pawn again, and it becomes a target.`,
        `Pawns don't move backwards — the pawn on ${f.pawn} is now a permanent weakness they can pile on.`,
        `A structural cost: ${f.pawn} is a weak pawn for the rest of the game.`,
      ];
      return s[v % s.length];
    }
    case 'overextended-pawn': {
      const s = [
        `The pawn on ${f.pawn} is overextended — nothing supports it, and it's a target the moment they look at it.`,
        `A pawn advanced past its support: ${f.pawn} has no neighbour behind it and can be attacked for free.`,
        `Too far, too soon: the pawn on ${f.pawn} stands alone and they win it or tie you to defending it.`,
      ];
      return s[v % s.length];
    }
    case 'traded-active-for-passive': {
      const s = [
        `That trades your active ${f.piece} for their passive one${f.kind === 'bishop pair' ? ' and hands over the bishop pair' : ''} — the wrong side of the exchange.`,
        `Trade your worst piece for their best, not the reverse: your ${f.piece} was doing more than the piece it took.`,
        `An exchange that improves them: ${f.kind === 'bishop pair' ? 'they keep both bishops and you don\'t' : `your ${f.piece} was the better piece`}.`,
      ];
      return s[v % s.length];
    }
    case 'wrong-trade-for-material': {
      const s = f.situation === 'ahead' ? [
        `You're ahead in material — trade pieces and the win gets simpler; ${f.better} does exactly that.`,
        `When you're up, every piece off the board brings the win closer: ${f.better} was the trade to make.`,
        `Ahead means simplify — ${f.better} trades pieces and drains their counterplay.`,
      ] : [
        `You're behind in material — trading pieces takes your chances with them; ${f.better} keeps them on.`,
        `When you're down, keep the pieces and trade pawns: ${f.better} holds the tension instead of swapping.`,
        `Behind means complicate — this trade simplifies toward a lost ending; ${f.better} doesn't.`,
      ];
      return s[v % s.length];
    }
    case 'worst-piece-unimproved': {
      const s = [
        `Improve your worst piece: the ${f.piece} on ${f.square} is doing the least, and ${f.better} gives it a job.`,
        `The ${f.piece} on ${f.square} is your least active piece — ${f.better} brings it into the game.`,
        `Find the piece doing nothing and fix it: the ${f.piece} on ${f.square}, via ${f.better}.`,
      ];
      return s[v % s.length];
    }
    case 'rook-ignored-open-file': {
      const s = [
        `Rooks belong on open files: the ${f.file}-file was open and ${f.better} takes it — now they get there first.`,
        `The open ${f.file}-file was yours for ${f.better}; leave it and they occupy it.`,
        `An open file is a highway — ${f.better} puts a rook on the ${f.file}-file before they do.`,
      ];
      return s[v % s.length];
    }
    case 'passive-king-endgame': {
      const s = [
        `In the endgame the king is a piece: yours on ${f.king} should be walking in — ${f.better} — and theirs is.`,
        `Activate the king: ${f.better} brings him toward the action while the other king is already marching.`,
        `Queens off, king on — ${f.better} was the move; the king on ${f.king} can't win this from the back.`,
      ];
      return s[v % s.length];
    }
    case 'mistimed-pawn-break': {
      const s = [
        `That break is mistimed: the pawn on ${f.pawn} goes forward and ${f.cost} — prepare it first.`,
        `Pushing ${f.pawn} before the pieces were ready: ${f.cost}, and a pawn never comes back.`,
        `A pawn break needs its pieces behind it — here ${f.cost} the moment it lands on ${f.pawn}.`,
      ];
      return s[v % s.length];
    }
    case 'rook-in-front-of-passer': {
      const s = [
        `Rooks belong behind passed pawns: on ${f.rook} yours sits in front of the pawn on ${f.pawn} — ${f.better} puts it behind.`,
        `In front of the passer the rook blocks its own pawn; ${f.better} goes behind it, where it pushes from strength.`,
        `The rook on ${f.rook} has the passed pawn on ${f.pawn} the wrong way round — behind it, with ${f.better}.`,
      ];
      return s[v % s.length];
    }
  }
}

/** The shortened repeat stem — the fundamental already spoke in full earlier
 *  in this game, so the walk accumulates instead of re-teaching. */
function shortVerdict(a: PrincipleAttribution): string {
  const f = a.facts;
  const e = a.evidence;
  switch (a.id) {
    case 'same-piece-twice': return `The same ${f.piece} again — its ${nth(Number(f.nth))} move.`;
    case 'tempo-handed': return `Another tempo handed over: ${listMoves(e.moves)} hits your ${f.target}.`;
    case 'space-conceded': return `Space given up again — ${f.push} takes ${f.square}.`;
    case 'neglected-development': return `Development again — ${f.homeMinors} pieces still at home.`;
    case 'early-queen-sortie': return `The early queen again — ${f.kick} hits her.`;
    case 'king-left-in-centre': return `The king still isn't castled, and ${f.punish} is on.`;
    case 'greedy-pawn-grab': return `Another pawn grab — ${f.punish} is the price.`;
    case 'early-edge-pawns': return `Another edge pawn while the centre waits.`;
    case 'knights-before-bishops': return `The bishop again before the knights — ${f.kick} kicks it.`;
    case 'buried-own-bishop': return `Your bishop on ${f.bishop} is shut in again.`;
    case 'premature-centre-break': return `Another early break on ${f.pawn}.`;
    case 'knight-to-the-rim': return `A knight on the rim again, on ${f.square}.`;
    case 'loose-piece': return `Loose piece again — the ${f.piece} on ${f.square} hangs.`;
    case 'ignored-threat': return `Their threat again — the ${f.piece} on ${f.square} is still hanging.`;
    case 'passive-when-forcing-existed': return `A forcing move missed again: ${f.better}.`;
    case 'weakened-king-shield': return `The king's shelter loosened again — ${f.punish}.`;
    case 'created-pawn-weakness': return `Another weak pawn, on ${f.pawn}.`;
    case 'overextended-pawn': return `Overextended again — the pawn on ${f.pawn}.`;
    case 'traded-active-for-passive': return `The wrong side of a trade again.`;
    case 'wrong-trade-for-material': return `The material rule again — ${f.better} was the trade.`;
    case 'worst-piece-unimproved': return `The worst piece still waits, on ${f.square}.`;
    case 'rook-ignored-open-file': return `The open ${f.file}-file, again unclaimed.`;
    case 'passive-king-endgame': return `The king still isn't walking in.`;
    case 'mistimed-pawn-break': return `Another mistimed push, on ${f.pawn}.`;
    case 'rook-in-front-of-passer': return `The rook in front of the passer again.`;
  }
}

export interface FundamentalVerdictOptions {
  /** 1-based ply of the move (stem rotation). */
  ply: number;
  /** Fundamentals already spoken in full this game — mutated as verdicts are issued. */
  seen: Set<FundamentalId>;
}

/**
 * The verdict line(s) that LEAD the beat, most important first. Up to three
 * attributions, each in full the first time it appears in the game and in a
 * short stem after that. Empty string when nothing attached.
 */
export function renderFundamentalVerdict(attrs: readonly PrincipleAttribution[], opts: FundamentalVerdictOptions): string {
  const parts: string[] = [];
  attrs.forEach((a, i) => {
    const first = !opts.seen.has(a.id);
    opts.seen.add(a.id);
    parts.push(first ? fullVerdict(a, opts.ply + i) : shortVerdict(a));
  });
  return parts.join(' ');
}

/** The engine-line corroboration, spoken as evidence after the verdict. Only
 *  when the persisted PV actually contains the punishing move. */
export function renderPvEvidence(attrs: readonly PrincipleAttribution[]): string | null {
  const withPv = attrs.find((a) => a.evidence.pvMoves.length > 0);
  if (!withPv) return null;
  return `In the engine's line it goes ${listMoves(withPv.evidence.pvMoves, ', ')} — exactly that.`;
}

const RECAP_NOUN: Record<FundamentalId, string> = {
  'same-piece-twice': 'moved the same piece twice',
  'tempo-handed': 'handed over a tempo',
  'space-conceded': 'gave up space in the centre',
  'neglected-development': 'neglected development',
  'early-queen-sortie': 'brought the queen out early',
  'king-left-in-centre': 'left the king in the centre',
  'greedy-pawn-grab': 'grabbed a pawn at the wrong time',
  'early-edge-pawns': 'pushed edge pawns early',
  'knights-before-bishops': 'committed the bishops before the knights',
  'buried-own-bishop': 'buried your own bishop',
  'premature-centre-break': 'opened the centre too early',
  'knight-to-the-rim': 'put a knight on the rim',
  'loose-piece': 'left a piece loose',
  'ignored-threat': 'ignored their threat',
  'passive-when-forcing-existed': 'missed a forcing move',
  'weakened-king-shield': 'loosened the king\'s shelter',
  'created-pawn-weakness': 'created a pawn weakness',
  'overextended-pawn': 'overextended a pawn',
  'traded-active-for-passive': 'traded the wrong piece',
  'wrong-trade-for-material': 'traded against the material situation',
  'worst-piece-unimproved': 'left your worst piece unimproved',
  'rook-ignored-open-file': 'ignored an open file',
  'passive-king-endgame': 'kept the king passive in the endgame',
  'mistimed-pawn-break': 'mistimed a pawn break',
  'rook-in-front-of-passer': 'put the rook in front of the passed pawn',
};

/**
 * The end-of-game aggregate — the actual lesson (G.4): "three of your five
 * flagged moves handed over a tempo." Deterministic counts; the most frequent
 * fundamental leads, one runner-up at most. Null when nothing attached.
 */
export function renderFundamentalsRecap(perMove: readonly (readonly PrincipleAttribution[])[], flaggedCount: number): string | null {
  const counts = new Map<FundamentalId, number>();
  let movesWithOne = 0;
  for (const attrs of perMove) {
    if (attrs.length === 0) continue;
    movesWithOne += 1;
    for (const a of attrs) counts.set(a.id, (counts.get(a.id) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const ranked = [...counts.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
  const [topId, topN] = ranked[0];
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const w = (n: number) => words[n] ?? String(n);
  const lead = flaggedCount > 0
    ? `The pattern: ${w(topN)} of your ${w(flaggedCount)} flagged move${flaggedCount === 1 ? '' : 's'} ${RECAP_NOUN[topId]}.`
    : `The pattern: you ${RECAP_NOUN[topId]} ${w(topN)} time${topN === 1 ? '' : 's'}.`;
  const runner = ranked[1] && ranked[1][1] >= 2 ? ` Behind it, you ${RECAP_NOUN[ranked[1][0]]} ${w(ranked[1][1])} times.` : '';
  const close = movesWithOne >= 2 ? ' That is the one thing to carry into the next game.' : '';
  return `${lead}${runner}${close}`;
}
