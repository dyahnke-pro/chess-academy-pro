import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decideTurn, LEARN_LANES, type LearnLane } from './learnTurnDoor';

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
    const d = decideTurn([{ lane: 'pieceQuality', text, fen: FEN, squares: ['f3', 'e5'] }]);
    expect(d.pkg.spoken.length).toBeGreaterThan(0);
    expect(d.spoke).toEqual(['pieceQuality']);
  });

  it('the plan arc speaks (behind the walkability check)', () => {
    const d = decideTurn([{ lane: 'planArc', text: "Their plan is taking shape: the knight's walk to e5.", fen: FEN, squares: ['e5'] }]);
    expect(d.spoke).toEqual(['planArc']);
  });

  it('Learn filters every aim through aimWalkableNow before the arc sees it', () => {
    expect(TEACH_CODE).toMatch(/aimsOf\(plan\.theirs, 'opponent'\)\.filter\(\(a\) => aimWalkableNow\(/);
    expect(TEACH_CODE).toMatch(/aimsOf\(plan\.mine, 'student'\)\.filter\(\(a\) => aimWalkableNow\(/);
  });

  it('a producer-decided kind rides through (the backward look)', () => {
    const d = decideTurn([{ lane: 'coachMistake', text: 'I slipped there — that knight move left f7 loose.', fen: FEN }]);
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
  const BOARD_CODE = readFileSync('src/services/learnBoardTeaching.ts', 'utf8');
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
      { lane: 'pieceQuality', text: F3, fen: FEN, squares: ['f3', 'e5'] },
      { lane: 'register', text: C6, fen: FEN, squares: ['c6', 'e5'] },
    ]);
    expect(d.lead?.lane).toBe('register');
    expect(d.pkg.spoken.startsWith('Their knight on c6')).toBe(true);
  });

  it('a fact that shares a square with the lead supports it; one that shares nothing is held', () => {
    const d = decideTurn([
      { lane: 'register', text: C6, fen: FEN, squares: ['c6', 'e5'] },
      { lane: 'pieceQuality', text: F3, fen: FEN, squares: ['f3', 'e5'] },
      { lane: 'behavior', text: F1, fen: FEN, squares: ['f1', 'c4'] },
    ]);
    expect(d.spoke).toEqual(expect.arrayContaining(['register', 'pieceQuality']));
    // Negative control: the unrelated description is held, not spoken.
    expect(d.held).toContain('behavior');
    expect(d.pkg.spoken).not.toContain('f1');
  });

  it('SAFETY FLOOR — a threat speaks even when something else leads', () => {
    const d = decideTurn([
      { lane: 'gem', text: C6, fen: FEN, squares: ['c6'] },
      { lane: 'threat', text: F1, fen: FEN, squares: ['f1', 'c4'] },
    ]);
    expect(d.lead?.lane).toBe('gem');
    expect(d.spoke).toContain('threat');
  });

  it('the late wave leads only by outranking the instant lead; safety still rides', () => {
    const prior = { lane: 'gem' as const, squares: ['a1'] };
    const d = decideTurn([
      { lane: 'pieceQuality', text: F3, fen: FEN, squares: ['f3', 'e5'] },
      { lane: 'threat', text: F1, fen: FEN, squares: ['f1', 'c4'] },
    ], undefined, undefined, prior);
    expect(d.lead).toBeNull();
    expect(d.held).toEqual(['pieceQuality']);
    expect(d.spoke).toEqual(['threat']);
    // …and a higher-ranked late fact does lead.
    const lower = { lane: 'pieceQuality' as const, squares: ['a1'] };
    const d2 = decideTurn([{ lane: 'register', text: C6, fen: FEN, squares: ['c6'] }], undefined, undefined, lower);
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
    const start = TEACH_CODE.indexOf('const instantDecision = decideTurn([');
    const end = TEACH_CODE.indexOf('learnMemRef.current.spokenKeys, null, provenTagsRef.current);', start);
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
    expect(TEACH_CODE).toMatch(/hit\.id === 'bishop-pair'\) standingRef\.current\.remember\('bishop-pair'\)/);
    // A board move counts as starting, so the welcome greeting never lands mid-game.
    expect(TEACH_CODE).toMatch(/handleStudentMove = useCallback\(\(move: MoveResult\): void => \{[\s\S]{0,600}userInteractedRef\.current = true/);
  });
});

describe('a spoken LINE draws its moves (David 2026-09-29: "I have never seen any!" → "deeper lines")', () => {
  it('the kept fact carries its line through the door, and it replays into arrows', async () => {
    const { keptLines } = await import('./learnTurnDoor');
    const text = "You'd love to grab the pawn with Nxe5 — but they answer Nxe5 and the knight is gone.";
    const d = decideTurn([{ lane: 'register', text, fen: FEN, lines: [{ fen: FEN, sans: ['Nxe5', 'Nxe5'] }] }]);
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
    const d = decideTurn([{ lane: 'register', text, fen: FEN, lines: [{ fen: FEN, sans: ['Nxe5', 'Nxe5'] }] }], 'Your knight on f3 attacks the pawn on e5.');
    expect(d.pkg.kept[0]?.lines).toBeUndefined();
  });
  it('Learn hands every line-speaking producer\'s lines to the queue, and draws on-screen and earlier boards apart', () => {
    expect(TEACH_CODE).toMatch(/queueSpokenHint\(probe\.fen\(\), registerNow, 'register', undefined, undefined, undefined, undefined, pendingRegisterLines\)/);
    expect(TEACH_CODE).toMatch(/pendingRegisterLines = \[\{ fen: probe\.fen\(\), sans: \[compareRead\.bestSan\] \}/);
    expect(TEACH_CODE).toMatch(/queueSpokenHint\(probe\.fen\(\), c\.text, lane, undefined, c\.claim \? \[c\.claim\] : undefined, undefined, undefined, c\.lines\)/);
    expect(TEACH_CODE).toMatch(/fundamental\?\.lines\)/);
    expect(TEACH_CODE).toMatch(/'fundamental', \[\], [^,]*\? \['convert-method'\] : undefined, move\.fen, undefined, bookSaidAlone \? undefined : fundamental\.lines\)/);
    expect(TEACH_CODE).toMatch(/keptLines\(hintPkg,/);
    // Their move's purpose leads over a board description (hand walk 2026-09-30, …g6).
    expect(TEACH_CODE).toMatch(/c\.kind === 'stopped' \? 'theirPurpose' as const/);
    expect(TEACH_CODE).toMatch(/setLineWalkFen\(showFen\)/);
  });
});

describe("their move's purpose leads over a description (hand walk 2026-09-30)", () => {
  it('"g6 has a point" speaks; "Qd3 takes aim" is held', () => {
    // The Ruy position after 20.Qd3 g6, student White to move.
    const fen = 'r2q1rk1/5p1p/p2p1bp1/1p1P4/8/3Q4/PPB2PPP/R1B1R1K1 w - - 0 21';
    const d = decideTurn([
      { lane: 'positionFacts', text: 'Your queen on d3 takes aim at the center, hitting d4 and e4.', fen, squares: ['d3', 'd4', 'e4'] },
      { lane: 'theirPurpose', text: 'g6 has a point: it stops the mate with Qxh7.', fen, squares: ['h7'] },
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
    expect(TEACH_CODE).toMatch(/legalSeeGainFor\(args\.fenAfterReply, low\.a, studentCC\) >= 0/);
  });
});

describe('a description restating the lead\'s piece is held (hand walk 2026-09-30, Ruy 9…Bg4)', () => {
  const RUY = 'r2qk2r/2p1bppp/p1np1n2/1p2p3/4P1b1/1BPP1N2/PP3PPP/RNBQR1K1 w kq - 1 9';
  it('the pin speaks; "their bishop on g4 is their best piece" is held', () => {
    const d = decideTurn([
      { lane: 'threat', text: 'Watch out — their bishop on g4 pins your knight on f3 against your queen on d1.', fen: RUY, squares: ['g4', 'f3', 'd1'] },
      { lane: 'pieceQuality', text: 'Their bishop on g4 is the piece doing the most work for them — trading it off takes the sting out of the position.', fen: RUY, squares: ['g4'] },
    ]);
    expect(d.spoke).toEqual(['threat']);
    expect(d.held).toEqual(['pieceQuality']);
  });
  it('a description that ADDS a square still rides as support', () => {
    const d = decideTurn([
      { lane: 'threat', text: 'Watch out — their bishop on g4 pins your knight on f3 against your queen on d1.', fen: RUY, squares: ['g4', 'f3', 'd1'] },
      { lane: 'positional', text: 'Your bishop on b3 bears down on f7, with your knight on f3 ready to join it.', fen: RUY, squares: ['f3', 'b3', 'f7'] },
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
  it('the door records the fade on its row', () => {
    const d = decideTurn([{ lane: 'trade', text: TWO, fen: FEN }], undefined, undefined, null, new Set(['bad-trade']));
    expect(d.faded).toEqual(['trade']);
    const cold = decideTurn([{ lane: 'trade', text: TWO, fen: FEN }], undefined, undefined, null, null);
    expect(cold.faded).toEqual([]);
  });
});

describe('the verdict on the student\'s own move is never held (Learn walk 2026-10-01, game 1 ply 66)', () => {
  it('a back-rank threat leads and the blunder grade still speaks', () => {
    const fen = '4r2k/pp1R2pp/5r2/2P5/1P4P1/7P/3KR3/8 b - - 0 34';
    const d = decideTurn([
      { lane: 'threat', text: 'Watch out — your king on h8 has no escape square and the back rank can be invaded from e2.', fen, squares: ['h8', 'e2'] },
      { lane: 'mistake', text: 'Rf6 was a blunder — it let them win the pawn on e2. Rc8 was the move.', fen, squares: ['f6', 'c8'] },
    ]);
    expect(d.spoke).toContain('threat');
    expect(d.spoke).toContain('mistake');
  });
});
