#!/usr/bin/env node
/**
 * distill-v2 — STAGE 0 of the corpus determinism pipeline. Replaces distill.mjs.
 *
 * WHY v1 CAPPED OUT (measured, not guessed):
 *   - ONE DeepSeek call per video at `max_tokens: 8000` → 10.8 notes/video
 *     (median 10) against 60-100 teachable moments in a 40-minute video. The
 *     ceiling was the token budget, not the content.
 *   - Its truncation retry re-asked for "AT MOST the 12 most valuable teaching
 *     moments", so the densest videos were capped hardest.
 *   - It asked the MODEL for `moves` — an absolute SAN sequence from move 1 —
 *     off unpunctuated auto-captions. That is the one thing an LLM reliably
 *     cannot do, so 3,710 of 4,529 notes shipped with no position at all and
 *     could only ever reach the coach as advisory prompt context (a G0
 *     violation: the model then DECIDES whether to speak them).
 *
 * v1 let the LLM decide the moves. That is the same disease the whole app is
 * built to prevent (G0/G3), one layer upstream in the content pipeline.
 *
 * THE INVERSION: code owns the moves, the model owns only the prose.
 *   1. He SAYS the moves out loud ("knight f3", "bishop takes d5", "castles").
 *      Parse those spoken tokens and resolve each against a LIVE chess.js
 *      board — the board itself disambiguates, so no recall is required.
 *   2. That gives a timeline: transcript offset → exact SAN prefix. Every note
 *      is then BORN with its position. No post-hoc anchoring, no guessing.
 *   3. Chunk the transcript and make one small call PER CHUNK asking for prose
 *      ONLY — no moves field exists in the schema. Density now scales with
 *      video length instead of being clipped by one 8k reply.
 *
 * SAFETY (empty > invented, per CLAUDE.md):
 *   - A spoken token that is ILLEGAL in the current position is skipped, never
 *     forced. Speech is noisy; a wrong board is worse than no board.
 *   - If the tracker loses the thread (too many consecutive unresolvable move
 *     candidates) it stops emitting positions for the rest of that video and
 *     the notes fall back to opening-name keying. It never emits a position it
 *     is not sure of.
 *   - Speedruns contain many games. When a token is illegal here but legal from
 *     a fresh board, that is a new game — reset and keep tracking.
 *   - The v1 plagiarism guard is unchanged: 7-gram overlap against the
 *     transcript kills a note. Transcripts stay local and are never shipped.
 *
 * Usage:
 *   node scripts/danya-corpus/distill-v2.mjs [--id VIDEOID] [--limit N]
 *                                            [--concurrency 4] [--dry]
 *                                            [--creator naroditsky|chessbrah]
 *   --dry  runs the board tracker + chunker and reports coverage WITHOUT
 *          calling the model. Use it to verify tracking before spending tokens.
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { Chess } from 'chess.js';
import { resolveCreator } from './creator.mjs';

const CREATOR = resolveCreator();
const TDIR = CREATOR.transcripts;
const DDIR = CREATOR.distilledV2;
const KEY = process.env.DEEPSEEK_KEY ?? process.env.VITE_DEEPSEEK_API_KEY ?? '';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : dflt;
};
const has = (name) => process.argv.includes(`--${name}`);
const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// ── TRANSCRIPT ────────────────────────────────────────────────────────────
/** Parse a YouTube auto-sub VTT into clean running text. Auto-subs repeat each
 *  line across overlapping cues, so collapse consecutive duplicates and the
 *  rolling-window A,B,B,C,C artifact. (Same logic as v1 — it worked.) */
export function vttToText(vtt) {
  const lines = [];
  for (const raw of vtt.split('\n')) {
    const line = raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!line) continue;
    if (/^WEBVTT|^Kind:|^Language:|^NOTE/.test(line)) continue;
    if (/^\d{2}:\d{2}/.test(line) && line.includes('-->')) continue;
    if (/^\d+$/.test(line)) continue;
    if (lines[lines.length - 1] === line) continue;
    lines.push(line);
  }
  const out = [];
  for (const l of lines) {
    if (out[out.length - 1] === l || out[out.length - 2] === l) continue;
    out.push(l);
  }
  return out.join(' ');
}

