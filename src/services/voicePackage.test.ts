// The package is the utterance. These are the properties that were lost when
// the phrasing model was removed from the live lane and the package went with
// it — David 2026-08-08: "We still need to be handing the phrase in a package.
// Deterministically… same rules apply, just now to Google voice."
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildVoicePackage, describeVoicePackage, type VoiceFact, markableSquares } from './voicePackage';

/** Move 3 of the Pirc David played on prod — quiet, everything home. */
const PIRC_3 = 'rnbqkb1r/ppp1pppp/3p1n2/8/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 1 3';

const fact = (kind: VoiceFact['kind'], text: string, fen = PIRC_3): VoiceFact => ({ kind, text, fen });

describe('the voice package', () => {
  it('THE REGRESSION: refuses the three lines David actually heard', () => {
    // Each was spoken over this board announced as "the pin on the board".
    // None names a square, so the square-anchored grader alone cannot settle
    // them — the configuration check is what refuses them.
    const pkg = buildVoicePackage([
      fact('note', 'Doubled rooks on the open file x-ray the opposing rook behind a knight.'),
      fact('note', 'The passed pawn decides the game.'),
    ]);
    expect(pkg.spoken).toBe('');
    expect(pkg.kept).toEqual([]);
    expect(pkg.dropped.map((d) => d.reason)).toEqual(['board lacks doubled rooks', 'board lacks passed pawn']);
  });

  it('what is SPOKEN and what is LOGGED are one object', () => {
    // The divergence this file exists to end: the old code logged `factLines`
    // and spoke a separately-built string, so the audit could describe
    // something the student never heard.
    const pkg = buildVoicePackage([
      fact('computed', 'The knight on f6 is your most active piece.'),
      fact('threat', 'Their pawn on d4 is undefended.'),
    ]);
    expect(pkg.spoken).toBe(pkg.kept.map((f) => f.text).join(' '));
    expect(pkg.spoken).not.toBe('');
    expect(describeVoicePackage(pkg)).toContain('threat');
  });

  it('the filler lane can never displace teaching', () => {
    // `observation` exists because the positional read shared the note rank,
    // which let "your pawn on a2 is isolated" outrank a masterclass beat.
    const pkg = buildVoicePackage([
      fact('observation', 'Your pawn on a2 is isolated.'),
      fact('note', 'Fight for the centre early.'),
    ]);
    expect(pkg.kept.map((f) => f.kind)).toEqual(['note', 'observation']);
  });

  it('is deterministic — same facts in, same words out', () => {
    const facts = [fact('threat', 'Their pawn on d4 is undefended.'), fact('note', 'Fight for the centre early.')];
    expect(buildVoicePackage(facts).spoken).toBe(buildVoicePackage([...facts]).spoken);
  });

  it('judges each fact against ITS OWN board, not a shared one', () => {
    // Facts arrive from producers that ran at different moments — during an
    // animation the live FEN is not the FEN a fact was computed from, and
    // judging by the wrong board is the whole bug class. Same sentence, two
    // boards, opposite verdicts.
    const endgame = '8/8/8/3k4/8/8/4RR2/4K3 w - - 0 60';   // rooks doubled? no — e2/f2 are adjacent files
    const doubled = '8/8/8/3k4/8/8/4R3/4R1K1 w - - 0 60';   // e2 + e1, same file
    const claim = 'Doubled rooks decide it.';
    expect(buildVoicePackage([fact('computed', claim, endgame)]).spoken).toBe('');
    expect(buildVoicePackage([fact('computed', claim, doubled)]).spoken).toBe(claim);
  });

  it('a duplicate sentence is one sentence to the ear', () => {
    const pkg = buildVoicePackage([
      fact('computed', 'Their pawn on d4 is undefended.'),
      fact('note', 'their pawn on d4 is undefended'),
    ]);
    expect(pkg.kept).toHaveLength(1);
    expect(pkg.dropped[0]?.reason).toBe('duplicate');
  });

  it('NO BUDGET — every verified fact is spoken', () => {
    // David 2026-08-09: "No budget on the coach narrations! They should all be
    // free now!!" A 3-fact cap used to discard verified facts unheard; the
    // rationing existed for a per-call model cost that no longer exists.
    const board = new Chess(PIRC_3);
    expect(board.turn()).toBe('w');
    const pkg = buildVoicePackage([
      fact('gem', 'One.'), fact('alert', 'Two.'), fact('opening', 'Three.'),
      fact('computed', 'Four.'), fact('note', 'Five.'), fact('observation', 'Six.'),
    ]);
    expect(pkg.kept).toHaveLength(6);
    expect(pkg.dropped).toEqual([]);
    // Rank still orders it, which is what makes an uncapped utterance safe: a
    // student who moves again mid-sentence only ever loses the tail.
    expect(pkg.kept.map((f) => f.kind))
      .toEqual(['gem', 'alert', 'note', 'opening', 'computed', 'observation']);
  });
});

