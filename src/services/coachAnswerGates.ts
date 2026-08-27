/**
 * coachAnswerGates — the single, shared RUNTIME grounding gate applied to
 * every coach LLM answer, on every surface.
 *
 * Before this existed, the validators were scattered: board-claim on the
 * hint hook, arrow/tactic on CoachTeachPage, the player-stat strip inline
 * in the spine — so the surfaces that bypass the spine (masterclass chat,
 * middlegame practice, live-coach, position narration) shipped UNVALIDATED
 * prose, and the teach hallucination ("the knight on a3" on an empty a3,
 * "Over 1,700 of his games…") sailed through. This module is the one place
 * every gate lives, so wiring a surface = one call.
 *
 * Four gates, in order — each best-effort, never throws into the answer:
 *
 *   0. PLAYER-STAT (enforcing) — drops a sentence attributing a fabricated
 *      number / superlative to a pro when NO player-data tool grounded the
 *      turn ("<pro> plays e4 55%"). The NAME is kept (factual reference);
 *      only the unsupported stat is dropped.
 *   1. BOARD-CLAIM (enforcing) — drops a provably-false piece-on-square /
 *      pin claim against the board the prose describes. Marker-safe: the
 *      lie is removed from BOTH the spoken [VOICE:] block and the visible
 *      prose without breaking [BOARD:]/[[ACTION:]] tags.
 *   2. ARROW (enforcing) — synthesises the [BOARD: arrow:…] markers the
 *      brain forgot for SANs it named (G6 lead-the-eye).
 *   3. TACTIC (audit) — flags tactic vocabulary not in the bounded
 *      TacticsLiveContext.
 *
 * `source` namespaces the audit events to the caller (spine vs a specific
 * surface) so the audit log shows where a gate tripped.
 */
import { Chess } from 'chess.js';
import { logAppAudit } from './appAuditor';
import { validateBoardClaims, stripDisprovenSentences } from './boardClaimValidator';
import { injectCandidateArrows, injectCandidateHighlights, type RankedCandidate } from './arrowEngine';
import { stockfishEngine } from './stockfishEngine';
import { stripUngroundedTacticSentences } from './tacticClaimValidator';
import { stripDisprovenEvalSentences } from './evalClaimValidator';
import { stripDisprovenMaterialSentences } from './materialClaimValidator';
import type { TacticsLiveContext } from '../coach/types';

/** Per-sentence spoken gate for STREAMING-TTS surfaces. Those hand each
 *  sentence to Polly as it arrives — BEFORE any final-text gate can run —
 *  so the gate must run here, on the single sentence about to be spoken.
 *  Returns true if the sentence is safe to speak; false (with an audit) if
 *  it makes a provably-false board-fact claim against `fen`. Cheap: one
 *  `new Chess(fen)` + regexes on one sentence (~0.5–1ms). When `fen` is
 *  absent there's no board to check against, so it passes (speak it). */
export function isSpokenSentenceGrounded(
  sentence: string,
  fen: string | null | undefined,
  source: string,
  tactics?: TacticsLiveContext | null,
): boolean {
  if (!fen) return true;
  try {
    const { violations } = validateBoardClaims(sentence, fen);
    if (violations.length > 0) {
      void logAppAudit({
        kind: 'claim-validator-trip',
        category: 'subsystem',
        source: `${source}.spokenSentenceGate`,
        summary: `dropped a board-false sentence before speaking: "${sentence.slice(0, 60)}"`,
        details: JSON.stringify({ source, sentence: sentence.slice(0, 200), reasons: violations.map((v) => v.reason) }),
        fen,
      });
      return false;
    }
    // TACTIC gate on the spoken sentence (David 2026-06-16): the voice
    // streams BEFORE the spine's final-text gate, so a hallucinated tactic
    // ("knight fork") not in the bounded context would otherwise be SPOKEN.
    // Drop the sentence when it asserts an out-of-vocabulary tactic (kept:
    // negation/avoidance phrasing — see stripUngroundedTacticSentences).
    if (tactics) {
      const t = stripUngroundedTacticSentences(sentence, tactics, undefined, fen);
      if (t.dropped.length > 0) {
        void logAppAudit({
          kind: 'claim-validator-trip',
          category: 'subsystem',
          source: `${source}.spokenSentenceGate`,
          summary: `dropped an ungrounded-tactic sentence before speaking: "${sentence.slice(0, 60)}"`,
          details: JSON.stringify({ source, sentence: sentence.slice(0, 200), dropped: t.dropped.slice(0, 3) }),
          fen,
        });
        return false;
      }
    }
  } catch { /* never block speech on a validator fault */ }
  return true;
}

