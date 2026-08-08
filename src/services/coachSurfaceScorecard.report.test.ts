// EVERY COACH SURFACE, SCORED ON THE THREE THINGS DAVID ASKED FOR:
// narration QUALITY, SPEED, and ACCURACY/RELEVANCE.
//
// Why in-process rather than Playwright: the Stockfish worker does not boot in
// the headless sandbox browser, so the engine-derived lanes cannot be produced
// there at all, and driving prod spends model tokens on the warm beat. Calling
// each surface's real producer over real positions exercises the code that
// actually speaks, costs nothing, and — unlike a click-through — can grade
// every line it emits instead of checking that an element rendered.
//
// This is a REPORT, not a pass/fail wall. It prints a scorecard and enforces
// only the floors that are genuinely non-negotiable (accuracy), because a
// quality bar asserted before it is measured is just a number someone made up.
import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { teachingSourceForBoard, spokenBeatText, generalizedTeaching, transitionTeachingForGame, tacticNoteForPuzzleThemes } from './danyaTeachingService';
import { buildPlayCommentary } from './playCommentary';
import { formatReadingFacts } from './positionReadingService';
import { gradeNarrationText } from './coachAnswerGates';
import { falseConfigurationClaim } from './configurationClaims';
import { buildVoicePackage } from './voicePackage';
import { findLivePunishment } from './gemCrushLines';
import { __setSpokenBakeCache } from './spokenNoteBake';
import { readFileSync } from 'node:fs';