// ── SPOKEN CHESS → SAN CANDIDATES ─────────────────────────────────────────
const PIECE_LETTER = { knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' };

/** Scan running text for spoken move mentions, in order, and emit CANDIDATE
 *  SAN strings with the character offset where each was said.
 *
 *  Deliberately NOT greedy about descriptive phrasing: "the knight on f6" and
 *  "his bishop on b5" describe where a piece ALREADY sits — consuming those as
 *  moves is what would corrupt the board. Only movement phrasings are emitted
 *  ("knight f3", "knight to f3", "knight takes d5"), and even then the move
 *  only counts if chess.js says it is legal right now. */
export function spokenMoveCandidates(text) {
  const out = [];
  // SPAN CLAIMING, by descending confidence. The patterns genuinely overlap:
  // "knight f3" is also matched by the bare-pawn pattern as `f3`, and "knight
  // takes d5" is also matched by the pawn-capture pattern. Emitting both is not
  // harmless — after `Nf3` plays, a phantom `f3` push can ALSO be legal, which
  // silently corrupts the board and every position downstream of it. So a lower
  // -confidence pattern may never re-consume text a stronger one already took.
  const claimed = [];
  const free = (s, e) => !claimed.some(([cs, ce]) => s < ce && e > cs);
  const take = (m, sans) => {
    const s = m.index;
    const e = m.index + m[0].length;
    if (!free(s, e)) return;
    claimed.push([s, e]);
    const list = sans.filter(Boolean);
    if (list.length) out.push({ index: s, sans: list });
  };

  // 1. Piece moves: "knight (to|takes|captures)? f3". `on` excluded on purpose —
  //    "the knight on f6" describes where a piece already sits.
  const pieceRe = new RegExp(
    String.raw`\b(knight|bishop|rook|queen|king)\s+(?:(to|takes|captures|goes to|back to)\s+)?([a-h])\s?([1-8])\b`,
    'gi',
  );
  for (const m of text.matchAll(pieceRe)) {
    const verb = (m[2] || '').toLowerCase();
    if (verb === '' && /\bon\s*$/i.test(text.slice(Math.max(0, m.index - 8), m.index))) continue;
    const P = PIECE_LETTER[m[1].toLowerCase()];
    const sq = `${m[3].toLowerCase()}${m[4]}`;
    const cap = verb === 'takes' || verb === 'captures';
    // Both forms — the board decides which is real.
    take(m, cap ? [`${P}x${sq}`, `${P}${sq}`] : [`${P}${sq}`, `${P}x${sq}`]);
  }

  // 2. Castling.
  for (const m of text.matchAll(/\b(castles?|castling)\b(?:\s+(short|long|king\s?side|queen\s?side))?/gi)) {
    const side = (m[2] || '').toLowerCase().replace(/\s/g, '');
    if (side === 'long' || side === 'queenside') take(m, ['O-O-O']);
    else if (side === 'short' || side === 'kingside') take(m, ['O-O']);
    else take(m, ['O-O', 'O-O-O']);
  }

  // 3. Pawn captures: "takes on d5" / "captures d5" / "e takes d5".
  for (const m of text.matchAll(/\b(?:([a-h])\s+)?(?:takes|captures)\s+(?:on\s+)?([a-h])\s?([1-8])\b/gi)) {
    const file = (m[1] || '').toLowerCase();
    const sq = `${m[2].toLowerCase()}${m[3]}`;
    // Every legal pawn capture onto that square, plus the explicit file form.
    const forms = file ? [`${file}x${sq}`] : [];
    for (const f of 'abcdefgh') forms.push(`${f}x${sq}`);
    take(m, forms);
  }

  // 4. Bare pawn pushes: "e4", "d5", "pawn to e4". Lowest confidence — a bare
  //    square is also how squares get named ("the d5 square"), so these are
  //    skipped when followed by a naming word, and only survive if legal.
  for (const m of text.matchAll(/\b(?:pawn\s+(?:to\s+)?)?([a-h])\s?([1-8])\b/gi)) {
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 10).toLowerCase();
    if (/^\s*(square|squares|file|rank|diagonal|pawn|knight|bishop|rook|queen|king)/.test(after)) continue;
    take(m, [`${m[1].toLowerCase()}${m[2]}`]);
  }

  out.sort((a, b) => a.index - b.index);
  return out;
}

/** Replay the spoken candidates against a live board, producing a timeline of
 *  { index, lineSan } checkpoints — the exact position as of that point in the
 *  transcript. Returns `null` positions once the thread is lost. */