/** THE shared narration gate for CONTENT GENERATORS (openingGenerator,
 *  walkthroughLlmNarrator, middlegamePlanner, …). A generator produces
 *  per-move / per-position prose offline; this validates ONE such string
 *  against the position it describes and drops only PROVABLY-false
 *  board-fact (piece-on-square / pin) sentences — and, when an engine eval
 *  for that position is known, eval-contradicting sentences too. Positional
 *  phrasing is left untouched (the idea-frontier). Every generator calls
 *  THIS, so there is one source of truth and no drift with the spine (which
 *  uses the same boardClaimValidator/evalClaimValidator primitives).
 *
 *  Returns the cleaned text (may be '' if the whole line was a board lie —
 *  silent beats false). `source` namespaces the audit. */
/** Grade prose that describes a LINE rather than a single position.
 *
 *  David 2026-08-01, on 22 concepts sentences the gate deleted in one lesson:
 *  "that narration was explaining the opening. Nd5 is a move that happens."
 *
 *  That is the whole problem. `gradeNarrationText` asks "is this claim true on
 *  THIS board", which is exactly right for a walkthrough beat — the student is
 *  looking at one position while it is spoken. A concept question explaining an
 *  opening is not like that: its prose ranges over the entire line, naming the
 *  knight that arrives on d5, the pawn that will be on e5, the c4 push. Checked
 *  against move 0 none of those pieces exist yet; checked against the terminus,
 *  the early ones have moved on. Either way TRUE teaching reads as board-false
 *  and is silently deleted.
 *
 *  So a sentence survives if it is true at ANY position the line passes
 *  through. That is not a weaker gate — a claim false at every position on the
 *  line is still dropped, which is the only thing the check can honestly
 *  assert about prose that spans all of them.
 *
 *  Falls back to single-position grading when the caller has no line. */
