/**
 * causalChainVoice — renders a CausalChain (causalChain.ts) into spoken prose.
 * The engine COMPUTES the chain (G0); this only phrases it. Two registers,
 * rating-scaled depth, one perspective — nothing here decides chess.
 *
 * REGISTERS (§ two-register rule 2026-07-19):
 *  • 'review'  — retrospective, the student's own game ("his queen came out
 *                early, so the bishop was loose, and you won it").
 *  • 'learn'   — present-tense as a demo line plays out ("the queen's already
 *                out, so the bishop has no guard — that's the hook").
 *
 * PERSPECTIVE (§ 2026-08-28, LOCKED): the student is "you/your", the opponent is
 * "they/their". NEVER "we/our". Applied per NODE colour vs the student's colour,
 * so it reads correctly whether the student won the tactic or was the one
 * punished for the early queen.
 *
 * DEPTH (rating-scaled, David 2026-09-07): beginners hear every link; stronger
 * players hear the compressed 2–3 highest-leverage links.
 *
 * SILENT on a null chain — the flat ranked list stands (never a fabricated link).
 */
import type { Color } from 'chess.js';
import type { CausalChain, CausalNode } from './causalChain';

export type CausalRegister = 'review' | 'learn';

export interface RenderOptions {
  register: CausalRegister;
  /** The student's colour — decides you/their per node. */
  studentColor: Color;
  /** Rating scales the depth. Default 1500 (medium). */
  rating?: number;
}

type Depth = 'full' | 'medium' | 'tight';
function depthFor(rating: number): Depth {
  if (rating < 1400) return 'full';
  if (rating <= 2000) return 'medium';
  return 'tight';
}

/** Possessive / subject for a node's side, from the student's POV. */
function poss(color: Color, student: Color): string { return color === student ? 'your' : 'their'; }
function subjCap(color: Color, student: Color): string { return color === student ? 'You' : 'They'; }

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

/** One sentence per node, in the chosen register + perspective. Returns '' for a
 *  node the register skips. */
function sentenceFor(node: CausalNode, i: number, register: CausalRegister, student: Color): string {
  const p = poss(node.color, student);
  const P = cap(p);
  switch (node.kind) {
    case 'premature-piece': {
      const pc = String(node.data.piece);
      const sq = String(node.data.square);
      return register === 'review'
        ? `${P} ${pc} came out early to ${sq} — right onto the natural square for ${p} own knight.`
        : `${P} ${pc} is already out on ${sq}, sitting on the knight's natural square.`;
    }
    case 'blocked-square': {
      const b = String(node.data.blocker);
      const sq = String(node.data.square);
      return register === 'review'
        ? `${P} ${b} is planted on ${sq}, the knight's developing square.`
        : `${P} ${b} is on ${sq} — the knight's square.`;
    }
    case 'displaced-defender': {
      const ks = String(node.data.knightSquare);
      const ideal = String(node.data.idealSquare);
      const t = String(node.data.target);
      return register === 'review'
        ? `So the knight had to develop to ${ks} instead of ${ideal}, and from ${ks} it can't guard ${t}.`
        : `So the knight goes to ${ks}, not ${ideal} — and from there it can't cover ${t}.`;
    }
    case 'loose-piece': {
      const piece = String(node.data.piece);
      const sq = String(node.data.square);
      return register === 'review'
        ? `That left ${p} ${piece} on ${sq} with nothing defending it.`
        : `${P} ${piece} on ${sq} has no defender now.`;
    }
    case 'discovered-attack': {
      const from = String(node.data.from);
      const to = String(node.data.to);
      const unv = String(node.data.unveiler);
      const tp = String(node.data.targetPiece);
      const tsq = String(node.data.target);
      // node.color is the beneficiary (the mover). Frame as theirs/yours.
      const who = subjCap(node.color, student);
      return register === 'review'
        ? `${who} played the knight to ${to}, and vacating ${from} uncovered the piece on ${unv} — a discovered double attack on the ${tp} on ${tsq}. With no guard, it dropped.`
        : `That's the hook: the knight jumps to ${to}, and leaving ${from} uncovers the piece on ${unv} — a discovered double attack on the ${tp} on ${tsq}, and it wins.`;
    }
    case 'won-loose-piece': {
      const to = String(node.data.to);
      const tp = String(node.data.targetPiece);
      const tsq = String(node.data.target);
      const who = subjCap(node.color, student);
      return register === 'review'
        ? `${who} landed on ${to} and hit the loose ${tp} on ${tsq} — nothing was guarding it, so it dropped.`
        : `The ${tp} on ${tsq} is loose, so ${to} collects it.`;
    }
    default:
      void i;
      return '';
  }
}

/** The compressed one-liner for strong players: root cause → the loose target →
 *  the tactic, in a single sentence. Board-true, no fabricated link. */
function tightLine(chain: CausalChain, student: Color): string {
  const root = chain.nodes[0];
  const loose = chain.nodes.find((n) => n.kind === 'loose-piece');
  const tactic = chain.nodes[chain.nodes.length - 1];
  const rp = poss(root.color, student);
  const rootPhrase = root.kind === 'premature-piece'
    ? `${cap(rp)} early ${String(root.data.piece)} on ${String(root.data.square)}`
    : `${cap(rp)} ${String(root.data.blocker)} on ${String(root.data.square)}`;
  const loosePhrase = loose ? `the ${String(loose.data.piece)} on ${String(loose.data.square)} loose` : 'a piece loose';
  const who = tactic.color === student ? 'you' : 'they';
  const tacticPhrase = tactic.kind === 'discovered-attack'
    ? `${who} won it with the discovery`
    : `${who} took it`;
  return `${rootPhrase} left ${loosePhrase} — ${tacticPhrase}.`;
}

/**
 * Render the chain to spoken sentences (one narration unit per element, so a
 * surface can reveal them sentence-by-sentence). Empty array when chain is null.
 */
export function renderCausalChain(chain: CausalChain | null, opts: RenderOptions): string[] {
  if (!chain || chain.nodes.length < 2) return [];
  const rating = opts.rating ?? 1500;
  const depth = depthFor(rating);
  const student = opts.studentColor;

  if (depth === 'tight') return [tightLine(chain, student)];

  // full = every node; medium = drop the displaced-defender middle link.
  const nodesToSpeak = depth === 'full'
    ? chain.nodes
    : chain.nodes.filter((n) => n.kind !== 'displaced-defender');

  const out: string[] = [];
  nodesToSpeak.forEach((n, i) => {
    const s = sentenceFor(n, i, opts.register, student);
    if (s) out.push(s);
  });
  return out;
}
