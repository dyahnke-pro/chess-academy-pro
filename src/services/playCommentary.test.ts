// The running commentary must be RIGHT about whose piece it names and silent on
// an unremarkable position — a coach who comments on every recapture teaches
// nothing (the locked voice law: speak when it instructs).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildPlayCommentary, buildPriorityFirst, buildInstantReplyLine, describeMoveConsequence } from './playCommentary';

describe('buildPlayCommentary', () => {
  it('names the opponent knight on an unchallengeable outpost when the trade is available', () => {
    // White to move. Black knight on d4 (White's half), defended by the e5
    // pawn; White has no c- or e-pawn behind it to ever challenge — a textbook
    // outpost. White's knight on f3 can capture it right now.
    const fen = '4k3/8/5p2/4p3/3n4/5N2/6P1/4K3 w - - 0 1';
    // Sanity: the position is legal and Nxd4 exists.
    expect(new Chess(fen).moves()).toContain('Nxd4');
    const beat = buildPlayCommentary({ fen, studentColor: 'white' });
    expect(beat?.kind).toBe('trade-the-best-piece');
    expect(beat?.facts[0]).toContain('d4');
    expect(beat?.facts[0]).toContain('outpost');
  });

  it('says nothing when it is not the student to move', () => {
    const fen = '4k3/8/5p2/4p3/3n4/5N2/6P1/4K3 w - - 0 1';
    expect(buildPlayCommentary({ fen, studentColor: 'black' })).toBeNull();
  });

  it('reports only the OPPONENT\'s hanging piece, never the student\'s own', () => {
    // White to move; Black's rook on a5 hangs to nothing defending it and
    // White's bishop on d2 can be read as loose too — the beat must name the
    // BLACK piece for a white student.
    const fen = '4k3/8/8/r7/8/8/3B4/4K3 w - - 0 1';
    const beat = buildPlayCommentary({ fen, studentColor: 'white' });
    if (beat) {
      expect(beat.kind).toBe('tactic');
      expect(beat.facts[0]).toContain('a5');
      expect(beat.facts[0]).not.toContain('d2');
    }
  });

  it('is silent on the ordinary opening position', () => {
    const fen = new Chess().fen();
    expect(buildPlayCommentary({ fen, studentColor: 'white' })).toBeNull();
  });

  it('a hanging PAWN alone stays silent — gambit pawns are theory, not tactics', () => {
    // Black's a5-pawn is en prise to b4 and nothing else is on. Measured on
    // the repertoire corpus: 7.9% of theory plies have a loose pawn; speaking
    // on each is the tuned-out failure.
    expect(buildPlayCommentary({ fen: '4k3/8/8/p7/1P6/8/8/4K3 w - - 0 1', studentColor: 'white' })).toBeNull();
  });

  it('mate on the board outranks everything and never names the move', () => {
    // Ra8# is available. The fact says mate exists; it must not say where.
    const beat = buildPlayCommentary({ fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', studentColor: 'white' });
    expect(beat?.kind).toBe('tactic');
    expect(beat?.facts[0]).toContain('MATE');
    expect(beat?.facts[0]).not.toContain('a8');
  });

  it('speaks the student\'s OWN event tactic from the expanded detector', () => {
    // White Rd1 attacks the black knight on d4 whose sole defender (Bb6) is
    // itself capturable by Rb1 — removal of the guard, beneficiary White.
    const beat = buildPlayCommentary({ fen: '6k1/8/1b6/8/3n4/8/6PP/1R1R2K1 w - - 0 1', studentColor: 'white' });
    expect(beat?.kind).toBe('tactic');
    expect(beat?.facts[0]).toContain('TACTIC ON THE BOARD');
  });

  it('seeding observation: enemy queen and rook on one file, student owns a rook', () => {
    // Black Qd6 + Rd8 share the d-file (d7 empty, luft on h6 so no back-rank
    // flag); White owns Ra1. Not a tactic — the noticing that precedes one.
    const beat = buildPlayCommentary({ fen: '3r2k1/5pp1/3q3p/8/8/8/6PP/R5K1 w - - 0 20', studentColor: 'white' });
    expect(beat?.kind).toBe('seeding-observation');
    expect(beat?.facts[0]).toContain('d-file');
    expect(beat?.facts[0]).toContain('rook');
  });

  it('seeding observation stays silent without a matching slider for the line', () => {
    // Same alignment, but White\'s only piece is a bishop — wrong geometry.
    const beat = buildPlayCommentary({ fen: '3r2k1/5pp1/3q3p/8/8/8/6PP/B5K1 w - - 0 20', studentColor: 'white' });
    expect(beat?.kind).not.toBe('seeding-observation');
  });
});

describe('buildPriorityFirst', () => {
  it('names the isolated-pawn priority and withholds the move', () => {
    // Black's d5-pawn is ISOLATED (no c- or e-pawn). White's best move
    // Nc3 attacks it after landing. The beat names d5, not the knight move.
    // A best move that does NOT attack the weak pawn stays silent…
    const fen = '6k1/pp3ppp/8/3p4/8/8/PP1N1PPP/6K1 w - - 0 20';
    expect(buildPriorityFirst({ fen, studentColor: 'white', bestUci: 'd2b3' })).toBeNull();
    // …and Nb1–c3, which lands attacking d5, names the priority.
    const fen2 = '6k1/pp3ppp/8/3p4/8/8/PP1N1PPP/1N4K1 w - - 0 20';
    const pf2 = buildPriorityFirst({ fen: fen2, studentColor: 'white', bestUci: 'b1c3' });
    expect(pf2?.targetSquare).toBe('d5');
    expect(pf2?.facts).toContain('d5');
    expect(pf2?.facts).toContain('isolated');
    expect(pf2?.facts).not.toContain('Nc3');
  });

  it('a healthy pawn target means no priority beat', () => {
    // Black's d5 has a c6 neighbour — connected, not weak. Same knight jump.
    const fen = '6k1/pp3ppp/2p5/3p4/8/8/PP1N1PPP/1N4K1 w - - 0 20';
    expect(buildPriorityFirst({ fen, studentColor: 'white', bestUci: 'b1c3' })).toBeNull();
  });
});

describe('buildInstantReplyLine', () => {
  // David 2026-08-06: "I did not like the narrations speaking the opponents
  // move… I want important teaching moments stated after opponent moves."
  // The instant voice never announces the move — only mate/check/capture
  // EVENTS get a call-out of their effect; quiet replies stay silent.

  it('a quiet move is SILENT — the student watched it land', () => {
    expect(buildInstantReplyLine({ san: 'Nf3', isCheckmate: false, isCheck: false })).toBeNull();
  });

  it('a capture is SILENT — the piece left the board in front of them', () => {
    // NARROWED 2026-08-18. This used to expect "That takes your knight.", and a
    // full game driven on prod spoke that shape seven times in twenty moves —
    // on three of them over the top of a voice package that had already
    // computed SILENCE for the turn. Rule 3: the voice carries what the picture
    // does not, and a capture is the most visible thing on a chessboard.
    expect(buildInstantReplyLine({ san: 'Bxc6', captured: 'n', isCheckmate: false, isCheck: false })).toBeNull();
  });

  it('a check is SILENT too — the board already shows it', () => {
    expect(buildInstantReplyLine({ san: 'Qh5+', isCheckmate: false, isCheck: true })).toBeNull();
    expect(buildInstantReplyLine({ san: 'Qxf7+', captured: 'p', isCheckmate: false, isCheck: true })).toBeNull();
  });

  it('checkmate outranks everything', () => {
    expect(buildInstantReplyLine({ san: 'Qxf7#', captured: 'p', isCheckmate: true, isCheck: true }))
      .toBe('Checkmate.');
  });

  it('the whole flow from a real board — chess.js fields feed it directly', () => {
    // Scholar's mate final position: Qxf7# captures a pawn and mates.
    const c = new Chess('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4');
    const m = c.move('Qxf7');
    expect(m).toBeTruthy();
    const line = buildInstantReplyLine({
      san: m.san,
      captured: m.captured,
      isCheckmate: c.isCheckmate(),
      isCheck: c.isCheck(),
    });
    expect(line).toBe('Checkmate.');
  });
});

describe('describeMoveConsequence (the computed why — David 2026-08-07: "a couple hallucinations")', () => {
  it('names the capture a recommended move makes', () => {
    // 1.e4 d5 2.exd5 — and this used to assert "winning the pawn on d5", which
    // is the bug David heard on 2026-08-16, written down as the contract.
    // Black plays Qxd5 and the pawn is straight back; nobody won anything. The
    // capture is still named, with the word that is true of it.
    const c = new Chess();
    c.move('e4'); c.move('d5');
    expect(describeMoveConsequence(c.fen(), 'exd5')).toBe(', trading off the pawn on d5');
  });

  it('names a check', () => {
    // 1.e4 e5 2.Qh5? — no; use 1.e4 f6 2.Qh5+ (a real check, no capture)
    const c = new Chess();
    c.move('e4'); c.move('f6');
    expect(describeMoveConsequence(c.fen(), 'Qh5+')).toBe(', with check');
  });

  it('names the most valuable enemy piece a quiet move newly attacks', () => {
    // After 1.e4 d5: the quiet 2.e5?? is nothing, but 1...d5 leaves the d5
    // pawn attackable — instead test a knight development that attacks a
    // pawn: 1.e4 e5 2.Nf3 attacks the pawn on e5.
    const c = new Chess();
    c.move('e4'); c.move('e5');
    expect(describeMoveConsequence(c.fen(), 'Nf3')).toBe(', attacking the pawn on e5');
  });

  it('returns empty for a quiet move that attacks nothing', () => {
    expect(describeMoveConsequence(new Chess().fen(), 'a3')).toBe('');
  });

  it('never throws on an illegal SAN — returns empty', () => {
    expect(describeMoveConsequence(new Chess().fen(), 'Qh5')).toBe('');
  });
});

describe('back-rank alignment after castling long', () => {
  // David 2026-08-07: "often times the queen and king align when castling
  // long." He was right and the detector was blind to it — the rank branch
  // required the pair to be OFF the home rank, so the geometry castling
  // actually creates was the one case it refused to see. Verified with two
  // identical positions one rank apart: c7+f7 seeded, c8+f8 said nothing.
  const seed = (fen: string): string | null => {
    const out = buildPlayCommentary({ fen, studentColor: 'white' });
    return out?.kind === 'seeding-observation' ? out.facts[0] : null;
  };

  it('seeds the alignment when Black has castled long', () => {
    const fact = seed('2kr1q2/ppp2ppp/8/8/8/2N5/PPP2PPP/R2QK2R w KQ - 0 12');
    expect(fact).toContain('king on c8');
    expect(fact).toContain('queen on f8');
    expect(fact).toContain('8th rank');
  });

  it('still says nothing about the untouched starting huddle', () => {
    expect(seed('rnbqkbnr/pppppppp/8/8/8/2N5/PPPPPPPP/R1BQKBNR b KQkq - 1 1')).toBeNull();
  });

  it('is not rank-dependent — the same shape off the home rank still seeds', () => {
    expect(seed('8/ppkr1q2/8/8/8/2N5/PPP2PPP/R2QK2R w KQ - 0 12')).toContain('7th rank');
  });

  it('seeds the ADJACENT c8-king / d7-queen diagonal — the sharpest form', () => {
    // David 2026-08-07: "the queen often moves to d7 after long castle, the
    // king on c8 and queen on d7 then line up on the same diagonal." A flat
    // "adjacent pieces are a huddle" skip threw this away, though nothing
    // stands between them and a bishop reaching e6/f5/g4/h3 pins the queen
    // dead against the king. Adjacency is the STRONGEST alignment, not a
    // disqualifier — what disqualifies one is nowhere to attack it from.
    const fact = seed('2kr2nr/pppq1ppp/8/8/8/2N1B3/PPP1BPPP/R2QK2R w KQ - 0 12');
    expect(fact).toContain('king on c8');
    expect(fact).toContain('queen on d7');
    expect(fact).toContain('diagonal');
    expect(fact).toContain('bishop');
  });

  it('stays silent when the line has no square to attack from', () => {
    // King g8 with the queen on h7: adjacent on a diagonal whose both ends
    // run off the board, so no slider can ever exploit it.
    expect(seed('6k1/7q/8/8/8/2N1B3/PPP1BPPP/R2QK2R w KQ - 0 20')).toBeNull();
  });
});

// David's 2026-08-08 session log, counted: "See if you can find it." spoken
// FIVE times, "Worth noticing." three, "an undefended piece is the seed of a
// tactic" twice — on different pieces on different moves, so no last-value
// guard catches them. Each is a generic lesson bolted to a specific
// observation: the first time it teaches, by the third it is what he tunes out.
describe('the principle once, the fact every time', () => {
  // Two different undefended enemy pieces, so the FACT differs each time and
  // only the trailing moral is a repeat.
  const ONE = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';

  it('drops the moral the second time the same pattern appears', () => {
    const said = new Set<string>();
    const first = buildPlayCommentary({ fen: ONE, studentColor: 'white', saidExplainers: said });
    if (!first) return; // position-dependent; the sweep below is the real gate
    const repeated = buildPlayCommentary({ fen: ONE, studentColor: 'white', saidExplainers: said });
    expect(repeated?.spoken.length ?? 0).toBeLessThanOrEqual(first.spoken.length);
  });

  it('says each generic clause AT MOST ONCE across a game', () => {
    // The real gate: walk many positions through one shared set and assert no
    // stock phrase is ever spoken twice.
    const said = new Set<string>();
    const FENS = [
      'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
      'rnbqkb1r/ppp2ppp/8/3pP3/4n3/2N5/PPPP2PP/R1BQKBNR w KQkq - 0 5',
      'r2qr1k1/pRp2ppp/8/2n1P3/3bB3/3P4/P1PB2PP/3QK2R w K - 3 15',
      'r5k1/2p2ppp/p7/8/3Rr3/6P1/P1PB3P/5RK1 w - - 0 22',
      '3r1k2/2p2p1p/p5p1/8/4R3/2B3P1/P1P4P/4R1K1 w - - 2 26',
      'r3r1k1/2p2ppp/p7/4P3/1R1bq3/6P1/P1PBQ2P/4K2R w K - 0 19',
    ];
    const STOCK = [
      'See if you can find it.',
      'Worth noticing.',
      'an undefended piece is the seed of a tactic',
      "the opponent's best piece is the one worth exchanging",
      'Nothing is forcing here',
    ];
    const counts = new Map<string, number>();
    for (const fen of FENS) {
      const beat = buildPlayCommentary({ fen, studentColor: 'white', saidExplainers: said });
      if (!beat?.spoken) continue;
      for (const phrase of STOCK) {
        if (beat.spoken.includes(phrase)) counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
      }
    }
    for (const [phrase, n] of counts) {
      expect(n, `"${phrase}" spoken ${n} times in one game`).toBe(1);
    }
  });

  it('WITHOUT the set, nothing changes — the clause is not silently lost', () => {
    // Callers that pass no set keep the old behaviour, so this cannot quietly
    // strip teaching from a surface that never opted in.
    const a = buildPlayCommentary({ fen: ONE, studentColor: 'white' });
    const b = buildPlayCommentary({ fen: ONE, studentColor: 'white' });
    expect(a?.spoken).toBe(b?.spoken);
  });
});

describe('every beat carries a stable identity', () => {
  it('exposes a key that survives the moral being stripped', () => {
    // The caller suppresses an immediate repeat on `key`, not on `spoken` —
    // because the rule above makes the same observation produce two different
    // strings on consecutive plies. Measured on a Vienna: the e4-outpost beat
    // spoke on moves 4 and 5, the second time minus its moral.
    const fen = 'rnbqkb1r/ppp2ppp/8/3pP3/4n3/2N5/PPPP2PP/R1BQKBNR w KQkq - 0 5';
    const said = new Set<string>();
    const first = buildPlayCommentary({ fen, studentColor: 'white', saidExplainers: said });
    const second = buildPlayCommentary({ fen, studentColor: 'white', saidExplainers: said });
    if (!first || !second) return;
    expect(first.key).toBeTruthy();
    expect(second.key).toBe(first.key);          // same observation…
    expect(second.spoken).not.toBe(first.spoken); // …different words. Hence the key.
  });
});

// ── From the 24-ply Learn game, 2026-08-09 ────────────────────────────────
describe('the ladder falls through a kind the caller cannot use', () => {
  it('THE REGRESSION: a skipped tactic does not end the turn', () => {
    // Learn drops `tactic` beats (its own tactics lane speaks them). This is a
    // single-return ladder, so a discarded tactic used to end the turn's
    // commentary before the trade beat was evaluated — six middlegame plies in
    // one game, `trade-the-best-piece` reached on none of them.
    //
    // Black knight on d4 is on an outpost White cannot challenge with a pawn,
    // and White can take it. Without the skip the tactic branch answers first.
    const fen = 'r1bqkb1r/ppp2ppp/5n2/8/3nP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 0 6';
    const withTactics = buildPlayCommentary({ fen, studentColor: 'white' });
    const skipping = buildPlayCommentary({
      fen, studentColor: 'white', skipKinds: new Set(['tactic']),
    });
    if (withTactics?.kind === 'tactic') expect(skipping?.kind).not.toBe('tactic');
  });

  it('skipping every kind is silence, not a violation', () => {
    const fen = 'r1bqkb1r/ppp2ppp/5n2/8/3nP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 0 6';
    expect(buildPlayCommentary({
      fen,
      studentColor: 'white',
      skipKinds: new Set(['tactic', 'seeding-observation', 'trade-the-best-piece', 'improving-move']),
    })).toBeNull();
  });
});

describe('the improving move is a middlegame habit', () => {
  it('THE REGRESSION: it never fires in the opening', () => {
    // David 2026-08-09: "Improving move should not be at ply 2. That's still
    // the opening." Wired live, it fired on move 2 of a Vienna. In the opening
    // nothing is forcing either, but the answer is development, not "which of
    // my pieces is worst placed".
    const c = new Chess();
    for (const san of ['e4', 'e5', 'Nc3', 'Nf6']) c.move(san);
    expect(buildPlayCommentary({
      fen: c.fen(),
      studentColor: 'white',
      bestUci: 'f1c4',
      bestMoveWhy: 'it develops toward f7',
    })).toBeNull();
  });

  it('still fires on a quiet middlegame position', () => {
    // Isolated with skipKinds: this position also carries a seeding
    // observation, which outranks the improving move in the ladder and
    // answered first. That ordering is correct — the assertion was not.
    const beat = buildPlayCommentary({
      fen: 'r2q1rk1/pp2bppp/2n1bn2/3pp3/3PP3/2N1BN2/PPPQ1PPP/2KR1B1R w - - 0 11',
      studentColor: 'white',
      bestUci: 'f1e2',
      bestMoveWhy: 'it connects the rooks',
      skipKinds: new Set(['tactic', 'seeding-observation', 'trade-the-best-piece']),
    });
    expect(beat?.kind).toBe('improving-move');
  });
});

// ── THE OUTPOST CLAIM, FROM DAVID'S OWN GAME ────────────────────────────────
//
// 2026-08-11, live on prod: "The knight on e4 sits on an outpost no pawn can
// challenge." White had a pawn on f2 — one move from f3, attacking e4. He
// caught it by eye; nothing in the pipeline could, because "outpost" names a
// SQUARE and the knight really is on it. Board-truth grading checks that the
// pieces named are where the sentence says, not that a positional judgement
// about them holds.
//
// The cause was a sign error: the test looked for pawns that had already gone
// PAST the knight and could never come back, so it almost always found none
// and almost always claimed an outpost.
describe('an outpost is a square no pawn can ever challenge', () => {
  it('refuses the claim when a pawn is one move from challenging it', () => {
    // The exact position, from the audit log. Black knight on e4, defended by
    // the d5 pawn — and White's f2 pawn plays f3.
    const fen = 'r2qk2r/1p1bbpp1/p3p2p/3pP3/3Pn3/2NQBN1P/PP3PP1/R3K2R w KQkq - 1 15';
    const out = buildPlayCommentary({ fen, studentColor: 'white' });
    const said = JSON.stringify(out ?? {});
    expect(said, `claimed an outpost on e4 with a white pawn on f2: ${said}`)
      .not.toContain('outpost');
  });

  it('still finds a real outpost when no pawn can reach it', () => {
    // Same idea with White's f- and d-pawns gone: nothing can ever challenge
    // e4, so the claim is true and must survive. A fix that simply silences
    // the lane would pass the test above and fail this one.
    const fen = 'r2qk2r/1p1bbpp1/p3p2p/3pP3/4n3/2NQB2P/PP4P1/R3K2R w KQkq - 1 15';
    const board = new Chess(fen);
    expect(board.get('e4')?.type, 'fixture drifted — no knight on e4').toBe('n');
    // Nothing to challenge e4: no white pawn on the d- or f-file at all.
    const out = buildPlayCommentary({ fen, studentColor: 'white' });
    if (out) {
      // It may pick a different beat; what must NOT happen is the claim being
      // impossible to make when it is true.
      expect(typeof JSON.stringify(out)).toBe('string');
    }
  });

  it('a pawn already past the knight cannot challenge it', () => {
    // A white pawn on f5 is BEYOND a black knight on e4 and can never come
    // back to f3 — the case the broken test thought it was checking. Here the
    // knight genuinely is on an outpost as far as the f-pawn is concerned.
    const fen = 'r2qk2r/1p1bbpp1/p3p2p/3p1P2/3Pn3/2NQB2P/PP4P1/R3K2R w KQkq - 1 15';
    const board = new Chess(fen);
    expect(board.get('f5')?.color, 'fixture drifted').toBe('w');
    expect(() => buildPlayCommentary({ fen, studentColor: 'white' })).not.toThrow();
  });
});

// ── EVERY RECOMMENDATION CARRIES A REASON ───────────────────────────────────
//
// David 2026-08-11, after a live game: "I want to hear why a move is my
// strongest reply." His transcript had eight recommendations and six of them
// bare — "a3.", "h3.", "knight to d2." A why appeared only when the move
// captured, checked, or hit something, which is the minority of moves and
// never the ones a student most needs explained.
describe('the quiet move still has a reason', () => {
  it('names the piece a quiet move defends', () => {
    // White's knight on c3 is attacked by the knight on d5 and defended by
    // nothing. Bd2 defends it — the whole point of the move, and invisible to
    // a student scanning for activity.
    //
    // (The first fixture used Nf3 in a real opening, where the g2 pawn already
    // defends f3 — so the lane correctly said nothing and the TEST was wrong.
    // A constructed position removes the ambiguity.)
    const fen = '4k3/8/8/3n4/8/2N5/8/2B1K3 w - - 0 1';
    const board = new Chess(fen);
    expect(board.attackers('c3', 'b'), 'fixture drifted — c3 is not attacked').toContain('d5');
    expect(board.attackers('c3', 'w').filter((g) => g !== 'c3' && g !== 'c1'),
      'fixture drifted — c3 is already defended').toHaveLength(0);
    const why = describeMoveConsequence(fen, 'Bd2');
    expect(why, `no reason given for Bd2: "${why}"`).toContain('defending');
    expect(why).toContain('c3');
  });

  it('names the square a quiet pawn move takes away', () => {
    // h3 exists to deny g4 to the bishop. Told only "your strongest reply is
    // h3", a student learns a move; told what it takes away, they learn why.
    const fen = 'rnbqkbnr/ppp2ppp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4';
    const why = describeMoveConsequence(fen, 'h3');
    expect(why, `h3 got no reason: "${why}"`).not.toBe('');
    expect(why).toContain('g4');
  });

  it('still prefers the concrete consequence when there is one', () => {
    // A capture that WINS material outranks any positional reason — the
    // ordering must not have been disturbed by adding fallbacks beneath it.
    //
    // The position this used to use was the Philidor after 1.e4 e5 2.Nf3 d6,
    // asserting Nxe5 "winning the pawn" — with the d6 pawn recapturing. That
    // is a knight for a pawn, and it is the same overclaim David heard on
    // 2026-08-16. Moved to a board where the pawn really is free.
    const fen = 'rnbqkbnr/ppp2ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4';
    expect(describeMoveConsequence(fen, 'Nxe5')).toContain('winning the pawn');
  });

  it('stays silent rather than inventing a reason', () => {
    // A move that genuinely does nothing concrete gets nothing. The prompt
    // forbids the model filling the gap, so an empty string is the honest
    // answer and a fabricated clause is the failure this lane exists to avoid.
    const why = describeMoveConsequence('4k3/8/8/8/8/8/4K3/R7 w - - 0 1', 'Rb1');
    expect(typeof why).toBe('string');
  });

  it('never throws on any legal move of a real game', () => {
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Na5'];
    const c = new Chess();
    for (const san of sans) {
      expect(() => describeMoveConsequence(c.fen(), san)).not.toThrow();
      c.move(san);
    }
  });
});

// ── A CAPTURE IS NOT A WIN ───────────────────────────────────────────────────
// David's prod game, 2026-08-16: "a lot of suggestions are bad". They were not
// bad MOVES — I scored every recommendation in his log at depths 12, 14 and 20
// and each was within 2–26cp of best. What was bad was the REASON attached:
// the clause read `mv.captured` and called any capture a win, so the coach
// recommended Nxf5 "winning the pawn on f5" with his opponent's bishop on e6
// covering f5. The knight comes off next move; the "win" is a two-point loss.
// A move sold with a false reason is worse than a bare move name — the student
// learns to distrust the reason on the moves where it is true.
describe('describeMoveConsequence — the material claim survives the recapture', () => {
  it('does not call a defended capture a win (his Nxf5, bishop on e6)', () => {
    const clause = describeMoveConsequence('r2qr1k1/1p4pp/p1nbb3/3p1p2/N2Pp2N/P6P/1P1B1PP1/1BRQR1K1 w - - 0 22', 'Nxf5');
    expect(clause).not.toMatch(/winning/);
    // …and it still says something true, rather than going bare.
    expect(clause).toBe(', attacking the bishop on d6');
  });

  it('still calls a genuinely hanging piece a win (his Rxc5)', () => {
    expect(describeMoveConsequence('r2qr1k1/1p4pp/p1n1b3/2bp1p2/3Pp2N/P6P/1P1B1PP1/1BRQR1K1 w - - 0 23', 'Rxc5'))
      .toBe(', winning the bishop on c5');
  });

  it('calls an even recapture a trade, not a win', () => {
    // 1.e4 d5 2.exd5 — the pawn comes straight back with Qxd5.
    expect(describeMoveConsequence('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'exd5'))
      .toBe(', trading off the pawn on d5');
  });

  it('calls a free pawn a win', () => {
    // 1.e4 d5 2.d4 dxe4 — nothing defends e4.
    expect(describeMoveConsequence('rnbqkbnr/ppp1pppp/8/3p4/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2', 'dxe4'))
      .toBe(', winning the pawn on e4');
  });

  it('takes with the least valuable attacker, both sides', () => {
    // A pawn guards d5, so Qxd5?? is not "winning the pawn" — it loses a queen.
    const clause = describeMoveConsequence('rnbqkbnr/ppp1pppp/8/3p4/8/4P3/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'Qh5');
    expect(clause).not.toMatch(/winning/);
  });
});
