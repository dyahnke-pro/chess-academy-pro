// PRO-REP MIDDLEGAME-PLAN NARRATION ACCURACY GATE — (David 2026-05-30, locked).
//
// The masterclass narration gates (narrationAccuracy / lessonIntegrity) read
// ALL_LESSONS from registry.ts, which by doctrine EXCLUDES pro-rep content. And
// the plan gates that DO run on pro-rep (middlegamePlanThemes / FenCoherence)
// check structure + legality, NOT whether the prose is board-TRUE. So pro-rep
// middlegame-plan narration was an ungated swamp — exactly where the Trompowsky
// "White's bishop pair" hallucination hid (both sides keep both bishops there).
// This gate board-checks every pro-rep plan's playable-line prose:
//   1. every `<square>-<piece>` hyphenated claim is TRUE at some frame of the
//      plan's own playable line (the narrationAccuracy semantic), AND
//   2. a "bishop pair" / "two bishops" advantage claim only stands when some side
//      ACTUALLY holds two bishops vs the opponent's one at some frame of the line
//      (negated / "keeps both" / "gives up" framings are exempt — they describe
//      the absence of the pair).
// Both pros are in scope. Baseline-free: all known violations were fixed.

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import mpRaw from './middlegame-plans.json' assert { type: 'json' };

interface PlayableLine { fen?: string; moves?: string[]; annotations?: string[] }
interface Plan { id: string; openingId?: string; overview?: string; criticalPositionFen: string; playableLines?: PlayableLine[] }

const plans: Plan[] = Array.isArray(mpRaw) ? (mpRaw as Plan[]) : ((mpRaw as { plans?: Plan[] }).plans || []);
// Every pro-rep plan regardless of player. Generalized 2026-05-31 (any `pro-`
// openingId, plus the legacy progothamchess/pronaro id spellings) so a new
// player's plan narration cannot escape the board-truth gate.
const PRO = plans.filter((p) => /^pro-/i.test(p.openingId || '') || /pro-?(gothamchess|naroditsky|ericrosen)|progothamchess|pronaro/i.test(p.openingId || p.id || ''));

const CLAIM_RE = /\b([a-h][1-8])-(pawn|knight|bishop|rook|queen|king)\b/gi;
const PIECE_LETTER: Record<string, string> = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };

function frames(startFen: string, moves: string[]): Chess[] {
  const out: Chess[] = [];
  const c = new Chess(startFen);
  out.push(new Chess(c.fen()));
  for (const m of moves) { try { c.move(m); } catch { break; } out.push(new Chess(c.fen())); }
  return out;
}
function bishops(c: Chess): { w: number; b: number } {
  let w = 0, b = 0;
  for (const row of c.board()) for (const sq of row) if (sq && sq.type === 'b') { if (sq.color === 'w') w++; else b++; }
  return { w, b };
}
function ungroundedClaims(text: string, fr: Chess[]): string[] {
  const bad: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(CLAIM_RE.source, 'gi');
  const lo = text.toLowerCase();
  while ((m = re.exec(lo))) {
    const sq = m[1]; const want = PIECE_LETTER[m[2]];
    const ok = fr.some((c) => { const pc = c.get(sq as Parameters<Chess['get']>[0]); return pc && pc.type === want; });
    if (!ok) bad.push(`${sq}-${m[2]}`);
  }
  return bad;
}
const PAIR_RE = /bishop pair|two bishops/i;
const PAIR_EXEMPT = /not\b.{0,15}(bishop pair|two bishops)|keeps? (the )?(two )?bishops|gives? up/i;

describe('pro-rep middlegame-plan narration is board-accurate', () => {
  for (const p of PRO) {
    const lines = p.playableLines || [];
    // hyphenated piece-location claims, per playable line
    lines.forEach((ln, li) => {
      const fr = frames(ln.fen || p.criticalPositionFen, ln.moves || []);
      it(`${p.id} L${li}: hyphenated piece claims are grounded`, () => {
        const offenders: string[] = [];
        for (const a of ln.annotations || []) offenders.push(...ungroundedClaims(a, fr));
        expect(offenders, `ungrounded board claims in ${p.id} line ${li}: ${offenders.join(', ')}`).toEqual([]);
      });
    });

    // bishop-pair advantage claims (overview + all annotations) must be real somewhere in the line
    it(`${p.id}: bishop-pair claims reflect a real 2-vs-<2 on the board`, () => {
      const allFrames: Chess[] = [];
      if (lines.length === 0) allFrames.push(new Chess(p.criticalPositionFen));
      for (const ln of lines) allFrames.push(...frames(ln.fen || p.criticalPositionFen, ln.moves || []));
      const everPair = allFrames.some((c) => { const { w, b } = bishops(c); return (w === 2 && b < 2) || (b === 2 && w < 2); });
      const texts = [p.overview || '', ...lines.flatMap((l) => l.annotations || [])];
      const violators = texts.filter((t) => PAIR_RE.test(t) && !PAIR_EXEMPT.test(t));
      if (violators.length > 0 && !everPair) {
        throw new Error(`${p.id} claims a bishop pair but no side ever holds two bishops vs one: "${violators[0].slice(0, 90)}"`);
      }
    });
  }
});