// From David's live Vienna run, 2026-08-08.
describe('the join', () => {
  it('THE REGRESSION: a following fact starts a sentence, not a clause', () => {
    // He heard: "That takes your pawn. the knight on e4 sits on an outpost…"
    // and "There's a real pin here for you — look for it. the knight on e4…".
    // Each producer writes a standalone sentence; some open lowercase because
    // they were authored to be spliced mid-sentence. After a full stop that
    // lowercase reads as a mistake and HEARS as one — the voice drops pitch as
    // if continuing a clause.
    const fen = 'rnbqkb1r/ppp2ppp/8/3pP3/4n3/2N5/PPPP2PP/R1BQKBNR w KQkq - 0 5';
    const pkg = buildVoicePackage([
      { kind: 'threat', text: 'That takes your pawn.', fen },
      { kind: 'computed', text: 'the knight on e4 sits on an outpost no pawn can challenge.', fen },
    ]);
    expect(pkg.spoken).toBe('That takes your pawn. The knight on e4 sits on an outpost no pawn can challenge.');
  });

  it('capitalises the FIRST sentence too — the one it used to exempt', () => {
    // The guard read `isFirst || alreadyCapital ? leaveAlone : capitalise`,
    // which spared exactly the sentence that most needs a capital. David's
    // 2026-08-08 log opened a whole turn with "the knight on e4 sits on an
    // outpost no pawn can challenge." A sentence's POSITION has no bearing on
    // whether it starts with a capital.
    const fen = 'rnbqkb1r/ppp2ppp/8/3pP3/4n3/2N5/PPPP2PP/R1BQKBNR w KQkq - 0 5';
    const pkg = buildVoicePackage([
      { kind: 'computed', text: 'the knight on e4 sits on an outpost no pawn can challenge.', fen },
    ]);
    expect(pkg.spoken).toBe('The knight on e4 sits on an outpost no pawn can challenge.');
  });

  it('leaves a move name lowercase — capitalising a SAN would be wrong', () => {
    const fen = 'rnbqkb1r/ppp2ppp/8/3pP3/4n3/2N5/PPPP2PP/R1BQKBNR w KQkq - 0 5';
    const pkg = buildVoicePackage([
      { kind: 'threat', text: 'Careful.', fen },
      { kind: 'computed', text: 'dxe5 would open the file.', fen },
    ]);
    expect(pkg.spoken).toContain('dxe5');
    expect(pkg.spoken).not.toContain('Dxe5');
  });

  it('does not touch a first fact that is already a sentence', () => {
    const fen = 'rnbqkb1r/ppp2ppp/8/3pP3/4n3/2N5/PPPP2PP/R1BQKBNR w KQkq - 0 5';
    expect(buildVoicePackage([{ kind: 'threat', text: 'Careful here.', fen }]).spoken).toBe('Careful here.');
  });
});