export function trackBoard(text, opts = {}) {
  const maxMisses = opts.maxMisses ?? 40;
  const candidates = spokenMoveCandidates(text);
  const timeline = [];
  let game = new Chess();
  let line = [];
  let misses = 0;
  let lost = false;
  let games = 1;
  let resolved = 0;

  for (const cand of candidates) {
    if (lost) break;
    let played = null;
    for (const san of cand.sans) {
      try {
        const m = game.move(san);
        if (m) { played = m.san; break; }
      } catch { /* not legal in this position — try the next form */ }
    }
    if (played) {
      line.push(played);
      resolved += 1;
      misses = 0;
      timeline.push({ index: cand.index, lineSan: line.slice() });
      continue;
    }
    // A speedrun rolls into a new game. If the token is illegal here but legal
    // from a fresh board AND we are past the opening, treat it as a new game.
    if (line.length >= 8) {
      const probe = new Chess();
      let fresh = null;
      for (const san of cand.sans) {
        try { const m = probe.move(san); if (m) { fresh = m.san; break; } } catch { /* no */ }
      }
      if (fresh) {
        game = probe; line = [fresh]; games += 1; misses = 0;
        timeline.push({ index: cand.index, lineSan: line.slice() });
        continue;
      }
    }
    // Speech is noisy — a stray unresolvable token is normal. Sustained failure
    // means the board no longer reflects the game, so stop rather than lie.
    if (++misses > maxMisses) lost = true;
  }
  return { timeline, resolved, candidates: candidates.length, games, lost };
}

// ── DB ALIGNMENT (the correction) ─────────────────────────────────────────
/**
 * `trackBoard` above CANNOT be trusted on real auto-captions, and the --dry
 * run proved it: on a single Glek theory video it reported 15 "games", not one
 * of which even began with e4. Two reasons, and the second is fundamental:
 *   - Captions are unpunctuated, so a move he PLAYS and a square he NAMES
 *     ("control of d5", "the f4 idea") are syntactically identical. 771
 *     candidates, 111 "resolved" — and those resolved by coincidence, because
 *     from any position a lot of random pawn moves happen to be legal.
 *   - He is TEACHING, so he narrates hypothetical branches constantly ("if he
 *     plays f4, then g5"). No amount of parsing separates the line played from
 *     a line merely discussed.
 * Freely replaying candidates therefore manufactures plausible garbage, and the
 * new-game reset heuristic HID it (trackerLost never fired). That is strictly
 * worse than v1: v1 gave the model no position, this gave it a confident lie.
 *
 * The fix applies the rule the rest of the app already lives by (G3): THE DB
 * OWNS THE MOVES. The transcript is downgraded to supplying only the TIMING —
 * where in the video each move gets discussed. We find which real DB line the
 * mentioned moves trace, in order, and use THAT line's plies as the positions.
 * A chain that matches no real opening yields no position at all.
 */
/**
 * Deterministic opening tag from the VIDEO TITLE — the model no longer emits
 * an `opening` field at all. v1 let the model guess it and the guesses were
 * wrong at scale (543 corpus notes anchored on a different opening than their
 * tag; the first v2 run tagged Scotch/KID/Italian on a Glek video and asserted
 * the Glek is "in the Ruy Lopez"). One video = one topic, and the title names
 * it — match the title's tokens against the DB's opening names and store the
 * DB's canonical name. No match => null, never a guess.
 */
// Structural words that appear in most DB names and carry no identity. Without
// stripping them, segment matching goes rogue: "Caro-Kann Fantasy" matched
// "Ruy Lopez: Morphy Defense, Caro Variation" (via the "Caro Variation"
// segment) and "The Najdorf Sicilian" matched "Pterodactyl Defense: Sicilian".
// NOTE: 'attack' is deliberately NOT generic — it is identity-bearing (King's
// Indian ATTACK vs DEFENSE, Grand Prix Attack, Austrian Attack). Stripping it
// made "King's Indian Defense Explained" stamp as King's Indian Attack on a
// shorter-name tiebreak.
const GENERIC_NAME_TOKENS = new Set([
  'variation', 'defense', 'defence', 'game', 'opening', 'system',
  'main', 'line', 'accepted', 'declined', 'the', 'with', 'and',
]);

// Words that are ordinary chess or English vocabulary. They may appear IN a
// name, but a name segment made only of these identifies nothing — see the
// eligibility check in openingFromTitle.
const ORDINARY_WORDS = new Set([
  'endgame', 'middlegame', 'castling', 'castle', 'push', 'full', 'early',
  'late', 'normal', 'quiet', 'general', 'basic', 'simple', 'double', 'single',
  'long', 'short', 'fast', 'slow', 'big', 'small', 'first', 'second', 'third',
  'other', 'another', 'best', 'better', 'good', 'bad', 'new', 'old',
  // 'center' costs us the Center Game, which really is named for it — but the
  // word is unavoidable in chess prose, and it was tagging 52 notes of generic
  // structure advice as that opening with not one position among them. A rare
  // opening left untagged beats a common word mislabelling everything.
  'center', 'centre',
]);

