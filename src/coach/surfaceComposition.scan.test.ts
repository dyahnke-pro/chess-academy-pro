import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * THE DIVERGENCE, AS A NUMBER THAT MAY ONLY GO DOWN
 * (docs/plans/2026-09-17-computer-unification.md §1 Phase 5).
 *
 * The map found that the three surfaces of "one coach" share SIX services — and
 * four of those are infrastructure. `CoachTeachPage` is ~13,900 lines importing
 * ~100 services directly; 75 computers are Teach-only. The page is not a
 * surface consuming a coach, it is a THIRD COACH. That is why a fix lands on
 * one surface and not the other, over and over.
 *
 * Extracting composition out of a 13,900-line page in one heroic refactor is
 * how that refactor goes wrong. This gate turns it into a number instead: every
 * direct fact-computer import from a surface is counted, and the ceiling may
 * only SHRINK (the sealed-gates rule). A session that routes five calls through
 * the composer lowers it by five; a session that adds one goes red.
 *
 * It deliberately does NOT ban the imports outright — that would fail the build
 * today and teach nothing. It measures.
 */
const ROOT = 'src';

/**
 * A FACT COMPUTER computes chess or teaching facts. INFRASTRUCTURE does not —
 * voice, engine, audit, storage, routing, caches and UI helpers are legitimate
 * for a surface to touch directly and are excluded. Keep this list honest:
 * adding a real computer here to duck the ceiling is the same cheat as raising
 * the ceiling.
 */
