/**
 * 🔒 ONE STORY STATE — the say-once family (WO-STORY-MATRIX-01 P1-8a, design
 * docs/plans/2026-10-30-story-matrix-phase1.md §P1-8).
 *
 * Learn kept fourteen say-once memories in four places — the page's refs
 * (`positionalSaidRef`, `fundamentalSeenRef`, `threatSaidRef`,
 * `drilledSaidRef`), the factory-made `standingFactMemory` (twice: the page's
 * and usePhaseNarration's own), and nine Sets on `learnMemory` — with two
 * "board went backwards" detectors, two reset doors and no rewind. Every one of
 * them lives in `GameStory` now (gameStory.ts), written at the door.
 *
 * It closes the blind spot of `memoryLifetimes.gate.test.ts`, which sees only
 * `useRef(new Set | new Map | [] | {})` and so never saw a memory made by a
 * factory. Blamed by STATEMENT: comments are stripped, so a comment telling
 * the history never fails it. Commits 8b/8c extend it to plans, phase state and
 * the other story memories as they move in.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const FILES = ['src/components/Coach/CoachTeachPage.tsx', 'src/hooks/usePhaseNarration.ts'];

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, (m, a: string) => a + ' '.repeat(m.length - a.length));
}

/** A say-once memory, by NAME: a ref, or a local holding a memory the
 *  component keeps between turns. */
const SAY_ONCE_NAME = /(?:said|seen|spoken|taught|explainer|alarm)/i;

/** Every say-once memory the page or the hook declares outside the story:
 *  refs named as one, factory-made ledgers, and the merged learnMemory slots. */
function sayOnceOutsideStory(src: string): string[] {
  const s = stripComments(src);
  const out: string[] = [];
  for (const m of s.matchAll(/\bconst\s+(\w+)\s*=\s*useRef\b/g)) if (SAY_ONCE_NAME.test(m[1])) out.push(`ref ${m[1]}`);
  for (const m of s.matchAll(/\b(createStandingFactMemory|standingFactMemory|fullmoveOf)\b/g)) out.push(`factory ${m[1]}`);
  for (const m of s.matchAll(/learnMemRef\.current\.(spokenKeys|conceptTaught|principleTaught|spokenThreatLines|lastThreatKey|loudAlarms|spokenTacticLines|saidExplainers|pieceQualitySaid|questionsAnswered)\b/g)) out.push(`learnMemory.${m[1]}`);
  return out;
}

