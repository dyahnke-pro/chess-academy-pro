/**
 * evalClaimValidator — runtime gate for EVALUATION claims in coach prose.
 *
 * The board-claim validator catches lies about WHERE the pieces are; this
 * catches lies about WHO IS WINNING — checked against the ground-truth
 * Stockfish eval already in context (`evalCp` / `evalMateIn`, White's
 * perspective). Production audit (build 4e628e5): the brain said "you're
 * up a pawn" right after losing its queen for a knight. The pieces were
 * placed correctly; the ASSESSMENT lied. `narrationAccuracy` /
 * `soundness-sweep` catch this at BUILD time on curated lessons; this is
 * the runtime equivalent for live LLM prose.
 *
 * DESIGN PRINCIPLE (David: "empty > generic > invented", and don't drop a
 * legit judgment call): flag ONLY HARD, egregious contradictions, never a
 * fuzzy human assessment. "Roughly equal" at +0.8 is a legitimate read,
 * NOT a lie — so the thresholds are deliberately generous (multi-pawn
 * gaps). We'd rather miss a borderline mis-assessment than strip a
 * reasonable one. The eval must be present (a real engine number) — with
 * no eval in context there's nothing to contradict, so nothing is flagged.
 *
 * Pure / read-only. Callers strip the offending sentence before it's
 * spoken or shown.
 */

export interface EvalClaimViolation {
  /** The offending phrase, verbatim. */
  claim: string;
  /** Plain-language reason (for audits). */
  reason: string;
}

export interface EvalClaimResult {
  ok: boolean;
  violations: EvalClaimViolation[];
}

/** Conservative thresholds in centipawns (White's perspective). */
const EQUAL_CONTRADICTION_CP = 300; // "equal" is a lie when one side is up ≥3 pawns
const DIRECTIONAL_CONTRADICTION_CP = 200; // "X is better" is a lie when the OTHER side is up ≥2
const WINNING_CONTRADICTION_CP = 200; // "X is winning" is a lie when the OTHER side is up ≥2

const EQUAL_RE = /\b(?:roughly\s+|approximately\s+|dead[\s-]+|completely\s+|about\s+)?(?:equal|even|balanced|level|drawish|drawn|symmetric)\b/i;
const WINNING_RE = /\b(white|black)\s+is\s+(?:completely\s+|totally\s+|clearly\s+|just\s+)?(winning|crushing|lost|losing|busted)\b/i;
const DECISIVE_RE = /\b(white|black)\s+has\s+a\s+(?:decisive|winning|crushing)\s+(?:advantage|edge)\b/i;
const BETTER_RE = /\b(white|black)\s+is\s+(?:clearly\s+|much\s+|significantly\s+|considerably\s+)?better\b/i;
/** Forced-mate claims: "White has a forced mate", "Black mates in 3",
 *  "White delivers checkmate", "Black is getting mated". A mate is the
 *  strongest who's-winning claim, so it reuses the contradiction logic
 *  below — flagged only when the engine clearly has the OTHER side ahead
 *  (conservative: a position the engine reads as even/favourable for the
 *  claimant is left alone, since a shallow search can miss a deep mate). */
const MATE_RE = /\b(white|black)\b[^.,;]{0,24}?\b(has\s+(?:a\s+)?(?:forced\s+)?mate|mates?\s+in\s+\d+|delivers?\s+(?:check)?mate|is\s+(?:getting\s+|about\s+to\s+be\s+)?mated|will\s+be\s+mated)\b/i;

/** Split into rough sentence units (mirrors boardClaimValidator). */
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}

/** Validate evaluation claims in `text` against the engine eval.
 *  `evalCp` is White's-perspective centipawns; `mateIn` is mate distance
 *  in plies (positive = White mates). Either may be undefined. */