describe('the corpus note is always first', () => {
  // David 2026-08-10, correcting a reading of his ordering that had put the
  // note fifth: "Corpus notes are always first. I was talking about after
  // corpus has ran out and we are on computer narrations."
  //
  // This is a gate rather than a comment because the mistake was easy to make
  // and invisible once made — everything still gets spoken, so nothing looks
  // broken; the student just hears the computed line where the taught one
  // should have led.
  const at = (kind, text) => ({ kind, text, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' });

  it('leads with the note against every computed lane at once', () => {
    const pkg = buildVoicePackage([
      at('threat', 'Threat line.'),
      at('plan', 'Plan line.'),
      at('drawback', 'Drawback line.'),
      at('note', 'Note line.'),
    ]);
    expect(pkg.spoken.startsWith('Note line.'), `note did not lead: ${pkg.spoken}`).toBe(true);
  });

  it('yields to the gem — the one documented exception', () => {
    // David 2026-08-11, shown that the gem callout sat sixth: "You can change
    // the order." It is the only lane that asks the student to ACT ON THIS
    // MOVE — a note about the structure is as true thirty seconds later, and
    // "your opponent just slipped, there is a punish here" expires the instant
    // they play something else. The coach now walks into these traps on
    // purpose, so the walk-in IS the turn.
    //
    // Narrow by construction: the gem withholds the move, so leading with it
    // costs about a second and hands nothing over.
    const pkg = buildVoicePackage([at('note', 'Note line.'), at('gem', 'Gem line.')]);
    expect(pkg.spoken.startsWith('Gem line.'), `gem did not lead: ${pkg.spoken}`).toBe(true);
    expect(pkg.spoken, 'the note was dropped rather than following').toContain('Note line.');
  });

  it('orders the computed lanes gem, backwards, forward, threat', () => {
    const pkg = buildVoicePackage([
      at('threat', 'Threat line.'),
      at('gem', 'Gem line.'),
      at('plan', 'Plan line.'),
      at('drawback', 'Drawback line.'),
    ]);
    const order = ['Gem', 'Drawback', 'Plan', 'Threat']
      .map((w) => pkg.spoken.indexOf(w));
    expect(order.every((i) => i >= 0), `a lane was dropped: ${pkg.spoken}`).toBe(true);
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i - 1], `wrong order: ${pkg.spoken}`).toBeLessThan(order[i]);
    }
  });

  it('the borrowed note RANKS BELOW the plan but is no longer silenced by it', () => {
    // The history of this one test is the history of the rule.
    //
    // It first asserted the borrowed line was spoken AFTER the plan. David
    // 2026-08-10 went further — "I want more out of the PV and less from general
    // rules" → "Do it" — and it became: when the plan speaks, the rule stands
    // down.
    //
    // That was written for a plan that spoke occasionally. It does not:
    // `computedVoiceAudit` measured it firing on 90% of student turns, and the
    // corpus refused on 31 of the 33 turns it had something to say — 93.9%, for
    // this reason alone. David 2026-08-15: "I don't want the corpus narrowed
    // that much. I need to hear the teachings from the corpus!!"
    //
    // So it is back to ordering: the plan leads because it outranks, and the
    // teaching still gets said. Both, and longer — which is the instruction
    // ("The longer narrations are good. Do not cap them."). What still silences
    // the borrowed tier is an EVENT lane, asserted below.
    const pkg = buildVoicePackage([at('borrowed', 'Borrowed line.'), at('plan', 'Plan line.')]);
    expect(pkg.spoken).toContain('Plan');
    expect(pkg.spoken, 'the corpus must survive a routine forward plan').toContain('Borrowed');
    expect(pkg.spoken.indexOf('Plan')).toBeLessThan(pkg.spoken.indexOf('Borrowed'));
  });
});

// David 2026-08-10, having listened back to a live game: "I think I heard a
// double sentence." His iPhone transcript had five, all this shape.
describe('the same observation is never said twice with different morals', () => {
  const FEN = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5';

  it('THE REGRESSION: drops the second reading of the same loose piece', () => {
    // The alert lane and the running commentary both read the same undefended
    // knight off the same board, and both said so. Neither is wrong, and the
    // exact-match guard cannot see it because the sentences differ in their
    // TAILS — the observation is shared, the moral bolted to it is not.
    const pkg = buildVoicePackage([
      { kind: 'tactic', text: "Their knight on c3 is undefended — there's something to win here.", fen: FEN },
      { kind: 'observation', text: 'Their knight on c3 is undefended — an undefended piece is the seed of a tactic.', fen: FEN },
    ]);
    expect(pkg.kept.length, `heard twice: ${pkg.spoken}`).toBe(1);
    expect(pkg.dropped[0]?.reason).toContain('same observation');
  });

  it('keeps the FIRST one — the ranked lane wins, as everywhere else', () => {
    const pkg = buildVoicePackage([
      { kind: 'tactic', text: "Their knight on c3 is undefended — there's something to win here.", fen: FEN },
      { kind: 'observation', text: 'Their knight on c3 is undefended — an undefended piece is the seed of a tactic.', fen: FEN },
    ]);
    expect(pkg.spoken).toContain("something to win here");
  });

  it('does NOT collapse two different warnings that share an opener', () => {
    // "Watch out —" is an opener two genuinely different threats are entitled
    // to. Collapsing on it would silence real news, which is the opposite
    // failure and a worse one.
    const pkg = buildVoicePackage([
      { kind: 'threat', text: 'Watch out — the knight on c6 is attacked.', fen: FEN },
      { kind: 'tactic', text: 'Watch out — your bishop on c4 has no retreat.', fen: FEN },
    ]);
    expect(pkg.kept.length, 'a real second warning was swallowed').toBe(2);
  });

  it('does not collapse two facts about the same piece that say different things', () => {
    const pkg = buildVoicePackage([
      { kind: 'threat', text: 'Watch out — the knight on e4 is attacked and undefended.', fen: FEN },
      { kind: 'computed', text: 'The knight on e4 sits on an outpost no pawn can challenge.', fen: FEN },
    ]);
    expect(pkg.kept.length).toBe(2);
  });
});

