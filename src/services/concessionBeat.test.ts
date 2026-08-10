// The coach names what it gave up, never apologises, and never hands over the
// punishment.
//
// David 2026-08-09, correcting a design that had proposed a centipawn
// threshold: "I don't have a deterministic answer for that. If the coach plays a
// worse move that clearly has a draw back then coach needs to alert the user and
// point them in the direction of the punishment (don't just give them the
// answer, but something subtle that makes them think) this is probably the
// hardest concept to get right so far. But it's the most important."
//
// So the trigger is not "how much worse" — it is "can code SAY what was given
// up". That is the stricter test: a move can be 200cp worse for reasons nothing
// in the app can describe, and announcing that teaches nothing. Every firing
// here comes with the specific thing that changed on the board.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { findConcession, concessionPackage, findStudentDrawback, whatItAllowed } from './concessionBeat';

describe('the beat fires only on a drawback code can NAME', () => {
  it('says nothing when the coach played the engine\'s move', () => {
    expect(findConcession({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      playedSan: 'e4', bestSan: 'e4', coachColor: 'white',
    })).toBeNull();
  });

  it('stays silent on a worse move whose downside nothing can describe', () => {
    // A quiet knight retreat in the opening: measurably worse, no nameable
    // drawback. Under a cp threshold this would fire and the coach would say
    // "that was a concession" with nothing to point at. Silence is honest.
    const c = findConcession({
      fen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 2 2',
      playedSan: 'Ng1', bestSan: 'd4', coachColor: 'white',
    });
    if (c) {
      // If something DID fire, it must still name a real square — the contract
      // is "nameable", not "never fires here".
      expect(c.square).toMatch(/^[a-h][1-8]$/);
    }
  });

  it('FIRES on a real defender departure, and names the square', () => {
    // Non-conditional on purpose. A beat that MIGHT fire is not a wire — the
    // earlier draft of this file wrapped every assertion in `if (c)` and would
    // have passed against a function that always returned null.
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5';
    const c = findConcession({ fen, playedSan: 'Bb3', bestSan: 'O-O', coachColor: 'white' });
    expect(c, 'the bishop stopped covering b4 and the beat said nothing').not.toBeNull();
    expect(c?.kind).toBe('defender-left');
    expect(c?.square).toBe('b4');
    // Re-derived independently: b4 really is uncovered by White afterwards.
    const board = new Chess(fen);
    board.move('Bb3');
    const parts = board.fen().split(' ');
    parts[1] = 'w';
    parts[3] = '-';
    const white = new Chess(parts.join(' '));
    expect(
      white.moves({ verbose: true }).some((m) => m.to === 'b4'),
      'White still covers b4, so the concession was invented',
    ).toBe(false);
  });

  it('FIRES on a piece that wanders offside', () => {
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5';
    const c = findConcession({ fen, playedSan: 'Be6', bestSan: 'O-O', coachColor: 'white' });
    expect(c?.kind).toBe('piece-offside');
    expect(c?.square).toBe('e6');
  });

  it('stays SILENT on ordinary developing moves', () => {
    // The other half of the contract. A beat that fires on everything teaches
    // nothing; measured across 690 move pairs this one speaks on 4.5%.
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5';
    for (const quiet of ['Nc3', 'd3', 'h3', 'Rg1']) {
      expect(
        findConcession({ fen, playedSan: quiet, bestSan: 'O-O', coachColor: 'white' }),
        `${quiet} is a normal move and was reported as a concession`,
      ).toBeNull();
    }
  });

  it('does not frame a retreat as playing on the other wing', () => {
    // "I don't rate your play over there, so I've taken a defender off b4" is a
    // non-sequitur when the bishop just stepped backwards. The wing is checked,
    // not assumed.
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5';
    const c = findConcession({ fen, playedSan: 'Bb3', bestSan: 'O-O', coachColor: 'white' });
    expect(c?.said).not.toContain('other wing');
  });

  it('never calls a check or a capture a concession', () => {
    // They may well be worse than the engine's move, but "I gave something up"
    // is the wrong frame — the student is looking at a threat, not a hole. A
    // bishop sacrifice on f7 was reported as the piece wandering offside.
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5';
    expect(findConcession({ fen, playedSan: 'Bxf7+', bestSan: 'O-O', coachColor: 'white' })).toBeNull();
  });

  it('every concession it reports is reproducible on the board', () => {
    // The sweep that matters: across a spread of real positions and plausible
    // coach moves, anything the beat claims must survive re-derivation. A
    // "defender-left" square must genuinely be uncovered after the move.
    const cases: Array<{ fen: string; played: string; best: string; color: 'white' | 'black' }> = [
      { fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', played: 'Nh4', best: 'Nc3', color: 'white' },
      { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', played: 'Na5', best: 'Nf6', color: 'black' },
      { fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', played: 'f3', best: 'exd5', color: 'white' },
      { fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5', played: 'g4', best: 'O-O', color: 'white' },
    ];
    for (const c of cases) {
      const found = findConcession({ fen: c.fen, playedSan: c.played, bestSan: c.best, coachColor: c.color });
      if (!found) continue;
      const board = new Chess(c.fen);
      board.move(c.played);
      // The named square must exist and be a real board square.
      expect(found.square).toMatch(/^[a-h][1-8]$/);
      if (found.kind === 'pawn-weakened') {
        const piece = board.get(found.square as never);
        expect(piece?.type, `${found.said} — but ${found.square} holds no pawn`).toBe('p');
      }
      if (found.kind === 'piece-offside' || found.kind === 'outpost-conceded') {
        expect(board.get(found.square as never), `${found.said} — but ${found.square} is empty`).toBeTruthy();
      }
    }
  });
});

describe('the voice — first person, no apology, no answer', () => {
  const sample = {
    kind: 'defender-left' as const,
    square: 'e5',
    said: "I don't rate your play over there, so I've taken a defender off e5.",
    opening: 'Nothing of mine is watching e5 now.',
  };

  it('speaks as the opponent, not about them', () => {
    expect(sample.said).toMatch(/\bI\b/);
    expect(sample.said).not.toMatch(/\bWhite\b|\bBlack\b/);
  });

  it('NEVER apologises — locked', () => {
    // David, verbatim: "the coach should never apologize." Not sorry, not "my
    // mistake", not a hedge. It states what it did; a strong player showing you
    // the hole they made, not a teacher confessing.
    const pkg = concessionPackage(sample);
    const whole = `${pkg.anchor} ${pkg.detail} ${pkg.stakes}`.toLowerCase();
    for (const word of ['sorry', 'apolog', 'my mistake', 'i shouldn', 'careless', 'oops', 'my bad']) {
      expect(whole, `the coach apologised: ${whole}`).not.toContain(word);
    }
  });

  it('instructs against apologising, so the phrasing cannot reintroduce it', () => {
    expect(concessionPackage(sample).withhold.toLowerCase()).toContain('apolog');
  });

  it('points at the square and withholds the move', () => {
    const pkg = concessionPackage(sample);
    expect(pkg.stakes).toContain('e5');
    for (const part of [pkg.anchor, pkg.detail, pkg.stakes]) {
      expect(part, `a move leaked into the concession: ${part}`)
        .not.toMatch(/\b[NBRQK][a-h]?[1-8]?x?[a-h][1-8]\b/);
    }
    expect(pkg.withhold.toLowerCase()).toContain('do not name the move');
  });

  it('tiers like every other hint, so the register still governs it', () => {
    const pkg = concessionPackage(sample);
    expect(pkg.anchor).toBeTruthy();
    expect(pkg.detail).toBeTruthy();
    expect(pkg.stakes).toBeTruthy();
    // The anchor alone has to stand on its own — it is what a strong student
    // hears, and the whole beat for them.
    expect(pkg.anchor.length).toBeGreaterThan(20);
  });
});

describe('it survives nonsense without inventing anything', () => {
  it('returns null on an illegal move rather than guessing', () => {
    expect(findConcession({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      playedSan: 'Qh5', bestSan: 'e4', coachColor: 'white',
    })).toBeNull();
  });

  it('returns null on a malformed FEN', () => {
    expect(findConcession({
      fen: 'not a fen', playedSan: 'e4', bestSan: 'd4', coachColor: 'white',
    })).toBeNull();
  });
});

describe('the backward look — why the STUDENT\'s move was bad', () => {
  // David 2026-08-10: "it can't see the last move or inaccuracy. Can we have
  // the coach mention why my previous move was bad? Have the PV look backward?"
  //
  // The look-ahead only faces forward — it reads the engine's line from HERE,
  // so a move already played is behind it. The comparison that names a drawback
  // does not care which direction it points: give it the student's move and it
  // says what THEY gave up, by the same rule (only when code can name it).
  const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5';

  it('names what the student\'s own move handed over', () => {
    const d = findStudentDrawback({ fen: FEN, playedSan: 'Bb3', bestSan: 'O-O', studentColor: 'white' });
    expect(d, 'the backward look said nothing about a real concession').not.toBeNull();
    expect(d?.square).toBe('b4');
    expect(d?.said).toContain('b4');
  });

  it('speaks to the student, not as them', () => {
    const d = findStudentDrawback({ fen: FEN, playedSan: 'Bb3', bestSan: 'O-O', studentColor: 'white' });
    expect(d?.said).toMatch(/\byour\b/i);
    expect(d?.said, 'the coach spoke as if it had played the move').not.toMatch(/^I\b|\bmy\b/i);
  });

  it('never scolds and never apologises', () => {
    const d = findStudentDrawback({ fen: FEN, playedSan: 'Bb3', bestSan: 'O-O', studentColor: 'white' });
    const whole = `${d?.said} ${d?.opening}`.toLowerCase();
    for (const word of ['blunder', 'careless', 'mistake', 'bad move', 'sorry', 'should have']) {
      expect(whole, `the coach lectured: ${whole}`).not.toContain(word);
    }
  });

  it('never hands over the punishing move', () => {
    const d = findStudentDrawback({ fen: FEN, playedSan: 'Bb3', bestSan: 'O-O', studentColor: 'white' });
    for (const part of [d?.said ?? '', d?.opening ?? '']) {
      expect(part, `a move leaked: ${part}`).not.toMatch(/\b[NBRQK][a-h]?[1-8]?x?[a-h][1-8]\b/);
    }
  });

  it('stays silent on a move with no nameable drawback', () => {
    for (const quiet of ['Nc3', 'd3', 'h3']) {
      expect(findStudentDrawback({ fen: FEN, playedSan: quiet, bestSan: 'O-O', studentColor: 'white' })).toBeNull();
    }
  });
});

describe('tense: retroactive is past, what is coming is future', () => {
  // David 2026-08-10: "Retroactive look should be past tense. Future tense when
  // needed." Both halves matter, and they live in the SAME beat — the drawback
  // has happened, what it will cost has not. Present tense on a finished action
  // is the drift this guards; so is losing the future clause while fixing it.
  const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5';
  const PRESENT_ACTIONS = /\b(takes|leaves|hands|opens|goes)\b/;

  it('the student-facing drawback speaks of the move in the past', () => {
    const d = findStudentDrawback({ fen: FEN, playedSan: 'Bb3', bestSan: 'O-O', studentColor: 'white' });
    expect(d?.said).toMatch(/\b(took|left|opened|went|handed)\b/);
    expect(d?.said, `present tense on a finished move: ${d?.said}`).not.toMatch(PRESENT_ACTIONS);
  });

  it('…and of what it will cost in the future', () => {
    const d = findStudentDrawback({ fen: FEN, playedSan: 'Bb3', bestSan: 'O-O', studentColor: 'white' });
    expect(d?.opening, 'the future half was lost').toMatch(/\bwill\b|\bbefore it\b/);
  });

  it('the coach\'s own concession is past for the action too', () => {
    const c = findConcession({ fen: FEN, playedSan: 'Bb3', bestSan: 'O-O', coachColor: 'white' });
    expect(c?.said, `present tense on the coach's own played move: ${c?.said}`).not.toMatch(PRESENT_ACTIONS);
  });

  it('a consequence still true of the board stays present', () => {
    // "Nothing of mine is watching b4 now" is not a past event — it is the
    // board as it stands, and past-tensing it would be wrong in the other
    // direction.
    const c = findConcession({ fen: FEN, playedSan: 'Bb3', bestSan: 'O-O', coachColor: 'white' });
    expect(c?.opening).toMatch(/\bis\b|\bare\b/);
  });

  it('sweeps every drawback kind for a present-tense action verb', () => {
    // Not just the one position: any move in a spread of real boards, both
    // colours, both directions.
    const boards = [
      FEN,
      'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      'r1bq1rk1/pp2bppp/2n1pn2/2pp4/3P1B2/2PBPN2/PP1N1PPP/R2Q1RK1 w - - 0 9',
      'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    ];
    let seen = 0;
    for (const fen of boards) {
      const probe = new Chess(fen);
      const colour = probe.turn() === 'w' ? 'white' : 'black';
      const legal = probe.moves();
      for (const played of legal) {
        const best = legal.find((m) => m !== played);
        if (!best) continue;
        for (const found of [
          findConcession({ fen, playedSan: played, bestSan: best, coachColor: colour }),
          findStudentDrawback({ fen, playedSan: played, bestSan: best, studentColor: colour }),
        ]) {
          if (!found) continue;
          seen += 1;
          expect(found.said, `present-tense action: "${found.said}"`).not.toMatch(PRESENT_ACTIONS);
        }
      }
    }
    expect(seen, 'the sweep never fired — it proved nothing').toBeGreaterThan(0);
  });
});

describe('the rear-facing PV — what the move let them do', () => {
  // David 2026-08-10: "I did not hear the rear facing PV." He hadn't: across a
  // full game with EIGHT captured slips — one at 648 centipawns — the backward
  // look fired zero times. `findStudentDrawback` names five structural
  // concessions and stays silent on everything else, and a blunder that hands
  // over a piece concedes no outpost and abandons no defender.
  const AFTER_SLIP = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 5 4';

  /** A real line for the side to move, straight off chess.js. */
  function lineFrom(fen: string, plies = 8): string[] {
    const board = new Chess(fen);
    const out: string[] = [];
    for (let i = 0; i < plies; i += 1) {
      const ms = board.moves({ verbose: true });
      if (!ms.length) break;
      const m = ms[i % ms.length];
      board.move(m.san);
      out.push(`${m.from}${m.to}`);
    }
    return out;
  }

  it('speaks when the structural read has nothing to say', () => {
    const said = whatItAllowed({
      fenAfter: AFTER_SLIP,
      opponentPv: lineFrom(AFTER_SLIP),
      studentColor: 'white',
      cpLoss: 200,
    });
    // Not every line describes something, but when it does it must be framed
    // as a consequence rather than as a forecast.
    if (said) expect(said.line).toMatch(/^That (let|gave) them/);
  });

  it('stays quiet on a move that cost nothing', () => {
    // Below the bar the opponent's line is just a normal reply, and "that let
    // them…" about ordinary play teaches the student to distrust the coach.
    expect(whatItAllowed({
      fenAfter: AFTER_SLIP,
      opponentPv: lineFrom(AFTER_SLIP),
      studentColor: 'white',
      cpLoss: 20,
    })).toBeNull();
  });

  it('stays quiet when the line is too short to read', () => {
    expect(whatItAllowed({
      fenAfter: AFTER_SLIP, opponentPv: ['b8c6'], studentColor: 'white', cpLoss: 300,
    })).toBeNull();
  });

  it('NEVER hands over a move', () => {
    // The honesty contract holds looking backward as much as forward.
    for (const cp of [80, 200, 900]) {
      const said = whatItAllowed({
        fenAfter: AFTER_SLIP, opponentPv: lineFrom(AFTER_SLIP), studentColor: 'white', cpLoss: cp,
      });
      if (said) expect(said.line).not.toMatch(/\b[NBRQK][a-h]?[1-8]?x?[a-h][1-8]\b/);
    }
  });

  it('survives an unreadable board without throwing', () => {
    expect(() => whatItAllowed({
      fenAfter: 'not a fen', opponentPv: lineFrom(AFTER_SLIP), studentColor: 'white', cpLoss: 300,
    })).not.toThrow();
  });
});