export function validateEvalClaims(
  text: string,
  evalCp: number | undefined,
  mateIn?: number,
): EvalClaimResult {
  const violations: EvalClaimViolation[] = [];
  const hasMate = typeof mateIn === 'number' && mateIn !== 0;
  const hasCp = typeof evalCp === 'number';
  if (!hasMate && !hasCp) return { ok: true, violations: [] }; // nothing to check against

  // Effective White-perspective score (>0 white better, <0 black better):
  // a mate dominates a cp number. The typeof guard narrows mateIn here.
  const whiteAhead =
    typeof mateIn === 'number' && mateIn !== 0
      ? (mateIn > 0 ? 100000 : -100000)
      : (evalCp ?? 0);

  for (const sentence of splitSentences(text)) {
    // "equal / balanced / level" — contradicted by a multi-pawn gap.
    if (EQUAL_RE.test(sentence) && Math.abs(whiteAhead) >= EQUAL_CONTRADICTION_CP) {
      violations.push({
        claim: sentence.slice(0, 80),
        reason: `calls the position equal but the engine eval is ${(whiteAhead / 100).toFixed(1)} (White's perspective)`,
      });
      continue;
    }
    // "White/Black is winning / crushing / losing / lost / busted", or
    // "White/Black has a decisive advantage" — resolve who is CLAIMED to
    // be winning, then contradict when the engine has the other side ahead.
    let claimedWinnerIsWhite: boolean | null = null;
    const decM = DECISIVE_RE.exec(sentence);
    const winM = WINNING_RE.exec(sentence);
    const mateM = MATE_RE.exec(sentence);
    if (decM) {
      claimedWinnerIsWhite = decM[1].toLowerCase() === 'white';
    } else if (winM) {
      const side = winM[1].toLowerCase();
      const verb = winM[2].toLowerCase();
      // "winning/crushing" → that side; "losing/lost/busted" → the other.
      claimedWinnerIsWhite = (verb === 'winning' || verb === 'crushing') ? side === 'white' : side !== 'white';
    } else if (mateM) {
      const side = mateM[1].toLowerCase();
      // "...is mated / getting mated / will be mated" → that side LOSES;
      // every other phrase ("has mate", "mates in 3", "delivers mate") →
      // that side WINS.
      const beingMated = /mated\b/.test(mateM[2].toLowerCase()) && !/mates?\s+in/.test(mateM[2].toLowerCase());
      claimedWinnerIsWhite = beingMated ? side !== 'white' : side === 'white';
    }
    if (claimedWinnerIsWhite !== null) {
      if (claimedWinnerIsWhite && whiteAhead <= -WINNING_CONTRADICTION_CP) {
        violations.push({ claim: sentence.slice(0, 80), reason: `says White is winning but the engine has Black ahead by ${(Math.abs(whiteAhead) / 100).toFixed(1)}` });
        continue;
      }
      if (!claimedWinnerIsWhite && whiteAhead >= WINNING_CONTRADICTION_CP) {
        violations.push({ claim: sentence.slice(0, 80), reason: `says Black is winning but the engine has White ahead by ${(whiteAhead / 100).toFixed(1)}` });
        continue;
      }
    }
    // "White/Black is (much/clearly) better" — contradicted when the OTHER
    // side is ahead by ≥2 pawns.
    const betterM = BETTER_RE.exec(sentence);
    if (betterM) {
      const side = betterM[1].toLowerCase();
      if (side === 'white' && whiteAhead <= -DIRECTIONAL_CONTRADICTION_CP) {
        violations.push({ claim: sentence.slice(0, 80), reason: `says White is better but the engine has Black ahead by ${(Math.abs(whiteAhead) / 100).toFixed(1)}` });
      } else if (side === 'black' && whiteAhead >= DIRECTIONAL_CONTRADICTION_CP) {
        violations.push({ claim: sentence.slice(0, 80), reason: `says Black is better but the engine has White ahead by ${(whiteAhead / 100).toFixed(1)}` });
      }
    }
  }

  return { ok: violations.length === 0, violations };
}

/** Drop sentences whose evaluation claim is egregiously contradicted by
 *  the engine. Marker-aware via the caller; here we operate on prose. */
export function stripDisprovenEvalSentences(
  text: string,
  evalCp: number | undefined,
  mateIn?: number,
): { clean: string; dropped: string[] } {
  const { violations } = validateEvalClaims(text, evalCp, mateIn);
  if (violations.length === 0) return { clean: text, dropped: [] };
  const dropClaims = new Set(violations.map((v) => v.claim));
  const dropped: string[] = [];
  const kept: string[] = [];
  for (const s of splitSentences(text)) {
    if (dropClaims.has(s.slice(0, 80))) dropped.push(s);
    else kept.push(s);
  }
  return { clean: kept.join(' ').trim(), dropped };
}