const distinctiveTokens = (s) =>
  [...new Set(norm(s).split(' ').filter((t) => t.length > 2 && !GENERIC_NAME_TOKENS.has(t)))];

export function openingFromTitle(title, dbNames) {
  const titleTokens = new Set(norm(title).split(' ').filter((t) => t.length > 2));
  if (titleTokens.size === 0) return null;
  let best = null;
  for (const name of dbNames) {
    // ELIGIBILITY: some segment of the name (full, colon part, comma part) has
    // all its distinctive tokens in the title. Titles say "Glek System"; the DB
    // says "Four Knights Game: Glek System" — full-name matching alone fails.
    const segments = [name, ...name.split(/[:,]/)];
    const eligible = segments.some((seg) => {
      const d = distinctiveTokens(seg);
      // A segment may only establish eligibility if something in it actually
      // IDENTIFIES an opening. The DB is full of segments that reduce to one
      // ordinary word — "Endgame Variation", "Full Line", "Push Variation",
      // "Castling Line" — and those matched any title containing that word:
      // "The Rook Endgame Myth Nobody Talks About" was stamped Caro-Kann
      // Defense: Endgame Variation, and 782 Saint Louis notes of generic
      // king-and-pawn technique shipped under that tag (2026-08-02). A proper
      // noun or a real phrase can name a line; the word "endgame" cannot.
      if (d.length === 0 || !d.some((t) => !ORDINARY_WORDS.has(t))) return false;
      return d.every((t) => titleTokens.has(t));
    });
    if (!eligible) continue;
    // RANK by how much of the FULL name the title confirms — distinctive tokens
    // first (so "Caro-Kann: Fantasy Variation" beats plain "Caro-Kann" on a
    // Fantasy video, and "Sicilian: Najdorf" beats "Pterodactyl: Sicilian,
    // Unpin" whose pterodactyl/unpin the title never mentions), then generic
    // tokens (so "King's Indian DEFENSE" beats a same-distinctive sibling when
    // the title says "Defense"), then the shorter canonical name.
    const dAll = distinctiveTokens(name);
    const dHits = dAll.filter((t) => titleTokens.has(t)).length;
    // CONFIRM ENOUGH OF THE NAME. One token out of a long name is not
    // identification, it is a coincidence: "Capablanca's Endgames" matched
    // Queen's Indian Defense: Capablanca Variation, "Vassily Ivanchuk's Best
    // Endgames" matched Sicilian: Alapin, Stoltz Attack, Ivanchuk Line — the
    // surname is in the title because the lecture is ABOUT the player. So a
    // short name must be confirmed whole ("Vienna Game", "London System" carry
    // one distinctive token and one is all there is), while a longer one needs
    // at least two. This does cost the odd showcase title like "The Glek
    // System", which names only its sub-variation — untagged beats mistagged.
    if (dHits < Math.min(2, dAll.length)) continue;
    // A ONE-WORD NAME MUST BE SAID IN FULL. Names like "Vienna Game" or
    // "London System" carry a single distinctive token, so the rule above lets
    // one hit through — and that let "Bishop Endgames" become Bishop's Opening
    // (385 notes) and any lecture ABOUT Rubinstein become Rubinstein Opening
    // (261). The word is in the title because it is a piece, or a person, not
    // because it is the opening. Requiring the whole name as a phrase
    // separates them: "Vienna Game Basics" says "vienna game", a lecture on
    // Rubinstein's endgames never says "rubinstein opening".
    if (dAll.length === 1 && !` ${norm(title)} `.includes(` ${norm(name)} `)) continue;
    // The generic bonus exists for exactly one tie: same-distinctive siblings
    // split by DEFENSE (vs Attack). Counting other generic words backfires —
    // a title saying "Variation" promoted "Masi Variation" over the plain
    // family, and "with" promoted "London System, with Bd3".
    const gHits = ['defense', 'defence'].filter((t) => norm(name).includes(t) && titleTokens.has(t)).length;
    if (!best || dHits > best.dHits || (dHits === best.dHits && gHits > best.gHits) ||
        (dHits === best.dHits && gHits === best.gHits && name.length < best.name.length)) {
      best = { name, dHits, gHits };
    }
  }
  return best ? best.name : null;
}

export function buildDbLineIndex(openings) {
  const lines = [];
  for (const o of openings) {
    const moves = String(o.pgn || '').trim().split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));
    if (moves.length >= 6) lines.push({ name: o.name, moves });
  }
  // Longest first: prefer the deepest line consistent with what he discussed.
  lines.sort((a, b) => b.moves.length - a.moves.length);
  return lines;
}