describe('the say-once family lives in GameStory', () => {
  it('the scanner sees the shapes it must (negative control: the old page)', () => {
    const old = `
      const fundamentalSeenRef = useRef(new Set<FundamentalId>());
      const threatSaidRef = useRef<{ fen: string } | null>(null);
      // const commentedSaidRef = useRef(new Set());
      const standingRef = useRef(createStandingFactMemory());
      const ownStandingRef = useRef(createStandingFactMemory());
      learnMemRef.current.spokenKeys.add(k);
      if (learnMemRef.current.conceptTaught.has(type)) return '';
      const activeTokenRef = useRef(0);`;
    expect(sayOnceOutsideStory(old)).toEqual([
      'ref fundamentalSeenRef',
      'ref threatSaidRef',
      'factory createStandingFactMemory',
      'factory createStandingFactMemory',
      'learnMemory.spokenKeys',
      'learnMemory.conceptTaught',
    ]);
  });

  for (const file of FILES) {
    it(`${file} keeps no say-once memory of its own`, () => {
      expect(sayOnceOutsideStory(readFileSync(file, 'utf8')), 'move it into GameStory (gameStory.ts) — one ledger, written at the door').toEqual([]);
    });
  }

  it('learnMemory declares none of the merged slots, and holds the story', () => {
    const code = stripComments(readFileSync('src/services/learnMemory.ts', 'utf8'));
    for (const slot of ['spokenKeys', 'conceptTaught', 'principleTaught', 'spokenThreatLines', 'lastThreatKey', 'loudAlarms', 'spokenTacticLines', 'saidExplainers', 'pieceQualitySaid', 'questionsAnswered', 'lastPlies']) {
      expect(code, `learnMemory still declares ${slot}`).not.toMatch(new RegExp(`\\b${slot}\\b`));
    }
    expect(code).toMatch(/readonly story: StoryStore;/);
    expect(code).toMatch(/const story = createStoryStore\(mintGameId\(\)\);/);
  });

  it('the standing-fact ledger is gone, and nothing imports it', () => {
    for (const file of [...FILES, 'src/services/learnMemory.ts']) {
      expect(stripComments(readFileSync(file, 'utf8')), file).not.toMatch(/standingFactMemory/);
    }
  });

  it('ONE board detector and ONE reset door: the story is renewed only by learnMemory.newGame()', () => {
    const mem = stripComments(readFileSync('src/services/learnMemory.ts', 'utf8'));
    const ng = mem.indexOf('newGame(): void {');
    expect(ng).toBeGreaterThan(0);
    expect(mem.slice(ng, mem.indexOf('\n    },', ng))).toContain('story.newGame(mintGameId())');
    expect(mem.match(/story\.newGame\(/g) ?? []).toHaveLength(1);
    for (const file of FILES) {
      const code = stripComments(readFileSync(file, 'utf8'));
      expect(code, `${file} renews the story itself — a second door`).not.toMatch(/story\.newGame\(/);
      expect(code, `${file} detects a new game from the full move — a second detector`).not.toMatch(/\.observe\(fullmoveOf|fullmoveOf\(/);
    }
  });

  it('the phase hook only READS what was said — the surface\'s door writes it', () => {
    const hook = stripComments(readFileSync('src/hooks/usePhaseNarration.ts', 'utf8'));
    expect(hook).toMatch(/getSaid: \(fen: string\) => ReadonlySet<string>;/);
    expect(hook).not.toMatch(/\.remember\(|said\.add\(|story\.(?:commit|offer)\(/);
  });

  it('the five compute-time writes the design names are gone (page :9474-9477, :9880, :9919, :11256; hook :459)', () => {
    const page = stripComments(readFileSync(FILES[0], 'utf8'));
    // :9474-9477 — the threat lane marks itself only inside its door-run mark.
    const threat = page.indexOf('const threatsSaid = ');
    expect(threat).toBeGreaterThan(0);
    const end = page.indexOf("for (const k of [tacticLine ? tacticKey : '', threatLine ? threatKey : ''])", threat);
    expect(end).toBeGreaterThan(threat);
    const threatBlock = page.slice(threat, end);
    const commits = threatBlock.match(/story\.commit\(/g) ?? [];
    const marks = threatBlock.match(/markThreatSaid = \(\) => \{\s*learnMemRef\.current\.story\.commit\(/g) ?? [];
    expect(commits.length).toBeGreaterThan(0);
    expect(marks.length, 'every threat write is the door-run mark, never the compute').toBe(commits.length);
    // …and so is its "spoken" event: fired at compute, a threat the door held
    // was counted as spoken on every turn it came back (it is no longer marked
    // said, so it comes back).
    let outsideMarks = threatBlock;
    for (let at = outsideMarks.indexOf('markThreatSaid = () => {'); at >= 0; at = outsideMarks.indexOf('markThreatSaid = () => {', at + 1)) {
      const open = outsideMarks.indexOf('{', at);
      let depth = 0;
      let close = open;
      for (; close < outsideMarks.length; close++) {
        if (outsideMarks[close] === '{') depth++;
        else if (outsideMarks[close] === '}' && --depth === 0) break;
      }
      outsideMarks = outsideMarks.slice(0, open + 1) + outsideMarks.slice(close);
    }
    expect((threatBlock.match(/captureEvent\('tactics_alert_spoken'/g) ?? []).length, 'the event rides the mark').toBeGreaterThan(0);
    expect(outsideMarks, 'the threat alert\'s spoken event fires only where the door spoke it').not.toMatch(/captureEvent\('tactics_alert_spoken'/);
    expect(page).toMatch(/if \(instantDecision\.spoke\.includes\('threat'\)\) \{\s*markThreatSaid\?\.\(\);/);
    // :9880 — the bishop pair is OFFERED with the point that says it.
    expect(page).toMatch(/if \(pairJustWon\) learnMemRef\.current\.story\.offer\(args\.fenAfterReply, \{ text: BISHOP_PAIR_POINT, claims: \[\.\.\.BISHOP_PAIR_CLAIMS\] \}\);/);
    // :11256 — the rule clause's principle is OFFERED, never committed at compute.
    expect(page).toMatch(/if \(pf\.principleSpoken && ruleClause\?\.text\) learnMemRef\.current\.story\.offer\(/);
    expect(page).not.toMatch(/pf\.principleSpoken\.split\('\|'\)\)[^;]*commit/);
  });
});

/**
 * 🔒 THE PLANS LIVE IN THE STORY TOO (P1-8b). Learn kept the student's plan
 * thread on `learnMemory`, each side's arc and the boards a plan was told on in
 * page refs; Review kept its own `planT` and three one-claim memories
 * (`passerPlanFiles`, `convertTaughtPly`, `lastRaceVerdict`); the positional
 * read kept the structure's plan as `plan:<id>#<n>` keys in the say-once set.
 * None was rewound by a takeback, and Review's were rebuilt from nothing by a
 * seeded rebuild. One state now: the story's plan desk and threads.
 */
const PLAN_MEMORY = /\b(planArcRef|planToldBoardsRef|newPlanThread(?=\()|clonePlanThread(?=\()|EMPTY_ARC|learnMemRef\.current\.planThread)(?!\w)/g;
const REVIEW_PLAN_MEMORY = /\b(?:const|let)\s+(planT|passerPlanFiles|convertTaughtPly|lastRaceVerdict)\b|\bnewPlanThread\(/g;

function planMemoryIn(src: string, pattern: RegExp): string[] {
  // The named group when the pattern names one, else the whole match.
  return [...stripComments(src).matchAll(pattern)].map((m) => (m[1] as string | undefined) ?? m[0]);
}

/** The body of `reviewSegmentSteps` — the one Review build. */
function reviewBuild(src: string): string {
  const at = src.indexOf('function* reviewSegmentSteps(');
  return at < 0 ? '' : src.slice(at, src.indexOf('\nexport ', at));
}

describe('the plan family lives in GameStory', () => {
  it('the scanners see the shapes they must (negative control: the old code)', () => {
    const oldPage = `
      const planToldBoardsRef = useRef(new Set<string>());
      const planArcRef = useRef<{ theirs: ArcState; mine: ArcState }>({ theirs: EMPTY_ARC, mine: EMPTY_ARC });
      const planLive = learnMemRef.current.planThread ??= newPlanThread();
      const planTrial = clonePlanThread(planLive);`;
    expect(planMemoryIn(oldPage, PLAN_MEMORY)).toEqual(['planToldBoardsRef', 'planArcRef', 'EMPTY_ARC', 'EMPTY_ARC', 'learnMemRef.current.planThread', 'newPlanThread', 'clonePlanThread']);
    const oldReview = `function* reviewSegmentSteps(
      const planT: PlanThread = newPlanThread();
      let convertTaughtPly: number | null = null;
      const passerPlanFiles = new Set<string>();
      let lastRaceVerdict: string | null = null;
    }
export function x() {}`;
    expect(planMemoryIn(reviewBuild(oldReview), REVIEW_PLAN_MEMORY)).toEqual(['planT', 'newPlanThread(', 'convertTaughtPly', 'passerPlanFiles', 'lastRaceVerdict']);
  });

  for (const file of FILES) {
    it(`${file} keeps no plan memory of its own`, () => {
      expect(planMemoryIn(readFileSync(file, 'utf8'), PLAN_MEMORY), 'the plans are the story\'s (gameStory.ts: plans(), setPlans, threads)').toEqual([]);
    });
  }

  it('the plan state\'s values are the story\'s alone: the step functions keep no constructor or copy of their own', () => {
    // A second constructor is how a surface grows its own plan memory again
    // (`newPlanThread()` beside the story); the story's `emptyPlanThread` /
    // `copyPlanThread` and its `plans()` copy are the only ones.
    expect(stripComments(readFileSync('src/services/planThread.ts', 'utf8'))).not.toMatch(/export function (newPlanThread|clonePlanThread)\b/);
    expect(stripComments(readFileSync('src/services/boardComputers.ts', 'utf8'))).not.toMatch(/\b(newPlanThread|clonePlanThread)\b/);
  });

  it('learnMemory holds no plan thread beside the story', () => {
    expect(stripComments(readFileSync('src/services/learnMemory.ts', 'utf8'))).not.toMatch(/\bplanThread\b/);
  });

  it('Review\'s build keeps its plans in its story, never in locals', () => {
    const build = reviewBuild(readFileSync('src/services/coachFeatureService.ts', 'utf8'));
    expect(build.length, 'reviewSegmentSteps found').toBeGreaterThan(1000);
    expect(planMemoryIn(build, REVIEW_PLAN_MEMORY)).toEqual([]);
    // The build's story is its caller's (the narration keeps it), renewed for
    // the game when the build starts.
    expect(build).toMatch(/story: StoryStore = createStoryStore\(/);
    expect(build).toMatch(/story\.newGame\(currentGameId \?\? 'review'\)/);
    // The seed restores everything the walk had said, plans included.
    expect(build).toMatch(/story\.restore\(spokenBefore\.checkpoint\)/);
  });

  it('the positional read reads the structure thread, never a count hidden in the say-once set', () => {
    const pf = stripComments(readFileSync('src/services/positionFacts.ts', 'utf8'));
    expect(pf).not.toMatch(/plan:\$\{[^}]*\}#|\^plan:\(\.\+\)#/);
    expect(pf).toMatch(/structurePlanEvent\(asked \? null : input\.structurePlanHeard/);
  });
});

/**
 * 🔒 THE EVENTS LIVE IN THE STORY TOO (P1-8c). Learn kept the phase detector's
 * ledger in a page ref nothing reset (`phaseStateRef`: a second game crossed
 * into the middlegame in silence), the position's character and the opening's
 * break in two more, and six event slots on `learnMemory` (the opening read,
 * queued, named and its identity, the promises, the slips). Review kept its
 * own opening names and families, the endgame and model-game flags, the last
 * verdict word, the slips and the cause chains said — none rewound by a
 * takeback, and most of them never carried into a rebuilt or explored line.
 * Review's closing line ran the whole selector a second time to find the turn
 * the build had already read. One story now.
 */
const EVENT_MEMORY = /\b(phaseStateRef|characterRef|openingBreakRef|createPhaseTransitionState|EMPTY_CHARACTER(?!_STATE)|learnMemRef\.current\.(?:identitySaid|spokenOpeningName|queuedOpeningName|detectedOpeningName|promises|slipsThisGame))\b/g;
const REVIEW_EVENT_MEMORY = /\b(?:const|let)\s+(spokenOpening|announcedOpeningNames|announcedOpeningFamilies|lastAnnouncedOpeningName|storyShown|endgameAnnounced|lastVerdictWord|causalChainsSeen|reviewSlips)\b/g;

describe('the event family lives in GameStory', () => {
  it('the scanners see the shapes they must (negative control: the old code)', () => {
    const oldPage = `
      const phaseStateRef = useRef<PhaseTransitionState>(createPhaseTransitionState());
      const characterRef = useRef<CharacterState>(EMPTY_CHARACTER);
      const openingBreakRef = useRef(null);
      if (learnMemRef.current.identitySaid === null) {}
      learnMemRef.current.detectedOpeningName = det.name;`;
    expect(planMemoryIn(oldPage, EVENT_MEMORY)).toEqual([
      'phaseStateRef', 'createPhaseTransitionState', 'characterRef', 'EMPTY_CHARACTER', 'openingBreakRef',
      'learnMemRef.current.identitySaid', 'learnMemRef.current.detectedOpeningName',
    ]);
    const oldReview = `function* reviewSegmentSteps(
      let endgameAnnounced = false;
      const announcedOpeningFamilies = new Set<string>();
      let lastVerdictWord: string | null = null;
      const causalChainsSeen = new Set<string>();
    }
export function x() {}`;
    expect(planMemoryIn(reviewBuild(oldReview), REVIEW_EVENT_MEMORY)).toEqual(['endgameAnnounced', 'announcedOpeningFamilies', 'lastVerdictWord', 'causalChainsSeen']);
  });

  for (const file of FILES) {
    it(`${file} keeps no event memory of its own`, () => {
      expect(planMemoryIn(readFileSync(file, 'utf8'), EVENT_MEMORY), 'the events are the story\'s (gameStory.ts: note, offer events, the readers)').toEqual([]);
    });
  }

  it('learnMemory holds none of the event slots', () => {
    const code = stripComments(readFileSync('src/services/learnMemory.ts', 'utf8'));
    for (const slot of ['identitySaid', 'spokenOpeningName', 'queuedOpeningName', 'detectedOpeningName', 'promises', 'slipsThisGame']) {
      expect(code, `learnMemory still declares ${slot}`).not.toMatch(new RegExp(`\\b${slot}\\b`));
    }
  });

  it('Review\'s build keeps its events in its story, never in locals or seeded flags', () => {
    const build = reviewBuild(readFileSync('src/services/coachFeatureService.ts', 'utf8'));
    expect(planMemoryIn(build, REVIEW_EVENT_MEMORY)).toEqual([]);
    // The seed's flags and ledgers no longer carry them: the checkpoint does.
    expect(build).not.toMatch(/\['(?:on|of|cc):'/);
    expect(build).not.toMatch(/'(?:endgameAnnounced|storyShown)'|opening=\$\{/);
    // The turn is read once, by the build, and kept.
    expect(build).toMatch(/story\.note\(turn\.ply, \[\{ kind: 'turn', thesis: turn \}\]\)/);
  });

  it('the walk\'s closing line reads the turn from the story — no second selector run', () => {
    const review = stripComments(readFileSync('src/components/Coach/CoachGameReview.tsx', 'utf8'));
    expect(review).not.toMatch(/\bselectTeaching\w*\(|\bgameTurn\(/);
    expect(review).toMatch(/storyTurn\(walkStory\(walkNarration\)\)/);
  });

  it('a cause chain said is one claim on both surfaces', () => {
    const page = stripComments(readFileSync(FILES[0], 'utf8'));
    const build = reviewBuild(readFileSync('src/services/coachFeatureService.ts', 'utf8'));
    expect(page).toMatch(/\[causalChainKey\(chain\)\]/);
    expect(page).not.toMatch(/`causal:/);
    expect(build).toMatch(/causalChainKey\(chain\)/);
  });
});

/**
 * 🔒 REVIEW'S WHOLE BUILD LIVES IN THE STORY (P1-8d). The walk kept twenty-six
 * say-once Sets and nine flags of its own, stamped the keys each ply added on
 * its segment (`ledgerKeys`) beside a checkpoint stamped on some
 * (`storyCheckpoint`), and rebuilt a seed from both — with the flags
 * round-tripped through `syncFlags` / `restoreFlags` and four memories no seed
 * carried (the story lines told, the habits taught, the trade idea said, the
 * ply each principle was taught). One state now: every ledger a `storyLedger`
 * over the claim map, every flag a key in it, and the narration's one
 * checkpoint the only thing a seed is cut from.
 */
const REVIEW_SAY_ONCE_NAMES = [
  'hintsSaid', 'formulasSaid', 'refutedSaid', 'principlesTaught', 'reviewSpokenKeys', 'looseSaid', 'motifKeys',
  'seenFundamentals', 'seenConversionSteps', 'seenDecoys', 'trappedAnnounced', 'threatsAnnounced', 'lastHereSaid',
  'deepShotAnnounced', 'signalsAnnounced', 'emittedStaticFacets', 'standingSpoken', 'sacSpoken', 'verdictReasonsSeen',
  'thoughtKeys', 'structAtomsSeen', 'oneShotTags', 'oppTargetsSeen', 'flagsSaid', 'storySaid', 'spokenHabits',
  'principleTaughtAt', 'openingPlanShown', 'orientationShown', 'assessmentShown', 'psychologyReadDone',
  'opponentDevReadShown', 'sacCompShown', 'kingCenterTaught', 'tradeIdeaSpoken', 'standingSaid',
];
/** A say-once memory the build holds itself: one of the names above made from
 *  a literal (a new Set or Map, an array, a boolean, null) instead of the story. */
const REVIEW_OWN_MEMORY = new RegExp(`\\b(?:const|let)\\s+(${REVIEW_SAY_ONCE_NAMES.join('|')})\\b(?:\\s*:[^=;]+)?\\s*=\\s*(?:new\\s+(?:Set|Map)\\b|\\[|false\\b|true\\b|null\\b)`, 'g');
const REVIEW_SEED_MACHINERY = /\b(ledgerKeys|storyCheckpoint|stampLedgerKeys|syncFlags|restoreFlags|ledgerSizes|spokenLedgerSeed|SpokenLedgerSeed|ledgerAtMerge)\b/g;

describe('Review\'s whole build lives in GameStory', () => {
  it('the scanners see the shapes they must (negative control: the old code)', () => {
    const oldReview = `function* reviewSegmentSteps(
      const hintsSaid = new Set<string>();
      let openingPlanShown = false;
      let standingSaid: 'main' | 'side' | null = null;
      const storySaid: string[] = [];
      const principleTaughtAt = new Map<string, number>();
      const stampLedgerKeys = (): void => { last.ledgerKeys = keys; last.storyCheckpoint = cp; };
    }
export function x() {}`;
    expect(planMemoryIn(reviewBuild(oldReview), REVIEW_OWN_MEMORY)).toEqual(['hintsSaid', 'openingPlanShown', 'standingSaid', 'storySaid', 'principleTaughtAt']);
    expect(planMemoryIn(reviewBuild(oldReview), REVIEW_SEED_MACHINERY)).toEqual(['stampLedgerKeys', 'ledgerKeys', 'storyCheckpoint']);
  });

  it('the build declares no say-once memory or flag of its own — each is a ledger in its story', () => {
    const build = reviewBuild(readFileSync('src/services/coachFeatureService.ts', 'utf8'));
    expect(planMemoryIn(build, REVIEW_OWN_MEMORY)).toEqual([]);
    expect(build).toMatch(/storyLedger<K>\(story, prefix\)/);
    expect(build).toMatch(/const flags = ledger<ReviewFlag>\(REVIEW_SAID\.flag\)/);
  });

  for (const file of ['src/services/coachFeatureService.ts', 'src/services/reviewNarrationBuild.ts', 'src/components/Coach/CoachGameReview.tsx']) {
    it(`${file}: no key list or per-segment checkpoint beside the story`, () => {
      expect(planMemoryIn(readFileSync(file, 'utf8'), REVIEW_SEED_MACHINERY)).toEqual([]);
    });
  }

  it('the narration keeps one checkpoint, and a seed is it taken back to the ply walked', () => {
    const svc = stripComments(readFileSync('src/services/coachFeatureService.ts', 'utf8'));
    expect(svc).toMatch(/\n {2}story: string \| null;\n\}/);
    const build = stripComments(readFileSync('src/services/reviewNarrationBuild.ts', 'utf8'));
    expect(build).toMatch(/const checkpoint = storyThrough\(narration\.story, walkedThroughPly\);/);
    expect(build).toMatch(/story: spliceStory\(prev\.story, next\.story, frozenThroughPly\)/);
  });
});
