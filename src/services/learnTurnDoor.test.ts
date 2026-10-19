import { spokenSentenceKeys } from './voicePackage';
import { NO_PROOF } from './proof';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decideTurn, LEARN_LANES, type LearnLane } from './learnTurnDoor';
import { costStakes, mateStakes } from './factStakes';
import { countMethodTeaching, preventsNamedIdea, preventStakes, STOPPED_THEIR_IDEA } from './learnBoardTeaching';
import { readBoardAll } from './boardComputers';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const TEACH = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
/** Code only — a comment may name a retired symbol to explain why it went. */
const TEACH_CODE = TEACH.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('learnTurnDoor — the lane table decides, not a kind whitelist', () => {
  it('every lane says what it teaches', () => {
    for (const [lane, rule] of Object.entries(LEARN_LANES)) {
      expect(rule.why.length, `${lane} has no stated reason`).toBeGreaterThan(10);
    }
  });

  it('a lane speaks (positive control)', () => {
    // True on FEN (the board grader refuses a false claim — a knight "on c3"
    // there is refused, which is the package doing its job).
    const text = 'Your knight on f3 attacks the pawn on e5.';
    const d = decideTurn([{ lane: 'pieceQuality', proof: NO_PROOF.stated, text, fen: FEN, squares: ['f3', 'e5'] }]);
    expect(d.pkg.spoken.length).toBeGreaterThan(0);
    expect(d.spoke).toEqual(['pieceQuality']);
  });

  it('the plan arc speaks (behind the walkability check)', () => {
    const d = decideTurn([{ lane: 'planArc', proof: NO_PROOF.stated, text: "Their plan is taking shape: the knight's walk to e5.", fen: FEN, squares: ['e5'] }]);
    expect(d.spoke).toEqual(['planArc']);
  });

  it('Learn filters every aim through aimWalkableNow before the arc sees it', () => {
    expect(TEACH_CODE).toMatch(/aimsOf\(plan\.theirs, 'opponent'\)\.filter\(\(a\) => aimWalkableNow\(/);
    expect(TEACH_CODE).toMatch(/aimsOf\(plan\.mine, 'student'\)\.filter\(\(a\) => aimWalkableNow\(/);
  });

  it('a producer-decided kind rides through (the backward look)', () => {
    const d = decideTurn([{ lane: 'coachMistake', proof: NO_PROOF.stated, text: 'I slipped there — that knight move left f7 loose.', fen: FEN }]);
    expect(d.pkg.kept[0]?.kind).toBe('coachMistake');
  });
});

describe('the gate — Learn assembles its voice ONLY through the door', () => {
  it('no buildVoicePackage call on a live turn in CoachTeachPage', () => {
    // The one allowed call is the empty package for a finished game.
    const calls = TEACH_CODE.match(/buildVoicePackage\(/g) ?? [];
    expect(calls.length, 'a turn assembled its voice outside decideTurn').toBeLessThanOrEqual(1);
    expect(TEACH_CODE).toMatch(/buildVoicePackage\(\[\]\)/);
  });

  it('the kind whitelist and the always-on DNA switch are gone', () => {
    expect(TEACH_CODE).not.toMatch(/DNA_VOICE_KINDS/);
    expect(TEACH_CODE).not.toMatch(/NARRATE_DNA_ONLY/);
  });

  it('every queued line names a real lane', () => {
    const lanes = new Set(Object.keys(LEARN_LANES) as LearnLane[]);
    const calls = [...TEACH_CODE.matchAll(/queueSpokenHint\([^;]*?,\s*'([a-zA-Z]+)'/g)].map((m) => m[1]);
    expect(calls.length).toBeGreaterThan(10);
    for (const lane of calls) expect(lanes.has(lane as LearnLane), `unknown lane '${lane}'`).toBe(true);
  });
});

describe('G8.5 — no lane without a live producer, no producer without a lane', () => {
  // The backward look queues under its own verdict kind, one producer for three lanes.
  const VIA_BACKWARD_LOOK = new Set<LearnLane>(['drawback', 'mistake', 'coachMistake']);

  // The board-level teaching lanes are produced in ONE composer the page calls
  // (surfaceComposition gate); a lane there counts only while the page calls it.
  // `studentMoveTeaching` delegates batch 1 to `orderTeaching` — the same
  // composer, so its lanes count only while learnBoardTeaching calls it.
  const BOARD_CODE = readFileSync('src/services/learnBoardTeaching.ts', 'utf8')
    + (/orderTeaching\(i\)/.test(readFileSync('src/services/learnBoardTeaching.ts', 'utf8')) ? readFileSync('src/services/orderTeaching.ts', 'utf8') : '');
  const pageCallsBoard = /studentMoveTeaching\(|theirMoveTeaching\(/.test(TEACH_CODE);

  it('every lane in the table is fed by live code in CoachTeachPage', () => {
    for (const lane of Object.keys(LEARN_LANES) as LearnLane[]) {
      if (VIA_BACKWARD_LOOK.has(lane)) continue;
      const fed = new RegExp(`queueSpokenHint\\([^;]*'${lane}'|deferIf\\([^;]*'${lane}'|lane: '${lane}'|'${lane}' as const`).test(TEACH_CODE)
        || (pageCallsBoard && new RegExp(`lane: '${lane}'`).test(BOARD_CODE));
      expect(fed, `lane '${lane}' is in the table and nothing feeds it`).toBe(true);
    }
    expect(TEACH_CODE).toMatch(/queueSpokenHint\(cm\.fenAfter, look\.line, look\.kind[,)]/);
  });

  it('the producers deleted with their lanes stay deleted', () => {
    // Each of these computed text for a lane that never spoke (2026-09-29).
    for (const gone of ['engineReadLines', 'parseEvalSplit', 'forkOfferAt', 'buildForkTalk', 'buildThinkAloud',
      'lookaheadPlanRef', 'planSaidRef', 'planMarks(', 'trackABestReply', 'factLines', 'borrowedLine']) {
      expect(TEACH_CODE.includes(gone), `${gone} is back in CoachTeachPage`).toBe(false);
    }
  });
});

describe('WO-1b — one lead per turn', () => {
  const F3 = 'Your knight on f3 attacks the pawn on e5.';
  const C6 = 'Their knight on c6 defends the pawn on e5.';
  const F1 = 'Your bishop on f1 can come out to c4.';

  it('the highest-ranked survivor leads and OPENS the utterance', () => {
    const d = decideTurn([
      { lane: 'pieceQuality', proof: NO_PROOF.stated, text: F3, fen: FEN, squares: ['f3', 'e5'] },
      { lane: 'register', proof: NO_PROOF.stated, text: C6, fen: FEN, squares: ['c6', 'e5'] },
    ]);
    expect(d.lead?.lane).toBe('register');
    expect(d.pkg.spoken.startsWith('Their knight on c6')).toBe(true);
  });

  it('a fact that shares a square with the lead supports it; one that shares nothing is held', () => {
    const d = decideTurn([
      { lane: 'register', proof: NO_PROOF.stated, text: C6, fen: FEN, squares: ['c6', 'e5'] },
      { lane: 'pieceQuality', proof: NO_PROOF.stated, text: F3, fen: FEN, squares: ['f3', 'e5'] },
      { lane: 'behavior', proof: NO_PROOF.stated, text: F1, fen: FEN, squares: ['f1', 'c4'] },
    ]);
    expect(d.spoke).toEqual(expect.arrayContaining(['register', 'pieceQuality']));
    // Negative control: the unrelated description is held, not spoken.
    expect(d.held).toContain('behavior');
    expect(d.pkg.spoken).not.toContain('f1');
  });

  it('DANGER FIRST — a threat leads the turn, and the gem still speaks after it (David 2026-10-05)', () => {
    const d = decideTurn([
      { lane: 'gem', proof: NO_PROOF.stated, text: C6, fen: FEN, squares: ['c6'] },
      { lane: 'threat', proof: NO_PROOF.stated, text: F1, fen: FEN, squares: ['f1', 'c4'] },
    ]);
    expect(d.lead?.lane).toBe('threat');
    expect(d.spoke).toEqual(expect.arrayContaining(['threat', 'gem']));
    expect(d.pkg.spoken.indexOf('f1')).toBeLessThan(d.pkg.spoken.indexOf('c6'));
  });

  it('the late wave: danger leads it; a description that adds nothing is still quiet', () => {
    const prior = { lane: 'gem' as const, squares: ['a1'] };
    const d = decideTurn([
      { lane: 'pieceQuality', proof: NO_PROOF.stated, text: F3, fen: FEN, squares: ['f3', 'e5'] },
      { lane: 'threat', proof: NO_PROOF.stated, text: F1, fen: FEN, squares: ['f1', 'c4'] },
    ], undefined, undefined, prior);
    expect(d.lead?.lane).toBe('threat');
    expect(d.held).toEqual(['pieceQuality']);
    expect(d.spoke).toEqual(['threat']);
    // …and a higher-ranked late fact does lead.
    const lower = { lane: 'pieceQuality' as const, squares: ['a1'] };
    const d2 = decideTurn([{ lane: 'register', proof: NO_PROOF.stated, text: C6, fen: FEN, squares: ['c6'] }], undefined, undefined, lower);
    expect(d2.lead?.lane).toBe('register');
  });

  it('every lane declares a lead rank; the safety lanes are always-on', () => {
    for (const [lane, rule] of Object.entries(LEARN_LANES)) expect(typeof rule.lead, lane).toBe('number');
    expect(LEARN_LANES.threat.always).toBe(true);
    expect(LEARN_LANES.gem.always).toBe(true);
    // A character switch is said the move it happens or never — it rides.
    expect(LEARN_LANES.character.always).toBe(true);
    // Purpose outranks description — the scoreboard's finding, pinned.
    expect(LEARN_LANES.movePoint.lead).toBeGreaterThan(LEARN_LANES.pieceQuality.lead);
    expect(LEARN_LANES.planArc.lead).toBeGreaterThan(LEARN_LANES.behavior.lead);
  });
});

describe('WO-1b — board descriptions wait for the turn\'s one decision', () => {
  it('the instant wave carries only urgent lanes; descriptions are deferred to the late wave', () => {
    const start = TEACH_CODE.indexOf("const instantDecision = coachTurn({ posture: 'learn', turn: { kind: 'instant', ply: args.historyAfterReply.length - 1, moveCostCp: args.moveCostCp, midExchange: midExchangeOn }, facts: [");
    const end = TEACH_CODE.indexOf('priorKeys: learnMemRef.current.spokenKeys, priorLead: null', start);
    const instantCall = TEACH_CODE.slice(start, end);
    for (const lane of ['commentary', 'behavior', 'positional', 'kingSafety']) {
      expect(instantCall, `${lane} speaks instantly again — it will lead the turn by arriving first`).not.toContain(`'${lane}'`);
    }
    // Positive control: the urgent lanes are still there.
    for (const lane of ['gem', 'tactic', 'threat']) expect(instantCall).toContain(`'${lane}'`);
    // …and the deferred ones reach the late wave.
    expect(TEACH_CODE).toMatch(/for \(const d of instant\.deferred\) queueSpokenHint\(/);
  });
});

describe('WO-2 — a verdict on a good move carries its reason', () => {
  it('clear-best speaks only with the move\'s computed point', () => {
    expect(TEACH_CODE).toMatch(/\(grade\.reason !== 'clear-best' && grade\.reason !== 'only-move'\) \|\| !!goodPoint/);
    expect(TEACH_CODE).toMatch(/studentMovePoint\(fenBefore, move\.san/);
    // A recapture is never graded aloud unless it is a fault (hand walk 2026-09-30).
    expect(TEACH_CODE).toMatch(/&& !\(isRecapture && !grade\.fault\)/);
    // The bishop pair is said once a game, by whichever owner says it first.
    expect(TEACH_CODE).toMatch(/pairHeard \? allHits\.filter\(\(x\) => x\.id !== 'bishop-pair'\)/);
    // …written once the door KEEPS the line (its claim), never when offered.
    expect(TEACH_CODE).toMatch(/hit\.id === 'bishop-pair' \? \['bishop-pair'\] : \[\]/);
    expect(TEACH_CODE).toMatch(/rememberKeptClaims\(hintPkg\.kept, \(k\) => \{[\s\S]{0,300}positionalSaidRef\.current\.add\(k\); standingRef\.current\.remember\(k\);/);
    // A board move counts as starting, so the welcome greeting never lands mid-game.
    expect(TEACH_CODE).toMatch(/handleStudentMove = useCallback\(\(move: MoveResult\): void => \{[\s\S]{0,600}userInteractedRef\.current = true/);
  });
});

describe('a spoken LINE draws its moves (David 2026-09-29: "I have never seen any!" → "deeper lines")', () => {
  it('the kept fact carries its line through the door, and it replays into arrows', async () => {
    const { keptLines } = await import('./learnTurnDoor');
    const text = "You'd love to grab the pawn with Nxe5 — but they answer Nxe5 and the knight is gone.";
    const d = decideTurn([{ lane: 'register', proof: NO_PROOF.stated, text, fen: FEN, lines: [{ fen: FEN, sans: ['Nxe5', 'Nxe5'] }] }]);
    expect(d.spoke).toEqual(['register']);
    const drawn = keptLines(d.pkg, 'w');
    expect(drawn[0].arrows.map((a) => `${a.from}${a.to}:${a.side}`)).toEqual(['f3e5:student', 'c6e5:opponent']);
  });
  it('a line starts on its OWN board — a deeper line from an earlier position replays there', async () => {
    const { keptLines } = await import('./learnTurnDoor');
    const earlier = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const drawn = keptLines({ kept: [{ kind: 'computed', text: 'x', fen: FEN, lines: [{ fen: earlier, sans: ['Nf3', 'Nc6', 'Bb5'] }] }] }, 'w');
    expect(drawn[0].fen).toBe(earlier);
    expect(drawn[0].arrows.map((a) => a.san)).toEqual(['Nf3', 'Nc6', 'Bb5']);
  });
  it('an illegal move ends the line — never a spliced one', async () => {
    const { keptLines } = await import('./learnTurnDoor');
    const drawn = keptLines({ kept: [{ kind: 'computed', text: 'x', fen: FEN, lines: [{ fen: FEN, sans: ['Nxe5', 'Qh5', 'Nxe5'] }] }] }, 'w');
    expect(drawn[0].arrows).toHaveLength(1);
  });
  it('a fact that lost a sentence to the novelty set loses its lines with it', () => {
    const text = "You'd love to grab the pawn with Nxe5 — but they answer Nxe5 and the knight is gone. Your knight on f3 attacks the pawn on e5.";
    const d = decideTurn([{ lane: 'register', proof: NO_PROOF.stated, text, fen: FEN, lines: [{ fen: FEN, sans: ['Nxe5', 'Nxe5'] }] }], 'Your knight on f3 attacks the pawn on e5.');
    expect(d.pkg.kept[0]?.lines).toBeUndefined();
  });
  it('Learn hands every line-speaking producer\'s lines to the queue, and draws on-screen lines and never takes the board for an earlier one', () => {
    expect(TEACH_CODE).toMatch(/queueSpokenHint\(probe\.fen\(\), registerNow, 'register', .*?, undefined, undefined, undefined, undefined, pendingRegisterLines\)/);
    // The student's best move is never drawn before they play it (prod walk 2026-10-19).
    expect(TEACH_CODE).not.toMatch(/sans: \[compareRead\.bestSan\]/);
    expect(TEACH_CODE).toMatch(/queueSpokenHint\(probe\.fen\(\), c\.text, lane, .*?, c\.squares, c\.claim \? \[c\.claim\] : undefined, c\.gradeFen, undefined, c\.lines, c\.stakes, FACT_ROLE\[c\.kind\], c\.kind, c\.skill\)/);
    expect(TEACH_CODE).toMatch(/(?:fundamental|fund)\?\.lines[,)]/);
    expect(TEACH_CODE).toMatch(/'fundamental', NO_PROOF\.method, \[\], [^,]*\? \['convert-method'\] : undefined, move\.fen, undefined, bookSaidAlone \? undefined : fundamental\.lines, undefined, undefined, undefined, FUNDAMENTAL_TAG\[fundamental\.id\] \?\? undefined\)/);
    expect(TEACH_CODE).toMatch(/keptLines\(hintPkg,/);
    // Their move's purpose leads over a board description (hand walk 2026-09-30, …g6).
    expect(TEACH_CODE).toMatch(/c\.kind === 'stopped' \? 'theirPurpose' as const/);
    // An earlier board is spoken, never shown: showing it took the board from
    // the student on their turn (David 2026-10-19: "never freeze for the user").
    expect(TEACH_CODE).not.toMatch(/lineWalk\.hold\(/);
  });
});

describe("their move's purpose leads over a description (hand walk 2026-09-30)", () => {
  it('"g6 has a point" speaks; "Qd3 takes aim" is held', () => {
    // The Ruy position after 20.Qd3 g6, student White to move.
    const fen = 'r2q1rk1/5p1p/p2p1bp1/1p1P4/8/3Q4/PPB2PPP/R1B1R1K1 w - - 0 21';
    const d = decideTurn([
      { lane: 'positionFacts', proof: NO_PROOF.stated, text: 'Your queen on d3 takes aim at the center, hitting d4 and e4.', fen, squares: ['d3', 'd4', 'e4'] },
      { lane: 'theirPurpose', proof: NO_PROOF.stated, text: 'g6 has a point: it stops the mate with Qxh7.', fen, squares: ['h7'] },
    ]);
    expect(d.lead?.lane).toBe('theirPurpose');
    expect(d.spoke).toEqual(['theirPurpose']);
  });
});

describe('a smaller attacker you can take back is not "it has to move" (hand walk 2026-09-30, Ruy 14.d4 cxd4)', () => {
  it('cxd4 answers the pawn on d4 without losing material', async () => {
    const { legalSeeGainFor } = await import('./positionReadingService');
    const fen = 'r2q1rk1/4bppp/p1npbn2/1p2p3/3pP3/2P1NN2/PPB2PPP/R1BQR1K1 w - - 0 15';
    expect(legalSeeGainFor(fen, 'd4', 'w')).toBeGreaterThanOrEqual(0);
    expect(TEACH_CODE).toMatch(/takingTheAttackerAnswers\(args\.fenAfterReply, low\.a, studentCC\)/);
  });
});

describe('a description restating the lead\'s piece is held (hand walk 2026-09-30, Ruy 9…Bg4)', () => {
  const RUY = 'r2qk2r/2p1bppp/p1np1n2/1p2p3/4P1b1/1BPP1N2/PP3PPP/RNBQR1K1 w kq - 1 9';
  it('the pin speaks; "their bishop on g4 is their best piece" is held', () => {
    const d = decideTurn([
      { lane: 'threat', proof: NO_PROOF.stated, text: 'Watch out — their bishop on g4 pins your knight on f3 against your queen on d1.', fen: RUY, squares: ['g4', 'f3', 'd1'] },
      { lane: 'pieceQuality', proof: NO_PROOF.stated, text: 'Their bishop on g4 is the piece doing the most work for them — trading it off takes the sting out of the position.', fen: RUY, squares: ['g4'] },
    ]);
    expect(d.spoke).toEqual(['threat']);
    expect(d.held).toEqual(['pieceQuality']);
  });
  it('a description that ADDS a square still rides as support', () => {
    const d = decideTurn([
      { lane: 'threat', proof: NO_PROOF.stated, text: 'Watch out — their bishop on g4 pins your knight on f3 against your queen on d1.', fen: RUY, squares: ['g4', 'f3', 'd1'] },
      { lane: 'positional', proof: NO_PROOF.stated, text: 'Your bishop on b3 bears down on f7, with your knight on f3 ready to join it.', fen: RUY, squares: ['f3', 'b3', 'f7'] },
    ]);
    expect(d.spoke).toContain('positional');
  });
});

describe('the character read counts tactics, not a piece that can step away (hand walk 2026-09-30)', () => {
  it('a hanging piece alone does not make the position sharp', () => {
    expect(TEACH_CODE).toMatch(/tacticLive: provenTacticLive\(tctxNow\.immediate\),/);
    expect(TEACH_CODE).not.toMatch(/tacticLive: tctxNow\.immediate\.length > 0 \|\| tctxNow\.hanging/);
  });
});

describe('"the tactics have settled" is never said with material loose (run J, UVJ ply 50)', () => {
  it('the positional switch is held while either side can win a piece by exchange', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(src).toMatch(/legalSeeGainFor\(probe\.fen\(\), c\.square,[^)]*\) > 0/);
    expect(src).toMatch(/\|\| looseNow\)/);
  });
});

describe('the fade — short phrasing when the skill is green (David 2026-09-30)', () => {
  const TWO = 'That trade gives up your better minor piece. Keep the bishop that has open diagonals and trade the one blocked by its own pawns.';
  it('a lane on a PROVEN tag speaks only its first sentence', async () => {
    const { fadeWhenGreen } = await import('./learnTurnDoor');
    expect(fadeWhenGreen('trade', TWO, new Set(['bad-trade']))).toBe('That trade gives up your better minor piece.');
  });
  it('grey or red keeps the full teaching (negative controls)', async () => {
    const { fadeWhenGreen } = await import('./learnTurnDoor');
    expect(fadeWhenGreen('trade', TWO, new Set())).toBe(TWO);
    expect(fadeWhenGreen('trade', TWO, null)).toBe(TWO);
    expect(fadeWhenGreen('trade', TWO, new Set(['hung-material']))).toBe(TWO);
  });
  it('a lane whose held half is not wired never fades — the app cannot see it green', async () => {
    const { fadeWhenGreen } = await import('./learnTurnDoor');
    // blunderCheck is tagged hung-material but only speaks on a slip.
    expect(fadeWhenGreen('blunderCheck', TWO, new Set(['hung-material']))).toBe(TWO);
  });
  it('a warning said BEFORE the move fades on its skill proven elsewhere (David 2026-10-18)', async () => {
    const { fadeWhenGreen } = await import('./learnTurnDoor');
    const WARN = 'This loses the game if you ignore it — their bishop on g4 hits your queen on d1. Guarding it does not save it.';
    expect(fadeWhenGreen('threat', WARN, new Set(['missed-opponents-threat']))).toBe('This loses the game if you ignore it — their bishop on g4 hits your queen on d1.');
    expect(fadeWhenGreen('threat', WARN, new Set())).toBe(WARN);
  });
  it('the door records the fade on its row', () => {
    const d = decideTurn([{ lane: 'trade', proof: NO_PROOF.stated, text: TWO, fen: FEN }], undefined, undefined, null, new Set(['bad-trade']));
    expect(d.faded).toEqual(['trade']);
    const cold = decideTurn([{ lane: 'trade', proof: NO_PROOF.stated, text: TWO, fen: FEN }], undefined, undefined, null, null);
    expect(cold.faded).toEqual([]);
  });
});

describe('the verdict on the student\'s own move is never held (Learn walk 2026-10-01, game 1 ply 66)', () => {
  it('a back-rank threat leads and the blunder grade still speaks', () => {
    const fen = '4r2k/pp1R2pp/5r2/2P5/1P4P1/7P/3KR3/8 b - - 0 34';
    const d = decideTurn([
      { lane: 'threat', proof: NO_PROOF.stated, text: 'Watch out — your king on h8 has no escape square and the back rank can be invaded from e2.', fen, squares: ['h8', 'e2'] },
      { lane: 'mistake', proof: NO_PROOF.stated, text: 'Rf6 was a blunder — it let them win the pawn on e2. Rc8 was the move.', fen, squares: ['f6', 'c8'] },
    ]);
    expect(d.spoke).toContain('threat');
    expect(d.spoke).toContain('mistake');
  });
});

describe('beginner mode — the fundamental behind a slip always rides (David 2026-10-02)', () => {
  const LEAD = 'Their knight on c6 defends the pawn on e5.';
  const FUND = 'You moved the same piece twice — develop a new one first.';
  const facts = (): Parameters<typeof decideTurn>[0] => [
    { lane: 'mistake', proof: NO_PROOF.stated, text: LEAD, fen: FEN, squares: ['c6', 'e5'] },
    { lane: 'fundamental', proof: NO_PROOF.stated, text: FUND, fen: FEN, squares: ['g1'] },
  ];

  it('an unrelated, unstaked aside waits for everyone else (2026-10-06: important is computed)', () => {
    const d = decideTurn(facts());
    expect(d.held).toContain('fundamental');
    expect(d.pkg.spoken).not.toContain('same piece twice');
  });

  it('spoken for a beginner, without changing what leads', () => {
    const d = decideTurn(facts(), undefined, undefined, null, null, true);
    expect(d.spoke).toContain('fundamental');
    expect(d.lead?.lane).toBe('mistake');
    expect(d.pkg.spoken).toContain('same piece twice');
  });
});

describe('ONE ORDER, NO HOLD (David 2026-10-05)', () => {
  const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
  it('a staked fact leads over a higher-lane unstaked one, and both speak', () => {
    const d = decideTurn([
      { lane: 'planArc', proof: NO_PROOF.stated, text: 'Their plan is the queenside push.', fen: FEN, squares: ['b5'] },
      { lane: 'positionFacts', proof: NO_PROOF.stated, text: 'Their knight on c6 is the glue — it alone holds e5.', fen: FEN, squares: ['c6', 'e5'], stakes: { points: 3, plies: 1 } },
    ]);
    expect(d.lead?.lane).toBe('positionFacts');
    expect(d.spoke).toEqual(expect.arrayContaining(['positionFacts', 'planArc']));
  });
  it('five IMPORTANT facts on one move (a pawn or more at stake each): all five speak', () => {
    const st = { points: 1.5, plies: 0 };
    const d = decideTurn([
      { lane: 'moveIntent', proof: NO_PROOF.stated, text: 'Your move stops Bb4.', fen: FEN, squares: ['b4'], stakes: st },
      { lane: 'planArc', proof: NO_PROOF.stated, text: 'Their plan is the queenside push.', fen: FEN, squares: ['b5'], stakes: st },
      { lane: 'openingIdea', proof: NO_PROOF.stated, text: 'Masters break with d5 here.', fen: FEN, squares: ['d5'], stakes: st },
      { lane: 'gap', proof: NO_PROOF.stated, text: 'Their move left f7 undefended.', fen: FEN, squares: ['f7'], stakes: st },
      { lane: 'positionFacts', proof: NO_PROOF.stated, text: 'Keep the tension on e5.', fen: FEN, squares: ['e5'], stakes: st },
    ]);
    expect(d.spoke).toHaveLength(5);
  });
  it('five small asides: the lead and what must ride speak, the rest waits (not laborious)', () => {
    const d = decideTurn([
      { lane: 'moveIntent', proof: NO_PROOF.stated, text: 'Your move stops Bb4.', fen: FEN, squares: ['b4'] },
      { lane: 'openingIdea', proof: NO_PROOF.stated, text: 'Masters break with d5 here.', fen: FEN, squares: ['d5'] },
      { lane: 'gap', proof: NO_PROOF.stated, text: 'Their move left f7 undefended.', fen: FEN, squares: ['f7'] },
      { lane: 'positionFacts', proof: NO_PROOF.stated, text: 'Keep the tension on e5.', fen: FEN, squares: ['e5'], stakes: { points: 0.3, plies: 0 } },
    ]);
    expect(d.spoke.length).toBeLessThan(4);
    expect(d.held.length).toBeGreaterThan(0);
  });
});

describe('a danger turn stays on the danger (prod tape 2026-10-06)', () => {
  const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
  it('an off-topic plan waits; a fact on the danger squares speaks', () => {
    const d = decideTurn([
      { lane: 'threat', proof: NO_PROOF.stated, text: 'Careful — your queen on d1 is attacked.', fen: FEN, squares: ['d1', 'g4'] },
      { lane: 'planArc', proof: NO_PROOF.stated, text: 'Their plan is the queenside push.', fen: FEN, squares: ['b5'] },
      { lane: 'moveIntent', proof: NO_PROOF.stated, text: 'Your move guards g4.', fen: FEN, squares: ['g4'] },
    ]);
    expect(d.spoke).toEqual(expect.arrayContaining(['threat', 'moveIntent']));
    expect(d.pkg.spoken).not.toContain('queenside push');
  });
});

describe('one claim, one seat (unity U6, Learn walk #26)', () => {
  // Black's pawn on d5 stands between White's rook on d1 and Black's queen on
  // d8: one geometry, read twice from opposite sides.
  const FEN = '3q2k1/5ppp/8/3p4/8/8/5PPP/3R2K1 w - - 0 1';
  it('two facts on the same squares speak once — the bigger stake wins', () => {
    const d = decideTurn([
      { lane: 'theirIntent', proof: NO_PROOF.stated, text: 'Their pawn on d5 is a discovered attack in waiting against the rook on d1.', fen: FEN, squares: ['d5', 'd1', 'd8'] },
      { lane: 'tactic', proof: NO_PROOF.stated, text: 'Your rook on d1 pins their pawn on d5 against their queen on d8.', fen: FEN, squares: ['d1', 'd5', 'd8'] },
    ]);
    expect(d.spoke).toEqual(['tactic']);
    expect(d.held).toContain('theirIntent');
  });
  it('facts on different squares both stay in the running', () => {
    const d = decideTurn([
      { lane: 'positional', proof: NO_PROOF.stated, text: 'Your pawn on h2 is weak.', fen: FEN, squares: ['h2'] },
      { lane: 'tactic', proof: NO_PROOF.stated, text: 'Your rook on d1 pins their pawn on d5 against their queen on d8.', fen: FEN, squares: ['d1', 'd5', 'd8'] },
    ]);
    expect(d.held).not.toContain('tactic');
  });
});

describe('ONE DOOR — Learn is a posture of coachTurn (one coach P1, 2026-10-07)', () => {
  const LEAD = 'Their knight on c6 defends the pawn on e5.';
  const FUND = 'You moved the same piece twice — develop a new one first.';
  const facts = (): Parameters<typeof decideTurn>[0] => [
    { lane: 'mistake', proof: NO_PROOF.stated, text: LEAD, fen: FEN, squares: ['c6', 'e5'] },
    { lane: 'fundamental', proof: NO_PROOF.method, text: FUND, fen: FEN, squares: ['g1'] },
  ];

  it('the door decides exactly what the Learn ranking decided — nothing changed on the way in', async () => {
    const { coachTurn } = await import('./coachDecider');
    for (const beginner of [false, true]) {
      const viaDoor = coachTurn({ posture: 'learn', turn: { kind: 'phase' }, facts: facts(), priorLead: null, green: null, beginner });
      const direct = decideTurn(facts(), undefined, undefined, null, null, beginner);
      expect(viaDoor).toEqual(direct);
    }
  });

  it('a conclusion on the "stated" escape is counted on the decision — Learn answers the same ledger as review', () => {
    const d = decideTurn(facts(), undefined, undefined, null, null, true);
    expect(d.spoke).toContain('mistake');
    expect(d.unprovenLanes).toEqual(['mistake']);
    expect(d.unproven).toBe(1);
    // A method line has a reason not to need one — it is not counted.
    expect(d.unprovenLanes).not.toContain('fundamental');
  });
});

describe('a mate turn stays on the mate (hard-question walk 2026-10-11, 21.e6)', () => {
  it('the allowed mate speaks; the weak-pawn aside and the plan wait', () => {
    const F = '2r2r1k/pp5p/2q1P3/8/4pN2/4P1Q1/bPP2P2/2KR2N1 w - - 1 22';
    const d = decideTurn([
      { lane: 'register', proof: NO_PROOF.stated, text: 'A structural cost: e6 is a weak pawn now.', fen: F, squares: ['e6'], stakes: { points: 1, plies: 2 } },
      { lane: 'mistake', proof: NO_PROOF.stated, text: 'e6 was a blunder — it let them force mate in 6.', fen: F, stakes: { points: 100, plies: 11 } },
    ]);
    expect(d.spoke).toContain('mistake');
    expect(d.spoke).not.toContain('register');
  });
});

describe('a verdict turn stays on the verdict (the "very good" bar, 2026-10-11)', () => {
  it('Qg3+: the blunder and its why speak; the route aside waits', () => {
    const F = '2r1qr1k/pp5p/8/4P3/4pN2/4P1Q1/bPP2P2/2KR2N1 w - - 2 21';
    const d = decideTurn([
      { lane: 'mistake', proof: NO_PROOF.stated, text: 'Qg3+ was a blunder — it let them go after your king.', fen: F, stakes: { points: 4, plies: 0 } },
      { lane: 'planArc', proof: NO_PROOF.stated, text: "Don't park a piece on f3 — it's the first stop for your knight on g1.", fen: F, squares: ['f3', 'g1'] },
    ]);
    expect(d.spoke).toContain('mistake');
    expect(d.spoke).not.toContain('planArc');
  });
});

describe('your forced mate comes before their threat (2026-10-13)', () => {
  // White to move: Qxf7 is mate. Black's knight on c6 can still go to d4.
  const F = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
  const threat = { lane: 'threat' as const, proof: NO_PROOF.stated, text: 'They threaten Nd4, hitting c2.', fen: F, squares: ['c6', 'd4', 'c2'], stakes: { points: 5, plies: 2 } };
  const mate = (forced: boolean) => ({ lane: 'kingAttack' as const, proof: NO_PROOF.stated, text: 'Qxf7 is mate — the queen takes on f7 and the king has no square.', fen: F, squares: ['h5', 'f7', 'e8'], stakes: mateStakes('you', 0, forced) });

  it('a forced mate of yours holds their threat', () => {
    const d = decideTurn([threat, mate(true)]);
    expect(d.spoke).toContain('kingAttack');
    expect(d.spoke).not.toContain('threat');
  });

  it('a mate you only threaten does not (they move first)', () => {
    const d = decideTurn([threat, mate(false)]);
    expect(d.spoke).toContain('threat');
  });
});

describe('a REASON outranks a description (David 2026-10-13: "value why statements over others")', () => {
  const lead = { lane: 'movePoint' as LearnLane, proof: NO_PROOF.stated, text: 'Your knight on f3 attacks the pawn on e5.', fen: FEN, squares: ['f3', 'e5'], stakes: { points: 1, plies: 1 } };
  const rule = 'Castle soon: a king left in the middle gets caught the moment the center opens.';
  it('a position fact whose role TEACHES speaks beside the lead', () => {
    const d = decideTurn([lead, { lane: 'positionFacts', proof: NO_PROOF.stated, text: rule, fen: FEN, squares: ['e1'], role: 'teach' }]);
    expect(d.pkg.spoken).toContain('gets caught');
    expect(d.held).not.toContain('positionFacts');
  });
  it('the same line marked DESCRIBE stays held, as a description always was', () => {
    const d = decideTurn([lead, { lane: 'positionFacts', proof: NO_PROOF.stated, text: rule, fen: FEN, squares: ['e1'], role: 'describe' }]);
    expect(d.pkg.spoken).not.toContain('gets caught');
    expect(d.held).toContain('positionFacts');
  });
  it('the producer passes the role from the ONE table over its clause kind', () => {
    expect(TEACH_CODE).toMatch(/c\.lines, c\.stakes, FACT_ROLE\[c\.kind\], c\.kind, c\.skill\)/);
  });
});

describe('a forced mate leads however far away it is (Learn walk 2026-10-14)', () => {
  it('"Bd6 was a blunder — it let them force mate in 12" leads a critical-moment line', () => {
    const d = decideTurn([
      { lane: 'timing', proof: NO_PROOF.stated, text: 'Critical moment — only one move limits the damage. Slow down here.', fen: FEN, stakes: { points: 3, plies: 0 } },
      { lane: 'mistake', proof: NO_PROOF.stated, text: 'Bc4 was a blunder — it let them force mate in 12.', fen: FEN, stakes: mateStakes('them', 23, true) },
    ]);
    expect(d.lead?.lane).toBe('mistake');
    // A mate turn stays on the mate: the critical-moment line waits.
    expect(d.pkg.spoken).toBe('Bc4 was a blunder — it let them force mate in 12.');
    expect(d.held).toContain('timing');
  });
});

describe('the turn holds decide before its lead (Learn audit 2026-10-14, LD2)', () => {
  it('a far mate holds the board read — and the lead is the mate verdict that spoke, never the held read', () => {
    const d = decideTurn([
      { lane: 'checkMethod', proof: NO_PROOF.stated, text: 'Before you let go of a piece, run checks, captures and threats for them.', fen: FEN },
      { lane: 'positionFacts', proof: NO_PROOF.stated, text: 'The centre is still closed.', fen: FEN, stakes: costStakes(300) ?? undefined },
      { lane: 'mistake', proof: NO_PROOF.stated, text: 'Bc5 was a blunder — it let them force mate in 14.', fen: FEN, stakes: mateStakes('them', 27, true) },
    ]);
    expect(d.held).toContain('positionFacts');
    expect(d.spoke).toEqual(['mistake']);
    expect(d.lead?.lane).toBe('mistake');
  });
});

describe('a book departure is never said without its reason (Learn audit 2026-10-14, game 1)', () => {
  const RUY = 'r2qk2r/2p1bppp/p1np1n2/1p2p3/4P1b1/1BPP1N2/PP3PPP/RNBQR1K1 w kq - 1 9';
  it('a threat turn keeps the book move beside the departure it explains', () => {
    const d = decideTurn([
      { lane: 'threat', proof: NO_PROOF.stated, text: 'Watch out — their bishop on g4 pins your knight on f3 against your queen on d1.', fen: RUY, squares: ['g4', 'f3', 'd1'] },
      { lane: 'opening', proof: NO_PROOF.name, text: 'You left the book with d3.', fen: RUY },
      { lane: 'bookMove', proof: NO_PROOF.stated, text: 'The usual move there brings the last knight out toward d2.', fen: RUY, squares: ['b1', 'd2'], role: 'teach' },
    ]);
    expect(d.spoke).toContain('opening');
    expect(d.spoke).toContain('bookMove');
  });
});

describe('the blunder check rides with the verdict it explains (Learn audit 2026-10-14)', () => {
  it('a verdict turn keeps the line that names what the move lost', () => {
    const F = '2kr1b1r/ppp2ppp/2n1pn2/q2P4/6b1/2N2N1P/PPPB1PP1/R2QKB1R w KQ - 0 9';
    const d = decideTurn([
      { lane: 'mistake', proof: NO_PROOF.stated, text: 'e6 was a blunder — it cost three or four points of advantage.', fen: F, stakes: costStakes(350) ?? undefined },
      { lane: 'blunderCheck', proof: NO_PROOF.method, text: 'Blunder check before you let go of a piece: run CCT for them — what checks, captures and threats do they have once it lands? Here the answer was your bishop on g4.', fen: F, squares: ['g4'], stakes: { points: 3, plies: 1 } },
    ]);
    expect(d.spoke).toContain('mistake');
    expect(d.spoke).toContain('blunderCheck');
  });
});

describe('the door says whether the student\'s own move got its reason (David 2026-10-14)', () => {
  it('an own-move lane that spoke is emitted as its DNA beat; a board read alone is null', async () => {
    const { onLearnTurn } = await import('./coachDecisionEvents');
    const rows: Array<{ ownMove: string | null }> = [];
    const off = onLearnTurn((r) => rows.push(r));
    decideTurn([{ lane: 'pieceQuality', proof: NO_PROOF.stated, text: 'Your knight on f3 attacks the pawn on e5.', fen: FEN, squares: ['f3', 'e5'] }]);
    decideTurn([{ lane: 'coachMistake', proof: NO_PROOF.stated, text: 'I slipped there — that knight move left f7 loose.', fen: FEN }]);
    decideTurn([{ lane: 'movePoint', proof: NO_PROOF.stated, text: 'Your knight on f3 attacks the pawn on e5, so they must guard it.', fen: FEN, squares: ['f3', 'e5'] }]);
    off();
    expect(rows.map((r) => r.ownMove)).toEqual([null, null, 'affirm']);
  });
});

describe('the row names WHAT spoke inside a many-fact lane (A-plan P0)', () => {
  it('a position-facts weighing is emitted as its kind, so the grade can count choices', async () => {
    const { onLearnTurn } = await import('./coachDecisionEvents');
    const rows: Array<{ spokeKinds?: string[] }> = [];
    const off = onLearnTurn((r) => rows.push(r));
    decideTurn([{ lane: 'positionFacts', factKind: 'deliberation', role: 'teach', proof: NO_PROOF.stated, text: 'Bxf7+ looks tempting, but after Kxf7 the bishop is simply gone.', fen: FEN, squares: ['f7'] }]);
    off();
    expect(rows[0]?.spokeKinds).toEqual(['deliberation']);
  });
});

describe('a good move always gets its own reason (David 2026-10-14)', () => {
  it('the same reason for the move is said once, not by two lanes (prod walk 2026-10-18)', () => {
    // The exact Learn turn from prod: the strong-choice affirmation and the
    // queen's rescue rule both explained …Qa5, and both spoke.
    const B = 'rnb1kbnr/ppp1pppp/8/q7/8/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 4';
    const A = 'rnb1kbnr/ppp1pppp/8/q7/3P4/2N5/PPP2PPP/R1BQKBNR b KQkq - 0 4';
    const d = decideTurn([
      { lane: 'theirIntent', proof: NO_PROOF.stated, text: 'They play d4 first, to free their bishop on c1 for Bd2.', fen: B, squares: ['d4', 'd2'] },
      { lane: 'strongChoice', proof: NO_PROOF.description, claims: ['strong-choice:affirm'], text: "That's what strong players play here — it saves it from their knight on c3, and hits it back from a5; it also lines up an x-ray at their rook on a1.", fen: B, squares: [] },
      { lane: 'structureJudgement', proof: NO_PROOF.stated, text: 'Your bishop on f8 looks dead for now, but your pawns on c7 and e7 are what block it — moving them brings it to life.', fen: A, squares: ['f8'] },
      { lane: 'positionFacts', factKind: 'rule', role: 'teach', ownMoveReason: true, proof: NO_PROOF.stated, text: 'Your Qa5 saves it from their knight on c3, and hits it back from a5.', fen: B },
    ]);
    const said = d.pkg.kept.map((f) => f.text).join(' ');
    expect(said.match(/saves it from their knight on c3/g)?.length).toBe(1);
  });

  it('one reason for the move across BOTH waves (Learn tape 2026-10-19)', () => {
    const B = 'rnb1kbnr/ppp1pppp/8/q7/8/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 4';
    const first = decideTurn([
      { lane: 'strongChoice', proof: NO_PROOF.description, claims: ['strong-choice:affirm'], text: "That's what strong players play here — it saves it from their knight on c3, and hits it back from a5.", fen: B, squares: [] },
    ], undefined, undefined, null, null, false, { kind: 'late', ply: 6, moveCostCp: null, midExchange: null });
    const prior = new Set(spokenSentenceKeys(first.pkg));
    const second = decideTurn([
      { lane: 'theirIntent', proof: NO_PROOF.stated, text: 'They play d4 first, to free their bishop on c1 for Bd2.', fen: B, squares: ['d4', 'd2'] },
      { lane: 'positionFacts', factKind: 'rule', role: 'teach', ownMoveReason: true, proof: NO_PROOF.stated, text: 'Your queen to a5 saves it from their knight on c3, and hits it back from a5.', fen: B },
    ], undefined, prior, null, null, false, { kind: 'instant', ply: 6, moveCostCp: null, midExchange: null });
    expect(first.pkg.kept.map((f) => f.text).join(' ')).toMatch(/saves it from their knight on c3/);
    expect(second.pkg.kept.map((f) => f.text).join(' ')).not.toMatch(/saves it from/);
    expect(second.pkg.kept.map((f) => f.text).join(' ')).toMatch(/free their bishop/);
  });

  it('the move\'s point speaks even when a plan leads the turn', () => {
    const d = decideTurn([
      { lane: 'planArc', proof: NO_PROOF.stated, text: "Their plan is taking shape: the knight's walk to e5.", fen: FEN, squares: ['e5'] },
      { lane: 'movePoint', proof: NO_PROOF.description, text: 'That gets your last piece into the game, so your rooks can connect.', fen: FEN, squares: [] },
    ]);
    expect(d.spoke).toContain('movePoint');
  });
});

describe('no word cap — length never decides what speaks (David 2026-10-15)', () => {
  it('every reason for a slip speaks, however long the turn runs', () => {
    const pad = (w: string, n: number): string => `This ${Array.from({ length: n }, () => w).join(' ')} happened.`;
    const d = decideTurn([
      { lane: 'mistake', proof: NO_PROOF.stated, text: pad('mistake', 20), fen: FEN, stakes: costStakes(300) ?? undefined },
      { lane: 'blunderCheck', proof: NO_PROOF.stated, text: pad('check', 25), fen: FEN, stakes: costStakes(300) ?? undefined },
      { lane: 'fundamental', proof: NO_PROOF.stated, text: pad('rule', 26), fen: FEN, stakes: costStakes(100) ?? undefined },
      { lane: 'drawback', proof: NO_PROOF.stated, text: pad('cost', 27), fen: FEN, stakes: costStakes(50) ?? undefined },
    ]);
    expect(d.spoke).toEqual(expect.arrayContaining(['mistake', 'blunderCheck', 'fundamental', 'drawback']));
  });
  it('a plan keeps its how-to beside a danger and the move\'s own reason', () => {
    const pad = (w: string, n: number): string => `This ${Array.from({ length: n }, () => w).join(' ')} happened.`;
    const plan = "The plan from here is to attack their king on e1 before it gets out. Here's how: tuck your own king away, double your rooks on the open d-file, bring pieces in with tempo, and look for a sacrifice on d2 or f2.";
    const d = decideTurn([
      { lane: 'positionFacts', proof: NO_PROOF.stated, text: pad('danger', 26), fen: FEN, squares: ['d6'], stakes: costStakes(300) ?? undefined },
      { lane: 'moveIntent', proof: NO_PROOF.stated, text: pad('reason', 18), fen: FEN, squares: ['f5'] },
      { lane: 'planArc', proof: NO_PROOF.stated, text: plan, fen: FEN, squares: ['e1'] },
    ]);
    expect(d.pkg.kept.map((f) => f.text)).toContain(plan);
  });
});

describe('the habit closes the turn, the verdict opens it (Learn tape 2026-10-15)', () => {
  it('a big-stake blunder check still speaks AFTER the mistake it explains', () => {
    const verdict = 'Castle queenside was a mistake — it cost more than a point of advantage.';
    const habit = 'Blunder check before you let go of a piece: run CCT for them. Here the answer was your bishop on g4.';
    const d = decideTurn([
      { lane: 'blunderCheck', proof: NO_PROOF.stated, text: habit, fen: FEN, squares: ['g4'], stakes: costStakes(300) ?? undefined },
      { lane: 'mistake', proof: NO_PROOF.stated, text: verdict, fen: FEN, squares: ['e8', 'c8'], stakes: costStakes(120) ?? undefined },
    ]);
    expect(d.pkg.spoken.indexOf('was a mistake')).toBeGreaterThanOrEqual(0);
    expect(d.pkg.spoken.indexOf('was a mistake')).toBeLessThan(d.pkg.spoken.indexOf('Blunder check'));
  });
});

describe('Learn tries the plan thread on a copy and adopts only what spoke (A-plan P3)', () => {
  it('the live thread is never handed to the producer, and the door\'s kept claims decide', () => {
    expect(TEACH_CODE).toMatch(/readBoardAll\('planThread', \{\s*thread: planTrial,/);
    expect(TEACH_CODE).toMatch(/adoptPlanTrial\(planTry\.live, planTry\.trial, planTry\.offered, hintPkg\.kept\.flatMap/);
  });
});


describe('their next idea speaks by what it would win (A-plan P2, prod Learn 2026-10-16)', () => {
  const lead = { lane: 'movePoint' as const, proof: NO_PROOF.stated, text: 'That gets your last piece into the game, so your rooks can connect.', fen: FEN, squares: ['c1', 'd2'] };
  const theirs = (points: number) => ({ lane: 'theirIntent' as const, proof: NO_PROOF.stated, text: 'Their knight on c6 is getting ready for …Nd4, to hit your knight on f3.', fen: FEN, squares: ['c6', 'd4'], stakes: { points, plies: 1 } });
  it('a preparation that wins a pawn and more speaks beside a lead it shares no square with', () => {
    expect(decideTurn([lead, theirs(2)]).spoke).toContain('theirIntent');
  });
  it('…when another computed fact leads the wave (the prod case: held as an aside 6 of 8)', () => {
    const other = { lane: 'structureJudgement' as const, proof: NO_PROOF.stated, text: 'Your pawn on e4 is the one they can lean on now.', fen: FEN, squares: ['e4'], stakes: { points: 3, plies: 0 } };
    expect(decideTurn([other, theirs(1.5)]).spoke).toContain('theirIntent');
    // Unstaked, as it was emitted until now, it waited as an aside.
    const unstaked = { ...theirs(1.5), stakes: undefined };
    const d = decideTurn([other, unstaked]);
    expect(d.spoke).not.toContain('theirIntent');
  });
  it('Learn stakes it at emission and commits its principle only when it speaks', () => {
    expect(TEACH_CODE).toMatch(/prep\.gainCp > 0 \? \{ points: prep\.gainCp \/ 100, plies: 1 \} : undefined/);
    expect(TEACH_CODE).not.toMatch(/for \(const k of (?:theirRule|prepRule)\.keys\) learnMemRef\.current\.principleTaught\.add/);
  });
});

describe('a plan trial whose lines were all graded away is not adopted (prod Learn 2026-10-17)', () => {
  it('Learn adopts an empty trial only when nothing was produced', () => {
    expect(TEACH_CODE).toMatch(/if \(plansNow\.length === 0\) adoptPlanTrial\(planLive, planTrial, \[\], \[\]\);\s*else if \(planOffered\.length > 0\) planTrialRef\.current =/);
  });
});

describe('the choices speak by what they decide (A-plan P1, prod Learn 2026-10-17: choices 1 of 67 turns)', () => {
  const lead = { lane: 'movePoint' as const, proof: NO_PROOF.stated, text: 'That gets your last piece into the game, so your rooks can connect.', fen: FEN, squares: ['c1', 'd2'] };
  it('count-before-you-take carries the exchange net and speaks beside an unrelated lead', () => {
    const hint = countMethodTeaching('4k3/8/2p1p3/3n4/2P1PN2/8/8/4K3 w - - 0 1', 'w');
    const cnt = hint ? { lane: hint.lane, proof: hint.proof, text: hint.text, fen: FEN, squares: hint.squares, stakes: hint.stakes } : null;
    expect(cnt?.stakes?.points).toBeGreaterThanOrEqual(1);
    expect(decideTurn([lead, cnt!]).spoke).toContain('countMethod');
  });
  it('the priority before the move is a reason, never an aside', () => {
    const pri = { lane: 'priorityFirst' as const, proof: NO_PROOF.stated, text: "What's the priority here? Their pawn on d5 — it's isolated.", fen: FEN, squares: ['d5'], role: 'teach' as const };
    // A staked fact leads the turn, as on prod, where it was held 2 of 2.
    const staked = { ...lead, stakes: { points: 3, plies: 0 } };
    expect(decideTurn([staked, pri]).spoke).toContain('priorityFirst');
    expect(decideTurn([staked, { ...pri, role: undefined }]).spoke).not.toContain('priorityFirst');
  });
  it('Learn hands both to the door with their stake and role', () => {
    expect(TEACH_CODE).toMatch(/readBoard\('countMethod', \{ fen: probe\.fen\(\)/);
    expect(TEACH_CODE).toMatch(/'countMethod', cnt\.proof, cnt\.squares, \[cnt\.key\], undefined, undefined, undefined, cnt\.stakes, cnt\.role\)/);
    // One forwarder for every computed hint — arrows, stakes and role ride.
    expect(TEACH_CODE).toMatch(/queueSpokenHint\(fen, hint\.text, hint\.lane, hint\.proof, hint\.squares, hint\.claims, gradeFen, hint\.arrows, undefined, hint\.stakes, hint\.role\)/);
    expect(TEACH_CODE).not.toMatch(/queueSpokenHint\([^,\n]*, (\w+)\.text, \1\.lane, \1\.proof, \1\.squares, \1\.claims\)/);
    // Priority-first speaks its reason with NO arrow: the arrow would be the answer.
    expect(TEACH_CODE).toMatch(/queueSpokenHint\(probe\.fen\(\), pfLine, 'priorityFirst', [^\n]*, \[pf\.targetSquare\], undefined, undefined, undefined, undefined, undefined, 'teach'\)/);
    expect(TEACH_CODE).not.toMatch(/source: 'learn\.priorityFirst'/);
  });
});

describe('prevention closes its loop (A-plan P2, 2026-10-17)', () => {
  const B = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
  it('a move from the named board that takes their prepared move away is the stop', () => {
    expect(preventsNamedIdea({ uci: 'c6d4', fen: B }, B.replace(' 2 3', ' 4 9'), 'c6d4')).toBe(true);
    expect(preventsNamedIdea({ uci: 'c6d4', fen: B }, B, 'f8c5')).toBe(false);
    expect(preventsNamedIdea(null, B, 'c6d4')).toBe(false);
    expect(preventsNamedIdea({ uci: 'c6d4', fen: B }, B.replace(' w ', ' b '), 'c6d4')).toBe(false);
  });
  it('the stop, staked at the threat, speaks beside an unrelated staked lead', () => {
    const lead = { lane: 'structureJudgement' as const, proof: NO_PROOF.stated, text: 'Your pawn on e4 is the one they can lean on now.', fen: FEN, squares: ['e4'], stakes: { points: 3, plies: 0 } };
    const stop = { lane: 'moveIntent' as const, proof: NO_PROOF.stated, text: `The point of c3: it takes …Nd4 away. ${STOPPED_THEIR_IDEA}`, fen: FEN, squares: ['c6', 'd4'], stakes: preventStakes({ threatCp: 150 }), factKind: 'stopped' };
    expect(decideTurn([lead, stop]).spoke).toContain('moveIntent');
  });
  it('Learn remembers their prepared move and stakes + tags the stop', () => {
    expect(TEACH_CODE).toMatch(/learnMemRef\.current\.theirPrep = \{ uci: prep\.uci, fen: fenAfterReply \}/);
    expect(TEACH_CODE).toMatch(/preventStakes\(intent\.prevents\), undefined, intent\.prevents \? 'stopped' : undefined\)/);
  });
});

describe('a structure judgement is a reason, never an aside (A-plan P3, prod Learn: held 10 of 23)', () => {
  it('the registry carries the teaching role and Learn hands it to the door', () => {
    const KP = '3q2k1/5ppp/8/3p4/4p3/2N3P1/PP3PBP/6K1 w - - 0 20';
    const reads = readBoardAll('structureBoard', { fen: KP, student: 'w' });
    const key = reads.find((r) => /key pawn/.test(r.text));
    expect(key?.role).toBe('teach');
    const lead = { lane: 'movePoint' as const, proof: NO_PROOF.stated, text: 'That gets your knight into the game.', fen: KP, squares: ['c3'], stakes: { points: 3, plies: 0 } };
    const sj = { lane: 'structureJudgement' as const, proof: NO_PROOF.stated, text: key!.text, fen: KP, squares: key!.squares, role: key!.role };
    expect(decideTurn([lead, sj]).spoke).toContain('structureJudgement');
    expect(decideTurn([lead, { ...sj, role: undefined }]).spoke).not.toContain('structureJudgement');
    expect((TEACH_CODE.match(/'structureJudgement', st\.proof, st\.squares, \[st\.key\], undefined, undefined, undefined, st\.stakes, st\.role\)/g) ?? []).length).toBe(2);
  });
});

describe('the fade is gradual (2026-10-17): lighter while learning, short once proven', () => {
  const THREE = 'That trade gives up your better minor piece. Your bishop on c4 has open diagonals. Keep the bishop that has open diagonals and trade the one blocked by its own pawns.';
  it('a skill answered right since its last miss keeps the point and its reason', async () => {
    const { fadeWhenGreen } = await import('./learnTurnDoor');
    expect(fadeWhenGreen('trade', THREE, new Map([['bad-trade', 'lighter' as const]]))).toBe('That trade gives up your better minor piece. Your bishop on c4 has open diagonals.');
  });
  it('a proven skill keeps the point alone; an unknown skill keeps the whole lesson', async () => {
    const { fadeWhenGreen } = await import('./learnTurnDoor');
    expect(fadeWhenGreen('trade', THREE, new Map([['bad-trade', 'short' as const]]))).toBe('That trade gives up your better minor piece.');
    expect(fadeWhenGreen('trade', THREE, new Map([['hung-material', 'short' as const]]))).toBe(THREE);
  });
  it('the record decides the level: proven is short, a held streak is lighter, nothing is full', async () => {
    const { fadeLevelFor } = await import('./fadeText');
    expect(fadeLevelFor({ held: 9, broken: 0, heldStreak: 9, streakGames: 9 })).toBe('short');
    expect(fadeLevelFor({ held: 1, broken: 2, heldStreak: 1, streakGames: 1 })).toBe('lighter');
    expect(fadeLevelFor({ held: 1, broken: 2, heldStreak: 0, streakGames: 0 })).toBeNull();
    expect(fadeLevelFor(undefined)).toBeNull();
    expect(readFileSync('src/services/weaknessSignalLoader.ts', 'utf8')).toMatch(/fadeLevelsFrom\(await getCapabilityProfile\(\)\)/);
    expect(TEACH_CODE).toMatch(/const provenTagsRef = useFadeLevels\(\);/);
  });
});

describe('rules and theory fade per skill (item 8, 2026-10-17)', () => {
  const RULE = 'Your Nf3 develops a piece toward the centre. A piece out early is a piece working, so bring the rest out before the queen goes hunting.';
  it('a rule line on a proven skill speaks its point alone; on an unknown skill, all of it', async () => {
    const { fadeWhenGreen } = await import('./learnTurnDoor');
    const levels = new Map([['neglected-development', 'short' as const]]);
    expect(fadeWhenGreen('positionFacts', RULE, levels, 'neglected-development')).toBe('Your Nf3 develops a piece toward the centre.');
    expect(fadeWhenGreen('positionFacts', RULE, levels, 'passive-rook')).toBe(RULE);
    // No skill on the fact: the lane's own tag decides, and positionFacts has none.
    expect(fadeWhenGreen('positionFacts', RULE, levels)).toBe(RULE);
  });
  it('the rule, the fundamental and the book move carry their skill to the door', () => {
    const pf = readFileSync('src/services/positionFacts.ts', 'utf8');
    expect(pf).toMatch(/\.\.\.\(ruleSkill\(a\.rule\.id\) \? \{ skill: ruleSkill\(a\.rule\.id\) \} : \{\}\)/);
    expect(TEACH_CODE).toMatch(/FACT_ROLE\[c\.kind\], c\.kind, c\.skill\)/);
    expect(TEACH_CODE).toMatch(/FUNDAMENTAL_TAG\[fundamental\.id\] \?\? undefined\)/);
    expect(TEACH_CODE).toMatch(/skill: FUNDAMENTAL_TAG\['left-book-early'\]/);
  });
});

describe('one reason for one move (Learn audit 2026-10-18)', () => {
  const Q = 'r1b1kbnr/ppp1pppp/2n5/q7/3P4/2N5/PPP2PPP/R1BQKBNR w KQkq - 3 5';
  it('the board-teacher fallback stands down when a sharper reason for the same move speaks', () => {
    const d = decideTurn([
      { lane: 'positionFacts', proof: NO_PROOF.stated, text: 'Your queen to a5 saves it from their knight on c3, and hits it back from a5.', fen: Q, squares: ['a5', 'c3'], ownMoveReason: true, role: 'teach' },
      { lane: 'movePoint', proof: NO_PROOF.description, text: 'The queen bears down on c5, backing your c-pawn\'s push there.', fen: Q, squares: ['c5'], claims: ['board-teacher:Qa5:x'], role: 'teach' },
    ]);
    expect(d.pkg.spoken).toContain('saves it');
    expect(d.pkg.spoken).not.toContain('bears down');
  });
  it('NEGATIVE CONTROL: alone, the fallback still gives the move its reason', () => {
    const d = decideTurn([
      { lane: 'movePoint', proof: NO_PROOF.description, text: 'The queen bears down on c5, backing your c-pawn\'s push there.', fen: Q, squares: ['c5'], claims: ['board-teacher:Qa5:x'] },
    ]);
    expect(d.pkg.spoken).toContain('bears down');
  });
});

describe('"nothing hinges" never sits beside a stake (Alekhine walk 2026-10-19)', () => {
  const calm = { lane: 'positionFacts' as const, proof: NO_PROOF.stated, text: 'Nothing hinges on your next move — pick a sensible one and keep your clock for the hard decisions.', fen: FEN, claims: ['srr:any-move-fine'] };
  const fork = { lane: 'positionFacts' as const, proof: NO_PROOF.stated, text: 'Watch c2 — a knight lands there in 2 and forks your king on e1 and rook on a1, so take the square away before it arrives.', fen: FEN, squares: ['c2'], stakes: { points: 5, plies: 3 } };
  it('the calm read stands down when something else is at stake', () => {
    const d = decideTurn([fork, calm]);
    expect(d.pkg.kept.map((k) => k.text).join(' ')).not.toMatch(/Nothing hinges/);
  });
  it('NEGATIVE CONTROL: alone, it speaks', () => {
    expect(decideTurn([calm]).pkg.kept.map((k) => k.text).join(' ')).toMatch(/Nothing hinges/);
  });
});