/** Align the spoken move mentions to the best-matching real DB line.
 *  Returns { line, name, checkpoints, matched, coverage } or null when nothing
 *  clears the bar. `checkpoints` maps a transcript offset to the SAN prefix of
 *  the DB line as of that mention — so positions are always real theory. */
export function alignToDbLine(text, dbLines, opts = {}) {
  const minMatched = opts.minMatched ?? 6;
  const minCoverage = opts.minCoverage ?? 0.6;

  // FAIL CLOSED. Discovering the line from the transcript body does not work —
  // three scoring schemes each returned a confident WRONG answer on the same
  // Glek video (free replay: 15 invented "games"; DB subsequence: King's Indian
  // Attack at coverage 1.0; DB clustered: Scotch Fraser). So an external prior
  // is REQUIRED: the video's own title names the opening, and only DB lines
  // matching that name may be considered. No hint, or no name match => no
  // positions at all, and notes fall back to opening-name keying. A wrong
  // position handed to the model as authoritative is worse than none (it is
  // exactly the "Bg5 pins the knight" failure, manufactured at scale).
  const hint = norm(opts.nameHint || '');
  const hintTokens = new Set(hint.split(' ').filter((t) => t.length > 3));
  if (hintTokens.size === 0) return null;
  const candidateLines = dbLines.filter((l) => {
    const lt = new Set(norm(l.name).split(' ').filter((t) => t.length > 3));
    if (lt.size === 0) return false;
    let shared = 0;
    for (const t of lt) if (hintTokens.has(t)) shared += 1;
    return shared / Math.min(lt.size, hintTokens.size) >= 0.6;
  });
  if (candidateLines.length === 0) return null;
  dbLines = candidateLines;

  // SAN -> ascending offsets where it was mentioned.
  const mentions = new Map();
  for (const cand of spokenMoveCandidates(text)) {
    for (const san of cand.sans) {
      const bucket = mentions.get(san) ?? [];
      bucket.push(cand.index);
      mentions.set(san, bucket);
    }
  }
  if (mentions.size === 0) return null;

  // CLUSTERING is what makes the match mean something. A plain in-order
  // subsequence match is far too weak: with hundreds of scattered mentions
  // almost any short DB line threads through at coverage 1.0 — which is how a
  // Glek video first "aligned" to King's Indian Attack. The opening actually
  // gets walked in a TIGHT BURST, so consecutive moves of the real line are
  // mentioned close together. Require that, and score density over length.
  const maxGap = opts.maxGap ?? 2500;
  let best = null;
  for (const dbLine of dbLines) {
    let cursor = -1;
    let matched = 0;
    let first = -1;
    const checkpoints = [];
    for (let i = 0; i < dbLine.moves.length; i += 1) {
      const offsets = mentions.get(dbLine.moves[i]);
      if (!offsets) continue;
      // Next mention after the previous match AND within the burst window.
      const at = offsets.find((o) => o > cursor && (cursor < 0 || o - cursor <= maxGap));
      if (at === undefined) continue;
      if (first < 0) first = at;
      cursor = at;
      matched += 1;
      checkpoints.push({ index: at, lineSan: dbLine.moves.slice(0, i + 1) });
    }
    const coverage = matched / dbLine.moves.length;
    if (matched < minMatched || coverage < minCoverage) continue;
    const span = Math.max(1, cursor - first);
    // Density: many moves matched inside a small span beats a long thin thread.
    const score = (matched * matched) / span + coverage * 5 + matched;
    if (!best || score > best.score) {
      best = { score, name: dbLine.name, line: dbLine.moves, checkpoints, matched, coverage, span };
    }
  }
  return best;
}

/** The tracked position as of a transcript offset — the last checkpoint at or
 *  before it. Empty array when nothing has been resolved yet. */
function positionAt(timeline, index) {
  let lo = 0; let hi = timeline.length - 1; let best = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (timeline[mid].index <= index) { best = timeline[mid]; lo = mid + 1; } else hi = mid - 1;
  }
  return best ? best.lineSan : [];
}

// ── PLAGIARISM GATE (unchanged from v1) ───────────────────────────────────
export function makeOverlapGate(transcriptText, n = 7) {
  const words = norm(transcriptText).split(' ');
  const grams = new Set();
  for (let i = 0; i + n <= words.length; i += 1) grams.add(words.slice(i, i + n).join(' '));
  return (prose) => {
    const w = norm(prose).split(' ');
    for (let i = 0; i + n <= w.length; i += 1) if (grams.has(w.slice(i, i + n).join(' '))) return true;
    return false;
  };
}