const INFRA = new Set([
  'voiceService', 'stockfishEngine', 'stockfishCache', 'appAuditor', 'analytics',
  'analyticsService', 'dataLoader', 'puzzleService', 'db', 'storage',
  'deviceIdentity', 'gamePhaseService', 'boardUtils', 'engineConstants',
  'sanitizeCoachText', 'chesscomGamesService', 'lichessExplorerService',
  'coachApi', 'coachSessionRouter', 'coachAgent', 'coachThread',
  'coachSettingsAction', 'masterPlayCache', 'amateurPlayCache',
  'walkthroughAdapter', 'masterclassWalkthroughAdapter', 'narrationSegments',
  'boardAnnotationService', 'moveOrderArrows', 'voiceInputService',
  'contentGenerationService', 'openingService', 'mistakePuzzleService',
  'coachCurriculumService', 'coachGameEngine', 'coachMoveCommand',
  'coachNonAnswer', 'coachAnswerGates', 'linePickerPopularity',
  'trapPlayPosition', 'stageEntryValidity', 'playerGameRequest',
  'proGameReferenceService',
  // `spokenLanguage` computes NO chess or teaching fact — it answers "which
  // language" and translates phrasing, the same class as `voiceService` and
  // `narrationSegments`, both already here. Added when Learn's intent pipeline
  // had to translate a non-English ask before matching it (2026-09-19); it did
  // NOT move any ceiling, and adding a real computer here to duck one is the
  // same cheat as raising one.
  'spokenLanguage',
  // `coachChatText` is the transcript's translation DOOR — the text-side twin
  // of `voiceService`'s chokepoint. It computes no chess or teaching fact; it
  // decides which language a fixed app string is shown in. Same class as
  // `spokenLanguage` above and `narrationSegments`. It did NOT move a ceiling.
  'coachChatText',
  // `weaknessModelEvents` is ONE leaf signal — "the student model just
  // changed" — with a listener set and nothing else: it imports NOTHING and
  // computes no chess or teaching fact, the same class as `standingFactMemory`
  // (a cache with a rule) and `voiceService` (a chokepoint). `useWeaknessSignals`
  // subscribes to it so a recorded slip reaches the next narration without
  // waiting out the loader's cache (WO-LOOP-01, 2026-09-20). It did NOT move a
  // ceiling: the import that put the scan at 255 was this one, and a signal
  // bus is not a computer.
  'weaknessModelEvents',
  // `standingFactMemory` computes NO chess fact — it is the say-once set and
  // its forget-on-rewind rule, the same class as a cache. Added here when the
  // rule was extracted from the two surfaces that each carried a copy.
  //
  // ⚠️ This is the shape of the cheat this gate warns about, so it is stated
  // out loud: moving a real computer into INFRA would lower the count without
  // routing a single call. The test below names nine computers and asserts
  // they are NOT here. If you add something to this list, it must be provable
  // that it answers no question about the board.
  'standingFactMemory',
  // `coachActuator` is the HANDS registry and its one `actuate` door. It
  // answers NO question about the board — that is its written contract: "the
  // model NEVER supplies a chess value — code fills every argument from the
  // board, the DB or the record", and the actuator is the thing being handed
  // those arguments, never the thing computing them. Its only arithmetic is
  // `steppedElo`, which adds a constant to a number the caller passed.
  //
  // Same class as `coachSessionRouter` (already here — the router that PARSES
  // the command) and `voiceService` (a chokepoint). A surface imports it to
  // PUBLISH its hands at mount, which is the opposite of composing a producer:
  // it is how a surface stops owning its own dispatch. CoachTeachPage,
  // CoachGameReview and GameChatPanel each gained it on 2026-09-21 while each
  // LOST a hand-rolled dispatch path.
  'coachActuator',
  // `spokenSquares` is a ONE-SLOT CACHE: it holds the squares the narration
  // just pointed at, keyed by position, so "show me on the board" can point at
  // the same fact. Same class as `standingFactMemory` directly above — a cache
  // with a rule — and it meets this list's own bar, which is that it must be
  // PROVABLE it answers no question about the board:
  //   • one import, and it is `type { Square }` — no value import at all;
  //   • it never constructs a `Chess`, reads a piece, or evaluates a square;
  //   • `readSpokenSquares` returns exactly what `rememberSpokenSquares` was
  //     handed, so it cannot produce a fact, only repeat one.
  // It slices the FEN string, but only to build a key — the same slice
  // `positionProvenance.positionKey` makes, and for the same reason.
  'spokenSquares',


  // `learnMemory` is the same class again: the Learn producer's per-game
  // say-once slots and one `newGame()` that forgets them. It was EXTRACTED OUT
  // of CoachTeachPage, so the import count rose by one while the coupling FELL
  // by nine refs — uncounted, the gate would punish the exact move it exists
  // to encourage.
  //
  // Neither entry is taken on trust: MEMORY_HOLDERS below proves mechanically
  // that these two import nothing and name no piece, square or chess term.
  // "It computes no chess fact" is exactly the sentence a cheat would write
  // too, so it is CHECKED.
  'learnMemory',
  // `ratingBands` is the same SHAPE as the learnMemory entry above, for the same
  // stated reason: counting it would punish the move this gate exists to
  // encourage. Three components each carried their own hardcoded unrated-student
  // default (1420, 1420, 1420) and now share ONE constant — the import count rose
  // while the coupling FELL, because three independent wrong numbers became one
  // source of truth.
  //
  // Its claim is narrower and stronger than "computes no chess fact": EVERY
  // export takes a NUMBER. `coreRatingTier`, `explorerBandFor`,
  // `DEFAULT_STUDENT_RATING` and the `ADAPTIVE_DECIDERS` catalogue never see a
  // board. That is checked by NUMERIC_TABLES below, not taken on trust.
  'ratingBands',
  // ── 2026-09-22, WO-STANDARD-01 — three classes added after the helper
  //    branches put the scan at 271. None of these answers a question about
  //    the board; each is held to a proof below, so the list cannot widen by
  //    assertion alone. What DID answer a board question (openingKey, the
  //    read-position composition, the drill beats, the home steer) was ROUTED
  //    through a composer instead — the count came down by routing, not by
  //    reclassifying.
  // RECORD HELPERS — bookkeeping over a stored row: is this row a seeded
  // fixture (`fixtureGames`); which side of a stored score is the student's
  // (`studentResult`). Zero imports, no chess vocabulary — proven by
  // PURE_RECORD_HELPERS below, the same check the memory holders pass.
  'fixtureGames', 'studentResult',
  // REPLAY HELPERS — a PGN or SAN list played back into positions with
  // chess.js legality only: the same class as `walkthroughAdapter` (already
  // here). `lastMoveOfLine` hands a live surface the move just played and the
  // boards around it; `gamePgnReplay` repairs a stored game's PGN to its legal
  // prefix and names the game when it cannot. Neither judges a piece, an
  // eval or a tactic — proven by REPLAY_HELPERS below.
  'lastMoveOfLine', 'gamePgnReplay',
  // PHRASER — a SAN rendered as prose ("the queen takes d5"), the zero-import
  // twin of `spokenSquares` above. It decides nothing about the board; it
  // says a move the board already decided. Proven by PHRASERS below.
  'spokenMove',
  // CACHE — the cross-user Supabase mirror of generated lesson trees. The
  // gate's own definition lists caches as legitimate for a surface to touch
  // (with `db`, `storage`, `masterPlayCache`, `amateurPlayCache`). It stores
  // and returns trees; it computes none.
  'sharedOpeningCache',
]);