describe('the general rule yields to the particular board', () => {
  // David 2026-08-10: "I want more out of the PV and less from general rules.
  // They do not match the board well enough." Then, asked whether they should
  // yield entirely: "Do it."
  //
  // His transcript is the case: five of twelve utterances in one game led with
  // borrowed teaching, including "with three extra pawns, trading pieces is the
  // fastest road to promotion" in a level middlegame. True somewhere; not there.
  const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6';
  const borrowed = fact('borrowed', 'As a rule in these positions: trade pieces when ahead.', FEN);

  it('KEEPS the borrowed tier when only the routine forward plan spoke', () => {
    // 🔒 THE REVERSAL, AND WHY. The forward plan is not an event: it needs only
    // a 4-ply PV, which always exists, so it is present on essentially every
    // turn by construction rather than because anything happened. Measured
    // through this function over 40 real student turns it fired on 90% of them
    // and took the corpus down on 93.9% of the turns the corpus had something —
    // inverting the locked 90/10 ratio, with the notes reaching ~10%.
    //
    // A scope guard that fires nine times in ten is a silencer. The stand-down
    // now keys on the EVENT lanes only (next three tests).
    const pkg = buildVoicePackage([
      borrowed,
      fact('plan', 'They want to win a pawn.', FEN),
    ]);
    expect(pkg.kept.map((f) => f.kind)).toEqual(['plan', 'borrowed']);
    expect(pkg.dropped).toHaveLength(0);
  });

  it('drops it when the student\'s own MISTAKE was called', () => {
    const pkg = buildVoicePackage([
      borrowed,
      fact('mistake', 'Nf3 was the move — it would win a pawn.', FEN),
    ]);
    expect(pkg.kept.map((f) => f.kind)).toEqual(['mistake']);
    expect(pkg.dropped[0]?.reason).toContain('look-ahead');
  });

  it('drops it when the COACH owned its own move', () => {
    const pkg = buildVoicePackage([
      borrowed,
      fact('coachMistake', 'That was a mistake from me. d4 was the move.', FEN),
    ]);
    expect(pkg.kept.map((f) => f.kind)).toEqual(['coachMistake']);
    expect(pkg.dropped[0]?.reason).toContain('look-ahead');
  });

  it('drops it for the REAR-facing plan too', () => {
    const pkg = buildVoicePackage([
      borrowed,
      fact('drawback', 'That let them win a piece.', FEN),
    ]);
    expect(pkg.kept.map((f) => f.kind)).toEqual(['drawback']);
  });

  it('a DETECTED tactic or threat stands it down (David 2026-08-23)', () => {
    // The device log had a wrong borrowed rule firing alongside a real,
    // board-computed threat. A general rule borrowed from another board yields
    // to the concrete thing happening on THIS one.
    const threatPkg = buildVoicePackage([borrowed, fact('threat', 'Careful — your knight on c6 is attacked.', FEN)]);
    expect(threatPkg.kept.map((f) => f.kind)).not.toContain('borrowed');
    const tacticPkg = buildVoicePackage([borrowed, fact('tactic', "There's a fork here for you — have a look.", FEN)]);
    expect(tacticPkg.kept.map((f) => f.kind)).not.toContain('borrowed');
  });

  it('still speaks it on a quiet turn — no event, only the routine plan', () => {
    // The borrowed tier carries whole turns the look-ahead cannot reach. That
    // is most of its value and all of its reason to exist — so a quiet position
    // with no detected tactic/threat still hears the corpus (no 08-15 regression).
    const pkg = buildVoicePackage([borrowed, fact('plan', 'Both sides want the d5 square.', FEN)]);
    expect(pkg.kept.map((f) => f.kind)).toContain('borrowed');
  });

  it('a plan REFUSED by grading does not silence it', () => {
    // Otherwise one dropped sentence turns into a silent turn. The check reads
    // what survived, not what was offered.
    const pkg = buildVoicePackage([
      borrowed,
      fact('plan', 'Doubled rooks on the open file decide it.', FEN), // false here
    ]);
    expect(pkg.kept.map((f) => f.kind), 'the turn went quiet').toEqual(['borrowed']);
  });

  it('never touches a note authored AT this board', () => {
    // The corpus note is always first (the 90/10 rule). This is about the tier
    // that BORROWS, not the tier that belongs.
    const pkg = buildVoicePackage([
      fact('note', 'The knight on c6 guards e5.', FEN),
      fact('plan', 'They want to win a pawn.', FEN),
    ]);
    expect(pkg.kept.map((f) => f.kind)).toEqual(['note', 'plan']);
  });
});