// ── CHUNKING ──────────────────────────────────────────────────────────────
/** Split the transcript into windows small enough that the model can cover
 *  every teaching moment inside one, with overlap so an idea spanning a
 *  boundary is not halved. This is what lifts the density ceiling: N small
 *  calls instead of one capped call. */
export function chunkTranscript(text, size = 5000, overlap = 600) {
  const chunks = [];
  for (let start = 0; start < text.length; start += size - overlap) {
    const end = Math.min(text.length, start + size);
    if (end - start < 400 && chunks.length > 0) break;
    chunks.push({ start, text: text.slice(start, end) });
    if (end >= text.length) break;
  }
  return chunks;
}

// ── MODEL CALL (PROSE ONLY — no `moves` field exists) ─────────────────────
const SYSTEM = `You are a chess-teaching editor. You are given a SHORT EXCERPT of a lesson transcript and, when known, THE EXACT POSITION on the board at that moment. Produce structured teaching notes.

ABSOLUTE RULES:
- ORIGINAL PROSE ONLY. Translate the ideas into your own words — never copy or lightly rephrase the speaker's sentences. The ideas are public-domain chess knowledge; the wording must be yours.
- NEVER name or reference the speaker, the video, the stream, chat, or the opponent. Write timeless chess teaching ("the knight belongs on d5", never "he says…").
- YOU DO NOT DECIDE MOVES. The position is supplied and is authoritative. Never state a move sequence as fact; if the excerpt is unclear about a continuation, leave it out.
- Only describe pieces and squares that the SUPPLIED POSITION supports. If you cannot tell, write the transferable idea instead of a concrete claim.
- Concise, concrete, idea-first. Name squares and pieces. No praise, no filler, no move-number prefixes ("Nf3", never "12.Nf3").

Extract EVERY distinct teaching moment in this excerpt (usually 1-5). For each:
- phase: "opening" | "middlegame" | "endgame" | "concept"
- explains: 1-3 sentences — the read of THIS position (what matters, why)
- teaches: 1-2 sentences — the transferable idea being taught
- plans: 1-2 sentences — the forward plan from here ("" if none)
- concepts: 0-4 short kebab-case tags

Return STRICT JSON: {"notes":[...]}. Nothing else.`;

async function callModel(chunkText, lineSan, title, attempt = 0) {
  const posBlock = lineSan.length
    ? `POSITION (authoritative — moves already played from the start, SAN):\n${lineSan.join(' ')}`
    : 'POSITION: unknown for this excerpt. Do not invent one; prefer transferable ideas over concrete piece/square claims.';
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Video title (context only, do not quote): ${title}\n\n${posBlock}\n\nTRANSCRIPT EXCERPT (auto-captions, unpunctuated):\n${chunkText}` },
      ],
    }),
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      return callModel(chunkText, lineSan, title, attempt + 1);
    }
  }
  if (!res.ok) throw new Error(`deepseek ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const body = await res.json();
  try {
    return JSON.parse(body.choices?.[0]?.message?.content ?? '');
  } catch {
    // One malformed reply must not kill a video — but it MUST be visible, not
    // silently folded into "0 notes". See the pool()/distillOne contract below.
    return { notes: [], failed: true };
  }
}

/** Bounded-concurrency map. Offline batch work, so a small pool is plenty. */
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      try { out[i] = await fn(items[i], i); } catch { out[i] = null; }
    }
  }));
  return out;
}