/** Record helpers: zero imports, no chess vocabulary in code. */
const PURE_RECORD_HELPERS = ['fixtureGames', 'studentResult'];
/** Replay helpers: chess.js is the only import; no JUDGEMENT vocabulary. */
const REPLAY_HELPERS = ['lastMoveOfLine', 'gamePgnReplay'];
/** Phrasers: zero imports. */
const PHRASERS = ['spokenMove', 'spokenSquares'];
/** The vocabulary of a chess JUDGEMENT proper — what a replay helper must
 *  never reason about (it may name pieces: it moves them). */
const JUDGEMENT_WORDS = /\b(?:tactic|eval|centipawn|material|threat|attack|blunder|checkmate|hang|fork|pin\b|skewer|sacrific)\w*/i;

/** INFRA entries that claim to take NUMBERS ONLY — never a board. Checked below.
 *  NB the CHESS_WORDS scan is the wrong instrument for these: `ratingBands`
 *  contains the word "tactic" inside a documentation STRING describing what a
 *  decider answers. Prose about chess is not reasoning about chess — the same
 *  correction the `standingFactMemory`/fen note records. */
const NUMERIC_TABLES = ['ratingBands'];

/** The INFRA entries that claim to be pure memory, checked below. */
const MEMORY_HOLDERS = ['standingFactMemory', 'learnMemory'];

/** The vocabulary of a chess JUDGEMENT — pieces, evaluation, tactics, material.
 *
 *  ⚠️ A first cut of this list also banned `fen`/`san`, and it FAILED
 *  `standingFactMemory`, which reads a FEN's fullmove counter to tell whether
 *  the board went backwards. That was the list being wrong, not the module:
 *  pulling the move NUMBER off a FEN string is bookkeeping — it asks nothing
 *  about what is ON the board. A FEN passing through a module proves nothing;
 *  what proves a computer is REASONING about pieces, eval or tactics. So the
 *  list bans that, and the zero-imports check below carries the rest of the
 *  weight (a memory holder that wanted a real fact would have to import one). */
/** A board-shaped parameter: what a numbers-only table must never take. */
const BOARD_SHAPED = /\b(?:fen|san|square|board|position|Chess)\b/i;

const CHESS_WORDS =
  /\b(?:Chess|pawn|knight|bishop|rook|queen|king|castl|capture|checkmate|check\b|tactic|eval|centipawn|material|threat|attack|blunder)\w*/i;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) out.push(p);
  }
  return out;
}

function factImports(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const mods = new Set<string>();
  for (const m of src.matchAll(/from '(?:\.\.\/)+services\/([A-Za-z0-9_]+)'/g)) {
    if (!INFRA.has(m[1])) mods.add(m[1]);
  }
  return [...mods];
}

const SURFACES = [
  ...walk(join(ROOT, 'components', 'Coach')),
  ...walk(join(ROOT, 'hooks')),
];

// ── SHRINK-ONLY CEILINGS, measured 2026-09-17. Lower them when you route a
//    call through the composer. NEVER raise one.
const TOTAL_CEILING = 254;
const PER_FILE_CEILING: Record<string, number> = {
  'components/Coach/CoachTeachPage.tsx': 62,
  'components/Coach/CoachGamePage.tsx': 33,
  'components/Coach/CoachGameReview.tsx': 32,
};