/** Real games, chosen to span the phases each surface actually runs in. */
const GAMES: Array<{ name: string; sans: string[]; student: 'white' | 'black' }> = [
  // David's own prod game — the one whose narration he called wrong.
  { name: 'Pirc (his game)', student: 'white',
    sans: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f4', 'c6', 'Be2', 'b5', 'a3', 'a5', 'Nf3', 'Ng4'] },
  { name: 'Italian', student: 'white',
    sans: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O', 'Re1', 'a6', 'Nbd2', 'Ba7'] },
  { name: 'Caro-Kann', student: 'black',
    sans: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6', 'Nf3', 'Nd7', 'h5', 'Bh7'] },
  { name: 'Legal-style tactic', student: 'black',
    sans: ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5', 'Bxd1', 'Bxf7', 'Ke7', 'Nd5'] },
];

interface Line { surface: string; text: string; fen: string; ms: number }

/** ACCURACY — is every claim true of the board it was spoken on? Reuses the
 *  production graders, so this measures what actually ships, not a re-spec. */
function accuracyFault(l: Line): string | null {
  const graded = gradeNarrationText(l.text, l.fen, 'scorecard')?.trim();
  if (!graded || graded.length < l.text.trim().length * 0.6) return 'square-anchored claim false on this board';
  const cfg = falseConfigurationClaim(l.text, l.fen);
  if (cfg) return `asserts ${cfg}, board lacks it`;
  return null;
}

/** QUALITY — the Narration Voice Rules, the ones a machine can settle. */
const SAN_RE = /\b(?:O-O-O|O-O|[KQRBN][a-h1-8]?x?[a-h][1-8][+#]?|[a-h]x[a-h][1-8][+#]?)\b/g;
function qualityFaults(text: string): string[] {
  const f: string[] = [];
  if (/\b(great move|excellent|well done|nice job|good job)\b/i.test(text)) f.push('praise (rule 5)');
  if (/\b(click|tap the|button|press next|the screen)\b/i.test(text)) f.push('names the interface (rule 2)');
  if (/\b(I think|let me show|now we'll see|watch the forced)\b/i.test(text)) f.push('first-person/meta (rule 6)');
  if (/\d{1,2}(\.|\.\.\.)(?=\s?[NBRQKO a-h])/.test(text)) f.push('move-number prefix (reads as "two")');
  if ((text.match(SAN_RE) ?? []).length >= 3) f.push('move dictation (3+ SANs)');
  if (text.length > 320) f.push(`over-long (${text.length} chars)`);
  return f;
}

/** RELEVANCE — does it engage THIS position, or could it be said anywhere?
 *  A line that names no square, no piece and no concrete feature is filler. */
function isRelevant(text: string): boolean {
  return /\b[a-h][1-8]\b/.test(text)
    || /\b(knight|bishop|rook|queen|king|pawn)\b/i.test(text)
    || /\b(fork|pin|skewer|outpost|tempo|initiative|passed|isolated|doubled|open file|centre|center)\b/i.test(text);
}

describe('coach surface scorecard', () => {
  beforeAll(() => {
    loadFullCorpus();
    // THE BAKE MUST BE LOADED OR HALF THE SURFACES ARE SILENT BY DESIGN.
    // A floating note with no bake is deliberately silent (its squares belong
    // to another game), so without this every tactic note returns '' and the
    // scorecard reports a dead wire that is actually a working rule. The app
    // fetches this at boot; the harness has to do it explicitly.
    const raw = JSON.parse(readFileSync('public/data/corpus-spoken.json', 'utf8')) as Record<string, { spoken?: string; kind?: string; unspeakable?: string }>;
    __setSpokenBakeCache(new Map(Object.entries(raw)));
  });

  it('scores narration quality, speed and accuracy across every surface', () => {
    const lines: Line[] = [];
    let readingBlockLeaks = 0;
    const readingBlockMs: number[] = [];
    const push = (surface: string, text: string | null | undefined, fen: string, ms: number): void => {
      if (text && text.trim()) lines.push({ surface, text: text.trim(), fen, ms });
    };

    for (const game of GAMES) {
      const c = new Chess();
      const history: string[] = [];

      for (const san of game.sans) {
        const mv = c.move(san);
        if (!mv) break;
        history.push(san);
        const fen = c.fen();

        // ── LEARN / the taught note (also the openings Watch beat source) ──
        let t0 = performance.now();
        const src = teachingSourceForBoard(history, fen, null);
        const noteText = src ? spokenBeatText(src.note) : '';
        const note = noteText ? generalizedTeaching(src!.origin, noteText) : '';
        push('learn:corpus-note', note, fen, performance.now() - t0);

        // ── THE PACKAGE the live lane now speaks through ──
        t0 = performance.now();
        const pkg = buildVoicePackage(note ? [{ kind: 'note', text: note, fen }] : []);
        push('learn:voice-package', pkg.spoken, fen, performance.now() - t0);

        // ── GEM CALLOUT — a verified punishable slip by the opponent ──
        t0 = performance.now();
        const gem = findLivePunishment(null, history);
        push('gem:callout', gem?.callout, fen, performance.now() - t0);

        // ── PLAY / running commentary ──
        // NB the arg is `fen` (student to move) + `studentColor` as the WORD,
        // not fenBefore/fenAfter/san. The first draft passed the wrong shape,
        // the throw was swallowed, and this surface silently produced nothing
        // while the scorecard implied it had been measured — a harness lying
        // about a surface is the same defect as a surface lying about a board.
        // Only on the STUDENT's turn — it returns null otherwise, by design,
        // and calling it on every ply made a working surface look dead.
        if (c.turn() === (game.student === 'white' ? 'w' : 'b')) {
          t0 = performance.now();
          const pc = buildPlayCommentary({ fen, studentColor: game.student });
          // `spoken`, not `facts`. The facts are written AT a phrasing model
          // and are refused by the package as scaffolding; `spoken` is the same
          // observation in a form a student can hear.
          push('play:commentary', pc ? buildVoicePackage([{ kind: 'computed', text: pc.spoken, fen }]).spoken : '', fen, performance.now() - t0);
        }

        // ── READ THIS POSITION / the computed board read ──
        // `formatReadingFacts` is a PROMPT BLOCK, not narration — it opens
        // "READING FACTS (GROUND TRUTH …)" and is model input. Scoring it as
        // speech marked all 61 lines as quality failures and told us nothing.
        // What it IS worth asserting is the speakable-facts law: this string
        // must never reach the voice. Measured as a leak check, not as prose.
        t0 = performance.now();
        const readBlock = formatReadingFacts(fen, game.student);
        readingBlockLeaks += /READING FACTS|GROUND TRUTH|VOICE th/i.test(buildVoicePackage(
          readBlock ? [{ kind: 'computed', text: readBlock, fen }] : [],
        ).spoken) ? 1 : 0;
        readingBlockMs.push(performance.now() - t0);

        // ── TACTICS / the drill's post-solve note ──
        t0 = performance.now();
        const tn = tacticNoteForPuzzleThemes({ themes: ['fork', 'pin'], seenIds: new Set(), fen });
        push('tactics:theme-note', tn?.text, fen, performance.now() - t0);
      }

      // ── PHASE TRANSITION / review's game-level teaching ──
      // Takes an OBJECT, and returns the note directly (not {note}). The first
      // draft passed positional args and read `.note.explains`, so this surface
      // also reported silence it had not actually been asked for.
      const t0 = performance.now();
      const tr = transitionTeachingForGame({ historySans: history, fen: c.fen() });
      const phaseText = tr ? spokenBeatText(tr) : '';
      push('phase:transition', phaseText, c.fen(), performance.now() - t0);
      // The same text through the package — what phase narration WOULD speak
      // once routed, so the gain is measured before the wiring is moved.
      push('phase:via-package', buildVoicePackage(
        phaseText ? [{ kind: 'note', text: phaseText, fen: c.fen() }] : [],
      ).spoken, c.fen(), performance.now() - t0);
    }

    // ── SCORE ──
    const surfaces = [...new Set(lines.map((l) => l.surface))].sort();
    const rows = surfaces.map((s) => {
      const ls = lines.filter((l) => l.surface === s);
      const acc = ls.filter((l) => accuracyFault(l) !== null);
      const qual = ls.filter((l) => qualityFaults(l.text).length > 0);
      const rel = ls.filter((l) => !isRelevant(l.text));
      const times = ls.map((l) => l.ms).sort((a, b) => a - b);
      return {
        surface: s, lines: ls.length,
        accuracyFaults: acc.length,
        qualityFaults: qual.length,
        irrelevant: rel.length,
        medianMs: Number((times[Math.floor(times.length / 2)] ?? 0).toFixed(2)),
        p95Ms: Number((times[Math.floor(times.length * 0.95)] ?? 0).toFixed(2)),
        worstAccuracy: acc.slice(0, 2).map((l) => `${accuracyFault(l)} :: ${l.text.slice(0, 90)}`),
        worstQuality: qual.slice(0, 2).map((l) => `${qualityFaults(l.text).join('+')} :: ${l.text.slice(0, 90)}`),
      };
    });

    console.log('\n=== COACH SURFACE SCORECARD ===');
    for (const r of rows) {
        console.log(`${r.surface.padEnd(24)} n=${String(r.lines).padStart(3)}  acc✗=${String(r.accuracyFaults).padStart(2)}  qual✗=${String(r.qualityFaults).padStart(2)}  filler=${String(r.irrelevant).padStart(2)}  median=${String(r.medianMs).padStart(7)}ms  p95=${String(r.p95Ms).padStart(7)}ms`);
      for (const w of r.worstAccuracy) console.log(`    ACC  ${w}`);
      for (const w of r.worstQuality) console.log(`    QUAL ${w}`);
    }

    console.log(`read-position:prompt-block  n=${readingBlockMs.length}  LEAKS-TO-VOICE=${readingBlockLeaks}  median=${(readingBlockMs.sort((a,b)=>a-b)[Math.floor(readingBlockMs.length/2)] ?? 0).toFixed(2)}ms`);
    expect(readingBlockLeaks).toBe(0);

    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/coach-surface-scorecard.json', JSON.stringify({ rows, totalLines: lines.length }, null, 2));

    // THE FLOOR APPLIES TO WHAT IS SPOKEN, NOT TO EVERY PRODUCER.
    //
    // `learn:corpus-note` is the raw retrieval — the package's INPUT — and it
    // is board-false about a quarter of the time. That is not a regression;
    // it is why the package exists, and the measurement is the point: the same
    // notes, routed through `buildVoicePackage`, score zero. Holding the raw
    // producer to zero would demand the corpus be perfect, which it is not and
    // will not be.
    //
    // So the floor is on SPOKEN surfaces. A surface earns a place here by
    // going through the package; one that speaks without it is reported below
    // as unrouted, with its measured fault rate, rather than being quietly
    // excluded — that list is the remaining work, and it should stay visible.
    const SPOKEN_THROUGH_PACKAGE = ['learn:voice-package', 'phase:via-package', 'gem:callout', 'play:commentary', 'tactics:theme-note'];
    const spokenFaults = rows
      .filter((r) => SPOKEN_THROUGH_PACKAGE.includes(r.surface))
      .reduce((n, r) => n + r.accuracyFaults, 0);

    const unrouted = rows.filter((r) => !SPOKEN_THROUGH_PACKAGE.includes(r.surface) && r.surface !== 'learn:corpus-note');
    console.log('\n=== SURFACES THAT SPEAK WITHOUT THE PACKAGE (remaining work) ===');
    for (const r of unrouted) {
        console.log(`  ${r.surface.padEnd(24)} ${r.accuracyFaults}/${r.lines} board-false`);
    }

    expect({ spokenAccuracyFaults: spokenFaults }).toEqual({ spokenAccuracyFaults: 0 });
  }, 300_000);
});