export function gradeNarrationAcrossLine(
  text: string | undefined,
  fens: readonly string[],
  source: string,
): string | undefined {
  if (!text || !text.trim()) return text;
  if (fens.length === 0) return text;
  if (fens.length === 1) return gradeNarrationText(text, fens[0], source);
  try {
    // A sentence is kept when ANY position on the line keeps it. Running the
    // existing per-position stripper and unioning the survivors reuses one
    // claim checker rather than growing a second, divergent one.
    const survivors = new Set<string>();
    for (const fen of fens) {
      const kept = stripDisprovenSentences(text, fen).clean;
      for (const sentence of kept.split(/(?<=[.!?])\s+/)) {
        const trimmed = sentence.trim();
        if (trimmed) survivors.add(trimmed);
      }
    }
    // BRANCH-AWARE second chance (C5, 2026-08-06): a sentence like "…if White
    // replies f4, the knight lands on d5" is true only one hypothetical move
    // OFF the line — false at every on-line position by construction, so the
    // union above deletes real teaching. Before dropping a sentence, REPLAY
    // the moves it names (chess.js, each single SAN plus the mention-order
    // chain) from every line position and keep it if it is true on any of
    // those branch boards. Deterministic, bounded, and only runs for
    // sentences already headed for the floor.
    const allSentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    const SAN_RE = /\b(?:O-O(?:-O)?|[NBRQK][a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?|[a-h]x[a-h][1-8](?:=[NBRQ])?|[a-h][1-8](?:=[NBRQ])?)[+#]?\b/g;
    for (const sentence of allSentences) {
      if (survivors.has(sentence)) continue;
      const sans = [...new Set((sentence.match(SAN_RE) ?? []).map((s) => s.replace(/[+#]$/, '')))].slice(0, 4);
      if (sans.length === 0) continue;
      const trueOnBranch = fens.some((fen) => {
        // Each named move alone…
        for (const san of sans) {
          try {
            const probe = new Chess(fen);
            if (probe.move(san) && stripDisprovenSentences(sentence, probe.fen()).clean.trim()) return true;
          } catch { /* illegal here — try elsewhere */ }
        }
        // …and the mention-order chain, graded after each legal step.
        try {
          const chain = new Chess(fen);
          for (const san of sans) {
            let m = null;
            try { m = chain.move(san); } catch { m = null; }
            if (!m) break;
            if (stripDisprovenSentences(sentence, chain.fen()).clean.trim()) return true;
          }
        } catch { /* unreplayable — not this fen */ }
        return false;
      });
      if (trueOnBranch) survivors.add(sentence);
    }
    const out = text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence && survivors.has(sentence))
      .join(' ');
    const originalCount = text.split(/(?<=[.!?])\s+/).filter((x) => x.trim()).length;
    const keptCount = out.split(/(?<=[.!?])\s+/).filter((x) => x.trim()).length;
    if (keptCount < originalCount) {
      void logAppAudit({
        kind: 'claim-validator-trip',
        category: 'subsystem',
        source: `${source}.lineGate`,
        summary: `dropped ${originalCount - keptCount} sentence(s) false at EVERY position on the line (${fens.length} checked)`,
      });
    }
    // Returns '' when every sentence is false at every position on the line —
    // the honest answer. An earlier draft handed the original text back here so
    // a beat could never go silent, but that let a single false sentence
    // through untouched, which is precisely what the gate exists to stop. What
    // to do with nothing is the CALLER's decision, not this function's.
    return out;
  } catch {
    return text;
  }
}

export function gradeNarrationText(
  text: string | undefined,
  fen: string | null | undefined,
  source: string,
  evalCp?: number | null,
): string | undefined {
  if (!text || !text.trim() || !fen) return text;
  try {
    let out = text;
    const board = stripDisprovenSentences(out, fen);
    let droppedCount = board.dropped.length;
    out = droppedCount > 0 ? board.clean : out;
    if (typeof evalCp === 'number') {
      const ev = stripDisprovenEvalSentences(out, evalCp);
      droppedCount += ev.dropped.length;
      out = ev.dropped.length > 0 ? ev.clean : out;
    }
    // MATERIAL-DIRECTION claims (David heard "Once White takes the Benko
    // pawn, he's DOWN material" live, 2026-08-13): who is up/down/level is
    // pure piece-counting — checkable, so checked. Hypotheticals stay exempt
    // (the generator's material ledger prevents those at the prompt).
    const mat = stripDisprovenMaterialSentences(out, fen);
    droppedCount += mat.dropped.length;
    out = mat.dropped.length > 0 ? mat.clean : out;
    if (droppedCount > 0) {
      // ── SAY WHAT WAS DROPPED, NOT ONLY WHAT SURVIVED ────────────────────
      //
      // A gate is a backup that should never fire (G0), so when one DOES the
      // only useful question is which producer emitted a board-false sentence
      // and what it said. This logged neither: the summary carried a count,
      // the dropped text was nowhere, and the fen rode inside a `details` JSON
      // string the PostHog bridge does not forward on this kind. So the 2026-08-11
      // sweep found `CoachTeachPage.planMarks.narrationGate` tripping seven
      // times in fourteen days with `narration_text` and `fen` both null —
      // undiagnosable from the durable store, which is the only store that
      // outlives a deploy.
      //
      // The refused sentence goes in `narrationText` because that is the field
      // the bridge already forwards, and it is the honest name for it: this IS
      // the narration, it just never reached anyone.
      // The two strippers disagree on shape: the board one returns
      // `{ sentence, violations }` records, the eval one returns plain strings.
      // Joining them blind gave "[object Object]" — caught by the test before
      // it reached the stream, where it would have made every trip unreadable
      // in a new way.
      const refused = [
        ...board.dropped.map((d) => d.sentence),
        ...(typeof evalCp === 'number' ? stripDisprovenEvalSentences(text, evalCp).dropped : []),
        ...mat.dropped,
      ].filter(Boolean).join(' ');
      void logAppAudit({
        kind: 'claim-validator-trip',
        category: 'subsystem',
        source: `${source}.narrationGate`,
        summary: `dropped ${droppedCount} board/eval-false narration sentence(s): "${refused.slice(0, 160)}"`,
        narrationText: refused,
        // `kept` is a PREVIEW. Twice on 2026-07-31 a 120-char slice was read
        // as a sentence that had been cut off mid-clause, and reported as a
        // bug that didn't exist — so say outright how long the real text is
        // and whether this field is truncated.
        details: JSON.stringify({
          source,
          fen,
          kept: out.slice(0, 120),
          keptLength: out.length,
          keptTruncatedInThisLog: out.length > 120,
        }),
        fen,
      });
    }
    return out;
  } catch {
    return text; // never break generation on a validator fault
  }
}

/** Grade teaching BORROWED from another game — the structure and concept
 *  tiers, spoken under "the same idea shows up in positions like this" and
 *  "as a rule in these positions".
 *
 *  Same stripper, one difference: hypothetical clauses are judged too. The
 *  ordinary gate exempts them because the coach's own "after Be2, the bishop
 *  on e2 eyes h5" describes a board one move away, and deleting that would
 *  delete real teaching. A borrowed note's hypothetical board is not one move
 *  away — it is a different game, and the squares it names are not coming.
 *  A full-game prod run heard two of these in sixteen plies, both riding the
 *  exemption: "White should snap off the bishop on d6" with d6 empty, and "the
 *  king on g1" with the king still on e1. The honest framing is what makes the
 *  borrow legitimate and is exactly what makes the squares dangerous — the
 *  sentence reads as a generalization right up to the square the student then
 *  goes looking for. */
/** Candidate notes rejected while SEARCHING, since the last rollup. */
let probeRejects = 0;
let probeSentences = 0;

/** Take and reset the search-probe tally, for one rollup line per turn. */
export function takeBorrowedProbeStats(): { notes: number; sentences: number } {
  const out = { notes: probeRejects, sentences: probeSentences };
  probeRejects = 0;
  probeSentences = 0;
  return out;
}

export function gradeBorrowedTeaching(
  text: string | undefined,
  fen: string | null | undefined,
  source: string,
  /**
   * 🚨 A SEARCH PROBE IS NOT A GATE TRIP (David's prod log, 2026-08-16).
   *
   * The teaching tier passes this function IN as its selection predicate, so
   * it runs once per CANDIDATE — and every candidate with a false sentence
   * emitted a `claim-validator-trip`. His log came back 130 of them in a
   * twelve-move game: 43% of a 300-entry rolling buffer, which cut the window
   * he could actually see down to four minutes, and read as though the coach
   * had been caught out 130 times. It had not. Those are notes the search
   * looked at and passed over — the tier working.
   *
   * A trip is only a trip when the note was CHOSEN and the student lost a
   * sentence from what was said. Probes tally into one rollup line instead.
   */
  opts?: { probe?: boolean },
): string {
  if (!text || !text.trim()) return '';
  if (!fen) return text;
  try {
    // `requireNamedPiecesPresent` — the half this gate was missing. Everything
    // else here is anchored to a SQUARE, so a borrowed sentence that names no
    // square was unjudgeable and passed by default. Three did, out loud, in a
    // rook endgame (David, prod 2026-08-16): "the knight presses the pawn…
    // bishop and rook can trap", "the bishop pins the rook to the king". No
    // knights or bishops were on the board. See the option's own note for why
    // a square-only filter used as a SELECTOR made this likelier, not rarer.
    const res = stripDisprovenSentences(text, fen, {
      strictHypotheticals: true,
      requireNamedPiecesPresent: true,
    });
    if (res.dropped.length > 0 && opts?.probe) {
      probeRejects += 1;
      probeSentences += res.dropped.length;
    } else if (res.dropped.length > 0) {
      // SAY WHICH KIND. The old line said "naming squares this board does not
      // have" for every drop, so the new class would have been invisible in the
      // stream — and this gate fires ~20 times a ply, which is a lot of log to
      // read wrongly.
      const absent = res.dropped.filter((d) => d.violations.some((v) => v.kind === 'piece-absent')).length;
      void logAppAudit({
        kind: 'claim-validator-trip',
        category: 'subsystem',
        source: `${source}.borrowedTeachingGate`,
        summary: `dropped ${res.dropped.length} sentence(s): ${res.dropped.length - absent} naming squares this board does not have, ${absent} naming pieces it does not have`,
      });
    }
    return res.clean.trim();
  } catch {
    return text;
  }
}

export interface CoachAnswerGateOptions {
  /** The board FEN the prose describes (board + arrow gates need it). When
   *  absent, those two gates are skipped — a surface with no live board
   *  (e.g. opening Q&A) can't have its board-facts checked. */
  fen?: string | null;
  /** The bounded tactics context injected this turn, for the tactic gate. */
  tactics?: TacticsLiveContext | null;
  /** True when a player-data tool returned data this turn — when false the
   *  player-stat gate fires (any pro stat is then ungrounded). Defaults to
   *  false (the safe default for a surface that runs no player tools). */
  playerDataGrounded?: boolean;
  /** Ground-truth engine eval (White's-perspective centipawns) for the
   *  position the prose describes. When present, the eval gate drops a
   *  sentence whose who's-winning claim egregiously contradicts it. */
  evalCp?: number;
  /** Mate distance in plies (positive = White mates). Supersedes evalCp. */
  evalMateIn?: number;
  /** Audit-source namespace, e.g. "coachService" or "masterclassChat". */
  source: string;
}

// groundCoachReply — DELETED (David 2026-07-09: "finish ripping"). It was the
// runtime validate-after bandaid: run every strip gate (eval / player-stat /
// board-claim / move-sequence / tactic / opening-name) on a FREE-composed coach
// answer. The coach no longer free-composes chess — every turn is computed and
// voiced through voiceFacts — so there is nothing to strip. The board-truth
// guarantee is now structural (facts computed in code), not a downstream gate.
// `isSpokenSentenceGrounded` (VoiceChatMic's real-time spoken-sentence check)
// and `applyCandidateArrows` (the arrow-display pass) remain — neither is a
// free-compose gate.

/** Stockfish multipv adapter for the arrow engine: rank the top moves
 *  at `fen` so candidate arrows get engine-rank colors (no LLM, no
 *  per-move eval — one analysis ranks every mention). depth 12 is the
 *  fast-check depth; MultiPV 5 covers green/blue/yellow + a margin. */
async function rankCandidatesAtFen(fen: string): Promise<RankedCandidate[]> {
  const analysis = await stockfishEngine.analyzePosition(fen, 12, { MultiPV: 5 });
  return analysis.topLines
    .map((line) => {
      const uci = line.moves[0] ?? '';
      return { from: uci.slice(0, 2), to: uci.slice(2, 4), rank: line.rank };
    })
    .filter((r) => r.from.length === 2 && r.to.length === 2);
}

/** ASYNC arrow pass — the single arrow standard for chat surfaces.
 *  Strips any markers, finds every move the coach mentioned, resolves
 *  geometry in code, colors by Stockfish rank, and appends
 *  `[BOARD: arrow:from-to:color]` markers. The LLM never picks an
 *  arrow. Fen-bearing surfaces call this after `groundCoachReply`.
 *  Never throws — on any fault returns the text unchanged. */
export async function applyCandidateArrows(
  text: string,
  fen: string | null | undefined,
  source: string,
  opts?: { excludeSan?: string; spokenText?: string },
): Promise<string> {
  if (!text.trim() || !fen) return text;
  try {
    const { text: out, injected } = await injectCandidateArrows(text, fen, rankCandidatesAtFen, opts);
    if (injected.length > 0) {
      void logAppAudit({
        kind: 'coach-narration-spoken',
        category: 'subsystem',
        source: `${source}.arrowEngine`,
        summary: `injected ${injected.length} code-arrow(s): ${injected.map((i) => `${i.san}:${i.color}`).join(', ')}`,
        details: JSON.stringify({ source, injected }),
        fen,
      });
    }
    return out;
  } catch {
    return text; // never block the reply on an arrow fault
  }
}

/** Code-derived HIGHLIGHT markers for a coach answer — the highlight twin
 *  of `applyCandidateArrows` (G0: highlights are derived from the squares
 *  the coach NAMED in prose, never drawn by the LLM). Returns just the
 *  marker strings to append; the caller parses them onto the board. Never
 *  throws. Synchronous — no engine needed (highlights are geometry-free). */
export function candidateHighlightMarkers(text: string, source: string): string[] {
  if (!text.trim()) return [];
  try {
    const { markers, squares } = injectCandidateHighlights(text);
    if (squares.length > 0) {
      void logAppAudit({
        kind: 'coach-narration-spoken',
        category: 'subsystem',
        source: `${source}.highlightEngine`,
        summary: `injected ${squares.length} code-highlight(s): ${squares.join(', ')}`,
        details: JSON.stringify({ source, squares }),
      });
    }
    return markers;
  } catch {
    return [];
  }
}