describe('the mistake callout leads, the coach\'s own sits behind it', () => {
  // David 2026-08-10: "Should be number two on the list, right behind the
  // mistake call out." A student hears their own move judged before they hear
  // anyone else's; the coach admitting its blunder lands second, not first.
  const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6';
  const at = (kind: VoiceFact['kind'], text: string): VoiceFact => ({ kind, text, fen: FEN });

  it('puts the student\'s mistake ahead of every other computed lane', () => {
    const pkg = buildVoicePackage([
      at('threat', 'Careful here.'),
      at('plan', 'They want to win a pawn.'),
      at('drawback', 'That took your last defender off d5.'),
      at('mistake', 'a3 was a mistake. Bg5 was the move.'),
    ]);
    expect(pkg.kept[0]?.kind).toBe('mistake');
  });

  it('puts the coach\'s own admission immediately behind it', () => {
    const pkg = buildVoicePackage([
      at('drawback', 'That took your last defender off d5.'),
      at('coachMistake', 'That was a blunder from me.'),
      at('mistake', 'a3 was a mistake.'),
    ]);
    expect(pkg.kept.map((f) => f.kind)).toEqual(['mistake', 'coachMistake', 'drawback']);
  });

  it('still leaves the corpus note first — that rule is untouched', () => {
    const pkg = buildVoicePackage([
      at('mistake', 'a3 was a mistake.'),
      at('note', 'The knight on c6 guards e5.'),
    ]);
    expect(pkg.kept[0]?.kind).toBe('note');
  });

  it('a callout makes the borrowed tier stand down, same as the plan', () => {
    const pkg = buildVoicePackage([
      at('borrowed', 'As a rule in these positions: trade when ahead.'),
      at('mistake', 'a3 was a mistake.'),
    ]);
    expect(pkg.kept.map((f) => f.kind)).toEqual(['mistake']);
  });
});

