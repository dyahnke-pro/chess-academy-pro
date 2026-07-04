/**
 * moveSequenceValidator — drops a coach sentence that narrates an ILLEGAL
 * move SEQUENCE (a "combination" / line) against the live board.
 *
 * The single-position gates (boardClaimValidator, tacticClaimValidator) check
 * facts about ONE position: is this piece here, is this named tactic in the
 * bounded context. They CANNOT catch a fabricated multi-move LINE where each
 * move is individually legal from the CURRENT board but the SEQUENCE is
 * impossible.
 *
 * The live bug (David 2026-07-04, /coach/teach calculation trainer — Stockfish
 * hung on iOS, so the ungrounded LLM free-reasoned a "combo"):
 *   "Play Qh5+. If Black blocks with g6, Qxe4 wins the knight and hits the
 *    rook on h8."
 * chess.js: after `Qh5+ g6`, `Qxe4` is ILLEGAL (the queen can't reach e4 from
 * h5). Both Qh5 and Qxe4 are legal from the *current* board, so the arrow
 * engine drew both and every single-position gate passed — only replaying the
 * LINE move-by-move catches the fabrication.
 *
 * Conservative by design — it must never drop legitimate teaching:
 *   - only sentences framed as a SEQUENCE (if/then/wins/leads-to/…),
 *   - AND that explicitly narrate the opponent's REPLY (a real back-and-forth
 *     line — "if Black blocks with g6", "Black responds", "after …"), so a
 *     one-sided White plan ("Qh5, then Rd1 to double") is never touched,
 *   - never a disjunction ("Qh5 or Nf3" = candidate options, not a line),
 *   - needs >= 2 SAN moves,
 *   - the FIRST move must be legal (a real line start; a bad first move is the
 *     board gate's job), and it trips ONLY when a LATER move is illegal in the
 *     replayed line — the exact fabrication signature.
 */
import { Chess } from 'chess.js';
import { extractMentionedSans, stripBoardMarkers } from './arrowEngine';

/** The sentence frames a described line ("if … then …", "wins", "leads to"). */
const SEQUENCE_FRAMING =
  /\b(if|then|after|follows?|followed|follow-?up|wins?|leads?\s+to|and\s+then|forces?|combo|combination|next|continues?|recaptur\w*)\b/i;

/** The sentence explicitly narrates the OPPONENT's reply — the marker that
 *  distinguishes a real back-and-forth line (checkable) from a one-sided plan. */
const OPPONENT_REPLY =
  /\b(if\s+(?:black|white|they|he|she)\b|(?:black|white)\s+(?:plays|blocks|responds?|replies|takes|recaptur\w*|meets|answers|defends|interposes)|responds?\s+(?:with|by)|repl(?:y|ies)\s+with|blocks?\s+with|interposes?\s+with|after\s+[.\wKQRBNOx+#-]+)\b/i;

/** Candidate options, not a forced line — never checked as a sequence. */
const DISJUNCTION = /\b(?:or|either|alternativ\w*|instead|versus|vs\.?)\b/i;

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

/** Drop any sentence that describes an illegal move sequence against `fen`.
 *  Returns the cleaned text + the dropped sentence prose (for the audit). */
/** Replay a SAN line from `fen`. Returns 'ok' (all legal), 'bad-start' (the
 *  FIRST move is illegal — not our gate's concern), or 'illegal-continuation'
 *  (the line starts legally but a LATER move is impossible — the fabrication). */
function replayLine(fen: string, sans: string[]): 'ok' | 'bad-start' | 'illegal-continuation' {
  const board = new Chess(fen);
  for (let i = 0; i < sans.length; i++) {
    try {
      board.move(sans[i].replace(/[+#]$/, '')); // strip check/mate glyphs
    } catch {
      return i === 0 ? 'bad-start' : 'illegal-continuation';
    }
  }
  return 'ok';
}

export function stripIllegalMoveSequences(
  text: string,
  fen: string | null | undefined,
): { clean: string; dropped: string[] } {
  if (!text || !text.trim() || !fen) return { clean: text, dropped: [] };
  const dropped: string[] = [];
  const sentences = splitSentences(text);
  const sansPerSentence = sentences.map((s) => extractMentionedSans(stripBoardMarkers(s)));

  const kept: string[] = [];
  for (let idx = 0; idx < sentences.length; idx++) {
    const sentence = sentences[idx];
    const prose = stripBoardMarkers(sentence);
    // Only examine sentences framed as a described back-and-forth line, never
    // option-lists or one-sided plans.
    if (!SEQUENCE_FRAMING.test(prose) || !OPPONENT_REPLY.test(prose) || DISJUNCTION.test(prose)) {
      kept.push(sentence);
      continue;
    }
    const sans = sansPerSentence[idx];
    if (sans.length < 1) {
      kept.push(sentence);
      continue;
    }
    // A forcing line often spans two sentences ("Play Qh5+. If Black blocks
    // with g6, Qxe4 wins…") — the line-start sits in the PRIOR sentence. Try
    // the sentence alone AND anchored with the prior sentence's moves. A drop
    // requires a line that STARTS legally then hits an illegal continuation.
    let hit = false;
    try {
      const candidates: string[][] = [sans];
      const prior = idx > 0 ? sansPerSentence[idx - 1] : [];
      if (prior.length > 0) candidates.push([...prior, ...sans]);
      for (const line of candidates) {
        if (line.length < 2) continue;
        if (replayLine(fen, line) === 'illegal-continuation') { hit = true; break; }
      }
    } catch {
      kept.push(sentence); // unparseable FEN — leave to other gates
      continue;
    }
    if (hit) dropped.push(prose.trim().slice(0, 140));
    else kept.push(sentence);
  }

  return { clean: kept.join(' ').replace(/\s+/g, ' ').trim(), dropped };
}
