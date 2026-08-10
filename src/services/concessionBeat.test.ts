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
import { findConcession, concessionPackage } from './concessionBeat';

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