describe('the board is drawn from the package, not from the prose', () => {
  // David 2026-08-10: "It needs to be deterministic, handed in the package."
  //
  // Marks used to be coupled to speech by scanning the utterance for something
  // square-shaped — `said.includes('e5')`. That is a validator on text: it
  // passes on an accidental substring and fails on a square the sentence names
  // in words, and per G0 it is the shape to stop writing. The squares now come
  // in ON the fact, so a mark exists because its claim survived.
  const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('offers the squares of a fact that survived', () => {
    const pkg = buildVoicePackage([
      { kind: 'threat', text: 'Careful — that piece is under fire.', fen: FEN, squares: ['e5'] },
    ]);
    expect(pkg.kept.length).toBe(1);
    expect(markableSquares(pkg)).toEqual(['e5']);
  });

  it('marks a square the sentence never spells out', () => {
    // The exact case the substring check got wrong. "That piece is under fire"
    // names no square, and the mark is the whole point of saying it.
    const pkg = buildVoicePackage([
      { kind: 'threat', text: 'Careful — that piece is under fire.', fen: FEN, squares: ['c6'] },
    ]);
    expect(markableSquares(pkg)).toContain('c6');
  });

  it('takes the marks away with a claim it REFUSED', () => {
    // The coupling, in one line, for every lane at once: a dropped fact cannot
    // be drawn, because its squares left with it.
    const pkg = buildVoicePackage([
      { kind: 'threat', text: 'READING FACTS (GROUND TRUTH): e5', fen: FEN, squares: ['e5'] },
    ]);
    expect(pkg.kept.length, 'a directive was allowed into the package').toBe(0);
    expect(markableSquares(pkg)).toEqual([]);
  });

  it('never offers something that is not a square', () => {
    const pkg = buildVoicePackage([
      { kind: 'tactic', text: 'There is a loose piece here.', fen: FEN, squares: ['e5', 'z9', '', 'e5'] },
    ]);
    expect(markableSquares(pkg)).toEqual(['e5']);
  });

  it('is empty for a package whose facts carry no squares', () => {
    const pkg = buildVoicePackage([
      { kind: 'note', text: 'The bishop pin is the point of this opening.', fen: FEN },
    ]);
    expect(markableSquares(pkg)).toEqual([]);
  });
});

// ── ONE FACT, ONE UTTERANCE, ACROSS BOTH PACKAGES ─────────────────────────
// David's own game, 2026-08-11, read back from PostHog by session id. A turn
// speaks twice by design (instant + late) and every dedupe rule lived inside
// ONE assembly, so a fact both producers computed was spoken twice, seconds
// apart. Eleven times in a twenty-minute game. Each case below is a verbatim
// pair from that transcript.
describe('the late package does not repeat what the turn already said', () => {
  // Kings only: every claim here is squareless prose about plans, so board
  // grading has nothing to refuse and the dedupe is what is under test.
  const FEN = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

  it('drops a fact the instant package already spoke verbatim (00:29:16 → 00:29:25)', () => {
    const said = 'They want to walk the rook round to d5, by way of d8. You want to walk the bishop round to d5, by way of e4.';
    const pkg = buildVoicePackage([{ kind: 'plan', text: said, fen: FEN }], said);
    expect(pkg.spoken).toBe('');
    expect(pkg.dropped[0]?.reason).toBe('already said this turn');
  });

  it('keeps the NEW half and drops the repeated half (00:32:14 → 00:32:32)', () => {
    // The late fact bolts one new sentence onto one already spoken. Dropping
    // the whole fact would lose the new half; keeping it repeats the old one.
    const instant = 'They want to walk the bishop round to e5, by way of c7, pull the pawns away from your king and prise open the h-file.';
    const late = `That let them land a skewer, swing pieces toward your king and trade off the bishop. ${instant}`;
    const pkg = buildVoicePackage([{ kind: 'drawback', text: late, fen: FEN }], instant);
    expect(pkg.spoken).toBe('That let them land a skewer, swing pieces toward your king and trade off the bishop.');
  });

  it('drops the event line without swallowing the teaching behind it (00:16:27 → 00:16:38)', () => {
    const teaching = "The d-file is half-open for you — that's where a rook wants to be.";
    const pkg = buildVoicePackage(
      [{ kind: 'observation', text: teaching, fen: FEN }],
      `That takes your pawn. ${teaching}`,
    );
    expect(pkg.spoken).toBe('');
  });

  it('a fact the turn has NOT said is untouched', () => {
    const pkg = buildVoicePackage(
      [{ kind: 'plan', text: 'You want to prise open the c-file.', fen: FEN }],
      'That takes your pawn. The d-file is half-open for you.',
    );
    expect(pkg.spoken).toBe('You want to prise open the c-file.');
  });

  it('with nothing said yet, behaves exactly as before', () => {
    const pkg = buildVoicePackage([{ kind: 'plan', text: 'You want to win a pawn.', fen: FEN }]);
    expect(pkg.spoken).toBe('You want to win a pawn.');
  });

  it("a refused fact takes its marks with it", () => {
    const said = 'You want to prise open the c-file.';
    const pkg = buildVoicePackage(
      [{ kind: 'plan', text: said, fen: FEN, squares: ['c4'] }],
      said,
    );
    expect(markableSquares(pkg)).toEqual([]);
  });
});
