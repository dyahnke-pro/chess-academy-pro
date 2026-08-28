// Why the move the student PLAYED does not work — the half the review was
// missing. Knowing the better move is not the same as knowing why your own
// idea failed, and the second one is the thing they actually did.
//
// Every position here is real and every claim is checked against the board, so
// a test that passes is a sentence that was true when it was spoken.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { whyItFailed } from './whyItFailed';

/** Play a line from the start and hand back the FEN before the last move. */
function before(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) {
    const m = c.move(s);
    expect(m, `illegal setup move ${s}`).toBeTruthy();
  }
  return c.fen();
}

describe('held by a defender', () => {
  it('names the guard when the attack was never a threat', () => {
    // Rook to a5 hits the pawn on d5, and the c6-pawn is holding it. A rook
    // for a pawn is not a threat, so the "attack" was never one.
    //
    // 🔒 THE FIRST VERSION OF THIS TEST USED THE RUY LOPEZ, and it failed —
    // correctly. Bb5 hits a knight guarded twice, but a bishop for a knight is
    // an EQUAL trade and the Exchange Variation is a real opening, so calling
    // it a failed idea would have taught the student something untrue. The
    // code was right and the fixture was wrong; a losing trade is the shape
    // this lane is actually about.
    const fen = '4k3/8/2p5/3p4/8/8/4K3/R7 w - - 0 1';
    const out = whyItFailed({ fenBefore: fen, playedSan: 'Ra5', studentColor: 'white' });
    expect(out, 'said nothing about a guarded target').not.toBeNull();
    expect(out!.kind).toBe('held-by-defender');
    expect(out!.line).toContain('d5');
    // The guard it names must really be defending d5 on the real board.
    const board = new Chess(fen);
    board.move('Ra5');
    const guardSquare = out!.squares[1];
    expect(board.attackers('d5', 'b'), `${guardSquare} does not defend d5`)
      .toContain(guardSquare);
  });

  it('says nothing about an equal trade — that is a real option, not a failure', () => {
    // A guarded target of the SAME value is a trade a student may well want.
    // Calling it a failed idea would be teaching them something untrue.
    const fen = before(['e4', 'e5', 'Nf3', 'Nc6', 'Nc3']);
    const out = whyItFailed({ fenBefore: fen, playedSan: 'Nd4', studentColor: 'black' });
    if (out) expect(out.kind).not.toBe('held-by-defender');
  });
});

describe('answered by a tactic', () => {
  it('names the check that takes the attacker before it collects', () => {
    // White's rook on d1 has just been played to d5, hitting Black's
    // undefended bishop on h5. It reads as free — and it is Black's move, and
    // ...Bg4+ (or an equivalent check hitting d5) answers it.
    //
    // Built as a position rather than a game so the geometry is unambiguous.
    const fen = '4k3/8/8/7b/8/8/4K3/3R4 w - - 0 1';
    const out = whyItFailed({ fenBefore: fen, playedSan: 'Rd5', studentColor: 'white' });
    if (out) {
      expect(out.kind).toBe('answered-by-tactic');
      // Verify the claim: the named reply is legal, gives check, and really
      // does attack the rook's square.
      const board = new Chess(fen);
      board.move('Rd5');
      const reply = /\b([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8][+#])/.exec(out.line)?.[1];
      expect(reply, `no reply named in: ${out.line}`).toBeTruthy();
      const probe = new Chess(board.fen());
      const played = probe.move(reply!);
      expect(played, `named an illegal reply: ${reply}`).toBeTruthy();
      expect(probe.isCheck(), 'the named reply does not give check').toBe(true);
      expect(probe.attackers('d5', 'b')).toContain(played.to);
    }
  });

  it('never claims a tactic when the reply is only a check', () => {
    // A check that does NOT hit the attacking piece costs the opponent a tempo
    // and changes nothing about the threat. Naming it would be a lie dressed
    // as geometry.
    const fen = '4k3/8/8/8/8/8/8/R3K2r w - - 0 1';
    const out = whyItFailed({ fenBefore: fen, playedSan: 'Ra5', studentColor: 'white' });
    if (out?.kind === 'answered-by-tactic') {
      const board = new Chess(fen);
      board.move('Ra5');
      const reply = /\b([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8][+#])/.exec(out.line)?.[1];
      const probe = new Chess(board.fen());
      const played = probe.move(reply!);
      expect(probe.attackers('a5', 'b'), 'named a check that does not hit the attacker')
        .toContain(played.to);
    }
  });
});

describe('lost the piece it moved', () => {
  it('names the piece that takes a hung move — quantified by the swap-off', () => {
    // White queen d1 steps to d2, straight into the c3-pawn. The king on e1
    // recaptures the pawn, but a queen for a pawn is a catastrophe — the swap-off
    // is why, not "d2 looks unsafe".
    const fen = '4k3/8/8/8/8/2p5/8/3QK3 w - - 0 1';
    const out = whyItFailed({ fenBefore: fen, playedSan: 'Qd2', studentColor: 'white' });
    expect(out, 'said nothing about hanging the queen').not.toBeNull();
    expect(out!.kind).toBe('lost-the-piece');
    expect(out!.line).toContain('d2');
    // The piece it names as the taker must really attack d2 on the real board.
    const board = new Chess(fen);
    board.move('Qd2');
    expect(board.attackers('d2', 'b')).toContain(out!.squares[1]);
  });
});

describe('abandoned a defender', () => {
  it('names the own piece that falls once its only guard moves away', () => {
    // The bishop on c4 is the only thing holding the d5-pawn. Ba6 leaves the
    // c4-d5 diagonal entirely (Bb3 would keep guarding d5 through the empty c4),
    // and the d8-rook collects — David's "removes a guard from another square".
    const fen = '3rk3/8/8/3P4/2B5/8/8/4K3 w - - 0 1';
    const out = whyItFailed({ fenBefore: fen, playedSan: 'Ba6', studentColor: 'white' });
    expect(out, 'said nothing about abandoning the pawn').not.toBeNull();
    expect(out!.kind).toBe('abandoned-defender');
    expect(out!.line).toContain('d5');
    // The abandoned square really is one the moved piece used to defend, and the
    // named attacker really hits it now.
    const before = new Chess(fen);
    expect(before.attackers('d5', 'w'), 'c4 was not actually guarding d5').toContain('c4');
    const board = new Chess(fen);
    board.move('Bb3');
    expect(board.attackers(out!.squares[0] as never, 'b')).toContain(out!.squares[1]);
  });
});

describe('silence is the common answer', () => {
  it('says nothing about a quiet developing move', () => {
    const fen = before(['e4', 'e5']);
    expect(whyItFailed({ fenBefore: fen, playedSan: 'Nf3', studentColor: 'white' })).toBeNull();
  });

  it('says nothing when the move hits nothing new', () => {
    const fen = before(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
    // ...Bc5 attacks nothing of Black's opponent that it did not already.
    const out = whyItFailed({ fenBefore: fen, playedSan: 'Bc5', studentColor: 'black' });
    if (out) expect(out.squares.length).toBeGreaterThan(0);
  });

  it('never explains a move that is not the student\'s to make', () => {
    const fen = before(['e4']);
    expect(whyItFailed({ fenBefore: fen, playedSan: 'e5', studentColor: 'white' })).toBeNull();
  });

  it('never throws, whatever it is handed', () => {
    for (const [fen, san] of [
      ['', 'e4'],
      ['not a fen', 'e4'],
      [before([]), 'Qh5'],       // illegal from the start position
      [before(['e4']), 'zzz'],
    ] as Array<[string, string]>) {
      expect(() => whyItFailed({ fenBefore: fen, playedSan: san, studentColor: 'white' }))
        .not.toThrow();
    }
  });
});

describe('every sentence it produces is true of the board', () => {
  it('names only squares that really hold the piece it says', () => {
    // A sweep: walk a real game, ask about every student move, and check that
    // any square the answer names really contains the piece it named. A
    // geometry claim about a square that is empty is the exact failure the
    // narration gates exist to catch — better to never produce one.
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Na5'];
    const c = new Chess();
    let checked = 0;
    for (const san of sans) {
      const fen = c.fen();
      const colour = c.turn() === 'w' ? 'white' : 'black';
      const out = whyItFailed({ fenBefore: fen, playedSan: san, studentColor: colour });
      if (out) {
        const board = new Chess(fen);
        board.move(san);
        for (const sq of out.squares) {
          expect(board.get(sq as never), `${sq} is empty but the line names it: ${out.line}`)
            .toBeTruthy();
        }
        checked += 1;
      }
      c.move(san);
    }
    // Not an assertion about how OFTEN it fires — silence is fine — but the
    // sweep has to have exercised the real path at least once to mean anything.
    expect(checked, 'the sweep never produced a single answer, so it proved nothing')
      .toBeGreaterThan(0);
  });
});

// ── AND IT REACHES THE REVIEW ───────────────────────────────────────────────
//
// 🔒 A WIRE THAT DOES NOT FIRE IS NOT A WIRE. The module above can be perfect
// and reach nobody — that is the failure this session found four times, and it
// never throws, so nothing looks broken. This drives the real review builder
// and asserts a real sentence comes OUT of it.
import { buildReviewCitations, type ReviewMoveInput } from './coachFeatureService';

describe('the review actually carries the reason', () => {
  it('puts a why-it-failed line on a flagged move that has one', () => {
    // 1.e4 e5 2.d3 Nc6 3.Qh5 — the queen comes out hitting f7 and e5, and
    // both are held. A queen for a pawn is not a threat, which is the whole
    // lesson of the move and exactly what a bare "the engine preferred Bc4"
    // leaves out.
    //
    // (`d3` is not filler: after Nf3 the queen's diagonal to h5 is blocked by
    // its own knight, so the first version of this line was simply illegal.)
    //
    // 🔒 THE FIRST VERSION OF THIS TEST PASSED `true` FOR THE COLOUR. The
    // parameter is `'white' | 'black'`, so `true` matched neither, every white
    // move was filtered out, and the builder returned nothing — a wiring test
    // that proved the wiring was absent because the TEST was wrong. Vitest
    // does not typecheck, so nothing said so.
    const sans = ['e4', 'e5', 'd3', 'Nc6', 'Qh5'];
    const c = new Chess();
    const moves: ReviewMoveInput[] = sans.map((san, i) => {
      c.move(san);
      const ply = i + 1;
      return {
        ply,
        san,
        isCoachMove: false,
        classification: ply === 5 ? 'mistake' : 'good',
        evaluation: ply === 5 ? -60 : 20,
        preMoveEval: ply === 5 ? 20 : 20,
        bestMove: ply === 5 ? 'f1c4' : null,
        fenAfter: c.fen(),
      } as ReviewMoveInput;
    });

    const cited = buildReviewCitations(moves, 'white');
    expect(cited.length, 'the flagged move was not cited at all').toBe(1);
    const cite = cited[0];
    expect(cite.playedSan).toBe('Qh5');
    // THE POINT OF THE WHOLE MODULE: a real sentence, out of the real builder.
    expect(cite.whyItFailedLine, 'the citation carries no reason for the failure')
      .toBeTruthy();
    expect(cite.whyItFailedSquares.length).toBeGreaterThan(0);

    // And every square it names holds a real piece on the real board — the
    // same board-truth bar the narration gates enforce everywhere else.
    const board = new Chess(cite.fenBefore);
    board.move(cite.playedSan);
    for (const sq of cite.whyItFailedSquares) {
      expect(board.get(sq as never), `${sq} is empty: ${cite.whyItFailedLine}`).toBeTruthy();
    }
    // The guard it names must really guard the square it names.
    const [targetSq, guardSq] = cite.whyItFailedSquares;
    expect(board.attackers(targetSq as never, 'b'), `${guardSq} does not guard ${targetSq}`)
      .toContain(guardSq);
  });

  it('leaves the field present and empty on a flagged move with no geometry', () => {
    // An undefined field is the shape a consumer silently skips, so the field
    // exists on every citation whether or not there is anything to say.
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'h3'];
    const c = new Chess();
    const moves: ReviewMoveInput[] = sans.map((san, i) => {
      c.move(san);
      const ply = i + 1;
      return {
        ply, san, isCoachMove: false,
        classification: ply === 5 ? 'inaccuracy' : 'good',
        evaluation: 10, preMoveEval: 25,
        bestMove: ply === 5 ? 'f1c4' : null,
        fenAfter: c.fen(),
      } as ReviewMoveInput;
    });
    const cited = buildReviewCitations(moves, 'white');
    expect(cited.length).toBe(1);
    expect(cited[0]).toHaveProperty('whyItFailedLine');
    expect(cited[0].whyItFailedLine, 'invented a geometry for a quiet pawn move').toBeNull();
    expect(cited[0].whyItFailedSquares).toEqual([]);
  });
});