describe('surface composition — the coach/third-coach divergence, measured', () => {
  it(`surfaces import fact computers directly at most ${TOTAL_CEILING} times in total`, () => {
    let total = 0;
    const worst: string[] = [];
    for (const f of SURFACES) {
      const n = factImports(f).length;
      total += n;
      if (n > 0) worst.push(`${n}\t${f.replace(`${ROOT}/`, '')}`);
    }
    worst.sort((a, b) => Number(b.split('\t')[0]) - Number(a.split('\t')[0]));
    expect(total, `\n${worst.slice(0, 10).join('\n')}\n`).toBeLessThanOrEqual(TOTAL_CEILING);
  });

  it('the three big surfaces stay under their own ceilings', () => {
    for (const [rel, ceiling] of Object.entries(PER_FILE_CEILING)) {
      const f = join(ROOT, rel);
      const got = factImports(f);
      expect(got.length, `${rel}: ${got.sort().join(', ')}`).toBeLessThanOrEqual(ceiling);
    }
  });

  it('the measurement is NON-VACUOUS — it really sees the page', () => {
    // A scan that silently matches nothing would pass forever. The biggest
    // surface must be visible to it, and the INFRA list must not have swallowed
    // everything.
    const teach = factImports(join(ROOT, 'components/Coach/CoachTeachPage.tsx'));
    expect(teach.length, 'the scan found no fact computers in the largest surface').toBeGreaterThan(20);
    expect(teach).toContain('positionFacts');
  });

  it('every INFRA memory-holder provably computes nothing', () => {
    for (const mod of MEMORY_HOLDERS) {
      const src = readFileSync(join(ROOT, 'services', `${mod}.ts`), 'utf8');
      // Strip comments: the docs explain the bug each one fixed, in chess terms.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(
        [...code.matchAll(/^import .*$/gm)].map((m) => m[0]),
        `${mod} imports something — it is not pure memory`,
      ).toEqual([]);
      const chess = code.match(CHESS_WORDS);
      expect(
        chess?.[0] ?? null,
        `${mod} names "${chess?.[0]}" — it answers a question about the board, ` +
        'so it is a fact computer and does not belong in INFRA',
      ).toBeNull();
    }
  });

  it('every INFRA record helper and phraser imports nothing and names no chess judgement', () => {
    for (const mod of [...PURE_RECORD_HELPERS, ...PHRASERS]) {
      const src = readFileSync(join(ROOT, 'services', `${mod}.ts`), 'utf8');
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      // A `type` import is erased at compile time and can compute nothing;
      // `spokenSquares` names chess.js's Square type and stays a phraser.
      expect(
        [...code.matchAll(/^import .*$/gm)].map((m) => m[0]).filter((l) => !/^import type /.test(l)),
        `${mod} imports something — a helper that wanted a fact would have to`,
      ).toEqual([]);
      if (PURE_RECORD_HELPERS.includes(mod)) {
        const chess = code.match(CHESS_WORDS);
        expect(chess?.[0] ?? null, `${mod} names "${chess?.[0]}" — it reasons about the board`).toBeNull();
      }
    }
  });

  it('every INFRA replay helper imports only chess.js and reasons about no judgement', () => {
    for (const mod of REPLAY_HELPERS) {
      const src = readFileSync(join(ROOT, 'services', `${mod}.ts`), 'utf8');
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      const imports = [...code.matchAll(/^import .*$/gm)].map((m) => m[0]);
      for (const line of imports) expect(line, `${mod} imports beyond chess.js`).toMatch(/from 'chess\.js'/);
      const judged = code.match(JUDGEMENT_WORDS);
      expect(judged?.[0] ?? null, `${mod} names "${judged?.[0]}" — a replay helper judges nothing`).toBeNull();
    }
  });

  it('INFRA never hides a real computer', () => {
    // The cheat this gate is most vulnerable to: parking a fact computer in
    // INFRA to lower the count. These are computers by definition — a test that
    // names them stops the list being quietly widened.
    for (const c of ['positionFacts', 'conceptEngine', 'moveFundamentals', 'weaknessSpine',
      'causalChain', 'lookaheadPlan', 'groundedAnswer', 'playCommentary', 'liveTacticsContext']) {
      expect(INFRA.has(c), `${c} is a fact computer and must not be in INFRA`).toBe(false);
    }
  });

  it('the NUMERIC_TABLES infra entries take numbers, never a board', () => {
    for (const name of NUMERIC_TABLES) {
      const f = join(ROOT, 'services', `${name}.ts`);
      const src = readFileSync(f, 'utf8');
      expect(
        (src.match(/^import /gm) ?? []).length,
        `${name} must import nothing — a table that wanted a real fact would have to`,
      ).toBe(0);
      const signatures = (src.match(/^export (?:function|const|interface|type)[^\n{]*/gm) ?? []).join('\n');
      expect(
        BOARD_SHAPED.test(signatures),
        `${name} exports something board-shaped, so it is a COMPUTER, not infra:\n${signatures}`,
      ).toBe(false);
    }
  });
});