async function distillOne(videoId, meta, { dry, concurrency, dbLines, dbNames }) {
  // Raw caption file when present; a farm that already cleaned to prose (the
  // generic fetch-youtube-transcripts pipeline) writes .txt instead.
  const raw = await readFile(`${TDIR}/${videoId}.en.vtt`, 'utf8').catch(() => null);
  const text = raw === null ? await readFile(`${TDIR}/${videoId}.txt`, 'utf8') : vttToText(raw);
  if (text.length < 500) throw new Error('transcript too short');

  // Code-stamped opening tag (see openingFromTitle) — one video, one topic.
  // A creator whose series titles are marketing ("How to WIN with the QUEEN'S
  // GAMBIT | 1400-1500 ELO") dilutes the hint tokens below the name-match
  // threshold, so the manifest may carry an explicit openingHint. It is a
  // CURATED external prior, same role as the title, and stays fail-closed:
  // no hint and no title match still means no positions.
  const nameHint = meta.openingHint || meta.title || '';
  const stampedOpening = openingFromTitle(nameHint, dbNames);

  // DB-ALIGNED positions only (see alignToDbLine). No alignment => no
  // positions, and the notes fall back to opening-name keying. Never a guess.
  const align = alignToDbLine(text, dbLines, { nameHint });
  const timeline = align?.checkpoints ?? [];
  const chunks = chunkTranscript(text);
  const withPos = chunks.filter((c) => positionAt(timeline, c.start).length > 0).length;

  const stats = {
    chars: text.length,
    chunks: chunks.length,
    chunksWithPosition: withPos,
    stampedOpening,
    alignedLine: align?.name ?? null,
    alignedPlies: align?.line.length ?? 0,
    movesMatched: align?.matched ?? 0,
    coverage: align ? Number(align.coverage.toFixed(2)) : 0,
  };
  if (dry) return { videoId, title: meta.title, stats, notes: [] };

  // The "unanchored" skip lived here (2026-08-01): no opening in the title and
  // no positioned chunk meant merge-corpus would discard every note, so paying
  // for the model calls was waste. That premise died on 2026-08-02, when the
  // concept tier gave phase-and-idea teaching a home — a lecture on rook
  // endgames or on when a trade actually helps now anchors on what it teaches
  // instead of being forced under an opening it was never about.
  //
  // It was skipping 515 of 1,113 Saint Louis videos, nearly half the channel,
  // and those are exactly the lectures the new tier exists to carry. The skip
  // is gone; a video with nothing to say still produces no notes, which the
  // merge handles on its own.

  const overlaps = makeOverlapGate(text);
  // A SILENT NO-OP IS A FAILURE, NOT A ZERO (CLAUDE.md). The first real run
  // returned "0 notes" and exit 0 while EVERY chunk call was 401-ing on a dead
  // API key — the swallowed-error path made a hard outage look like an empty
  // video. Chunk failures are now counted and a mostly-failed video THROWS.
  let chunkErrors = 0;
  const perChunk = await pool(chunks, concurrency, async (c) => {
    const lineSan = positionAt(timeline, c.start);
    let parsed;
    try {
      parsed = await callModel(c.text, lineSan, meta.title);
    } catch (e) {
      chunkErrors += 1;
      throw e;
    }
    if (parsed?.failed) chunkErrors += 1;
    const raw = Array.isArray(parsed?.notes) ? parsed.notes : [];
    return raw.map((n) => ({ n, lineSan }));
  });
  if (chunkErrors > chunks.length / 2) {
    throw new Error(`${chunkErrors}/${chunks.length} chunk calls FAILED (provider down or key invalid) — refusing to write a near-empty distillation`);
  }

  const notes = [];
  const dropped = { overlap: 0, empty: 0, dupe: 0 };
  const seen = new Set();
  for (const bucket of perChunk) {
    for (const { n, lineSan } of bucket ?? []) {
      const explains = String(n.explains ?? '').trim();
      const teaches = String(n.teaches ?? '').trim();
      const plans = String(n.plans ?? '').trim();
      if (!explains || !teaches) { dropped.empty += 1; continue; }
      if (overlaps(explains) || overlaps(teaches) || (plans && overlaps(plans))) { dropped.overlap += 1; continue; }
      // Overlapping windows re-teach the boundary — dedup on the idea.
      const key = `${lineSan.length}:${norm(teaches).slice(0, 70)}`;
      if (seen.has(key)) { dropped.dupe += 1; continue; }
      seen.add(key);
      notes.push({
        lineSan,
        opening: stampedOpening,
        phase: ['opening', 'middlegame', 'endgame', 'concept'].includes(n.phase) ? n.phase : 'concept',
        explains, teaches, plans,
        concepts: Array.isArray(n.concepts) ? n.concepts.slice(0, 4).map(String) : [],
        sources: [`yt:${videoId}`],
      });
    }
  }
  const positioned = notes.filter((n) => n.lineSan.length > 0).length;
  return {
    videoId,
    playlist: meta.playlist,
    title: meta.title,
    distilledAt: new Date().toISOString(),
    stats: { ...stats, notes: notes.length, positioned, dropped },
    notes,
  };
}

// ── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  const dry = has('dry');
  if (!KEY && !dry) { console.error('DEEPSEEK_KEY / VITE_DEEPSEEK_API_KEY not set'); process.exit(1); }
  const concurrency = Number(arg('concurrency', '4'));
  const limit = Number(arg('limit', '10000'));
  const onlyId = arg('id', null);
  await mkdir(DDIR, { recursive: true });

  // The DB is the move authority for positions (G3) — load it once. Its names
  // are also the vocabulary for the code-stamped opening tag.
  const lich = JSON.parse(await readFile('src/data/openings-lichess.json', 'utf8'));
  const lichArr = Array.isArray(lich) ? lich : Object.values(lich);
  const dbLines = buildDbLineIndex(lichArr);
  const dbNames = [...new Set(lichArr.map((o) => o.name).filter(Boolean))];
  console.log(`[distill-v2] DB line index: ${dbLines.length} lines (>=6 plies), ${dbNames.length} names`);

  // The manifest is the work queue when present; otherwise fall back to
  // whatever transcripts are on disk (a targeted --id run needs no manifest).
  let videos = [];
  try {
    const manifest = JSON.parse(await readFile(CREATOR.manifest, 'utf8'));
    videos = manifest.videos;
  } catch {
    videos = onlyId ? [{ id: onlyId, title: null, playlist: null }] : [];
  }
  if (onlyId) {
    videos = videos.filter((v) => v.id === onlyId);
    if (videos.length === 0) videos = [{ id: onlyId, title: null, playlist: null }];
  }
  // The title is LOAD-BEARING now (opening stamp + alignment prior), so a
  // manifest-less --id run fetches it from YouTube's oembed endpoint — no
  // auth, no bot-check, unlike the watch page.
  for (const v of videos) {
    if (v.title) continue;
    try {
      const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${v.id}&format=json`);
      if (r.ok) v.title = (await r.json()).title ?? v.id;
    } catch { /* fall through */ }
    if (!v.title) v.title = v.id;
  }

  // Durable resume: the shipped corpus records every v2-distilled video id
  // (merge-corpus writes v2VideoIds), so a FRESH container skips them even
  // though the gitignored per-video intermediates are gone. Never re-pay
  // DeepSeek for a video the corpus already carries at v2 density.
  let shippedV2 = new Set();
  try {
    shippedV2 = new Set(JSON.parse(await readFile(CREATOR.corpus, 'utf8')).v2VideoIds ?? []);
  } catch { /* no shipped corpus */ }

  const queue = [];
  for (const v of videos) {
    if (!(await exists(`${TDIR}/${v.id}.en.vtt`)) && !(await exists(`${TDIR}/${v.id}.txt`))) continue;
    if (!dry && shippedV2.has(v.id)) continue;
    if (!dry && (await exists(`${DDIR}/${v.id}.json`))) continue;
    queue.push(v);
  }
  console.log(`[distill-v2] ${queue.length} video(s) to process${dry ? ' (DRY — tracker only, no model calls)' : ''}`);

  let ok = 0; let fail = 0; let skipped = 0; let totalNotes = 0; let totalPositioned = 0;
  for (const v of queue.slice(0, limit)) {
    try {
      const out = await distillOne(v.id, v, { dry, concurrency, dbLines, dbNames });
      if (!dry) await writeFile(`${DDIR}/${v.id}.json`, JSON.stringify(out, null, 2));
      ok += 1;
      totalNotes += out.notes.length;
      totalPositioned += out.notes.filter((n) => n.lineSan.length > 0).length;
      const s = out.stats;
      // A SKIP must not read as an empty distillation — "notes 0" repeated
      // hundreds of times is exactly the silent-no-op this file warns about.
      if (out.skipped) {
        skipped += 1;
        console.log(`[distill-v2] ${v.id} — SKIPPED (unanchored: no opening in the title, no positioned chunk) · no tokens spent`);
      } else {
      console.log(
        `[distill-v2] ${v.id} ✓ ${s.alignedLine ? `aligned "${s.alignedLine}" (${s.alignedPlies}p, ${s.movesMatched} matched, cov ${s.coverage})` : 'NO DB ALIGNMENT — opening-name keying only'} · ` +
        `chunks ${s.chunksWithPosition}/${s.chunks} positioned` +
        (dry ? '' : ` · notes ${out.notes.length} (${out.notes.filter((n) => n.lineSan.length > 0).length} positioned)`),
      );
      }
    } catch (e) {
      fail += 1;
      console.error(`[distill-v2] ${v.id} ✗ ${String(e).split('\n')[0].slice(0, 150)}`);
    }
  }
  console.log(`\n[distill-v2] ok=${ok} skipped=${skipped} fail=${fail}` + (dry ? '' : ` notes=${totalNotes} positioned=${totalPositioned} (${totalNotes ? ((100 * totalPositioned) / totalNotes).toFixed(1) : '0'}%)`));
  if (!dry && ok > 0) console.log(`[distill-v2] mean notes/video = ${(totalNotes / ok).toFixed(1)}  (v1 baseline: 10.8, 18% positioned)`);
}

const isMain = process.argv[1]?.endsWith('distill-v2.mjs');
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });
