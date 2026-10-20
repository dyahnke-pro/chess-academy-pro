import { describe, it, expect } from 'vitest';
import { NAMES_NO_MOVE } from './studentMoveNaming';
import { NO_PROOF } from './proof';
import { decideTurn, LANE_PHASE, laneOutOfPhase } from './learnTurnDoor';

// David's Smith-Morra, after 34.Kf3 (2026-10-19): a knight-and-rook ending.
const ENDING = '5r2/pp4k1/3p1R2/2nN2P1/4P3/5K2/8/8 b - - 0 34';
const MIDDLEGAME = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';

describe('the ending is narrated as an ending (David 2026-10-19: endgame narrations not targeted)', () => {
  it('opening, castling and king-attack lanes are held in an ending, with the reason', () => {
    const d = decideTurn([
      { lane: 'kingSafety', namesStudentMove: NAMES_NO_MOVE, proof: NO_PROOF.stated, text: 'Your king is still in the centre and castling is ready.', fen: ENDING },
      { lane: 'openingIdea', namesStudentMove: NAMES_NO_MOVE, proof: NO_PROOF.stated, text: 'Master games from here go for the c5 break.', fen: ENDING },
      { lane: 'pawnEnding', namesStudentMove: NAMES_NO_MOVE, proof: NO_PROOF.stated, text: 'Your g-pawn is two squares from queening and their king cannot catch it.', fen: ENDING, squares: ['g5', 'g7'] },
    ]);
    expect(d.spoke).toEqual(['pawnEnding']);
    expect(d.held).toEqual(expect.arrayContaining(['kingSafety', 'openingIdea']));
  });

  it('the same lanes still speak before the ending', () => {
    expect(laneOutOfPhase('kingSafety', MIDDLEGAME)).toBe(false);
    expect(laneOutOfPhase('kingSafety', ENDING)).toBe(true);
  });

  it('danger, the verdict and the move\'s own reason are never phase-held', () => {
    for (const l of ['threat', 'dangerLevels', 'threatAnswer', 'mistake', 'drawback', 'moveIntent', 'movePoint', 'tactic', 'planArc'] as const) {
      expect(LANE_PHASE[l]).toBe('any');
    }
  });
});

describe('a tactic alert is heard (David 2026-10-19: "i also never heard a tactic alert")', () => {
  const FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
  it('a staked tactic speaks on a verdict turn; the same tactic unstaked was held', async () => {
    const { costStakes, mateStakes } = await import('./factStakes');
    const verdict = { lane: 'mistake' as const, namesStudentMove: NAMES_NO_MOVE, proof: NO_PROOF.stated, text: 'Nf6 was a mistake — it cost a point and a half.', fen: FEN, stakes: costStakes(150) ?? undefined };
    const tactic = { lane: 'tactic' as const, namesStudentMove: NAMES_NO_MOVE, proof: NO_PROOF.stated, text: 'There is a forced mate here.', fen: FEN, squares: ['f7'] };
    expect(decideTurn([verdict, tactic]).spoke).not.toContain('tactic');
    expect(decideTurn([verdict, { ...tactic, stakes: mateStakes('you', 1, true) }]).spoke).toContain('tactic');
  });

  it('the page marks the alert said only after the door spoke it, and stakes it', async () => {
    const { readFileSync } = await import('node:fs');
    const code = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(code).toMatch(/spoke\.includes\('tactic'\)\) markTacticSaid\?\.\(\)/);
    expect(code).toMatch(/lane: 'tactic' as const, [^\n]*stakes: tacticStakes/);
    // The say-once memory is written only inside the deferred mark.
    const writes = code.match(/lastTacticKey = /g) ?? [];
    expect(writes.length).toBe(1);
    expect(code).toMatch(/markTacticSaid = \(\) => \{\s*learnMemRef\.current\.lastTacticKey = saidKey/);
  });
});

describe('a mate turn stays on the mate across both waves (replay 2026-10-19, 48.d6)', () => {
  const FEN = '8/8/3P1k2/6R1/p7/1P6/5K2/8 b - - 0 48';
  it('the late wave holds a plan when the instant wave spoke a forced mate', async () => {
    const { mateStakes } = await import('./factStakes');
    const instant = decideTurn([{ lane: 'tactic', namesStudentMove: NAMES_NO_MOVE, proof: NO_PROOF.stated, text: "There's a forced mate here — mate in 2.", fen: FEN, squares: ['d8'], stakes: mateStakes('you', 3, true) }]);
    expect(instant.lead?.mateTurn).toBe(true);
    const plan = { lane: 'planArc' as const, namesStudentMove: NAMES_NO_MOVE, proof: NO_PROOF.stated, text: "The plan changes here — now it's to get your passed pawn on d6 promoting.", fen: FEN, squares: ['d6', 'd8'] };
    const late = decideTurn([plan], instant.pkg.spoken, undefined, instant.lead);
    expect(late.spoke).not.toContain('planArc');
    expect(decideTurn([plan], '', undefined, { lane: 'tactic', squares: ['d8'] }).spoke).toContain('planArc');
  });
});

describe('a costly move is a verdict turn in every wave (replay 2026-10-19, 8.Bxf7+)', () => {
  const FEN = 'r1bq2nr/pp2pkbp/2np2p1/8/4P3/2N2N2/PP3PPP/R1BQ1RK1 w - - 0 9';
  it('a plan waits when the move cost three points, whichever lane gave the grade', () => {
    const plan = { lane: 'planArc' as const, namesStudentMove: NAMES_NO_MOVE, proof: NO_PROOF.stated, text: 'So the plan: put a rook on the open c-file.', fen: FEN, squares: ['a1', 'c1'] };
    expect(decideTurn([plan], '', undefined, null, null, false, { kind: 'late', ply: 15, moveCostCp: 300, priceSettled: true, price: null, midExchange: null }).spoke).not.toContain('planArc');
    expect(decideTurn([plan], '', undefined, null, null, false, { kind: 'late', ply: 15, moveCostCp: 20, priceSettled: true, price: null, midExchange: null }).spoke).toContain('planArc');
  });
});

describe('a warning that costs nothing yet waits behind a costly move (OS-1 replay 2026-10-19, 22.Rxa5)', () => {
  // The blunder turn spoke "No rush yet — …" for twenty seconds and the
  // verdict queued behind it was never heard.
  const notYet = { lane: 'threat' as const, namesStudentMove: NAMES_NO_MOVE, proof: NO_PROOF.stated, text: 'No rush yet — keep an eye on the long diagonal.', fen: MIDDLEGAME, squares: ['a1', 'h8'] };
  it('is held on a verdict turn and said on a calm one', () => {
    expect(decideTurn([notYet], '', undefined, null, null, false, { kind: 'instant', ply: 43, moveCostCp: 450, priceSettled: true, price: null, midExchange: null }).spoke).not.toContain('threat');
    expect(decideTurn([notYet], '', undefined, null, null, false, { kind: 'instant', ply: 43, moveCostCp: 20, priceSettled: true, price: null, midExchange: null }).spoke).toContain('threat');
  });
  it('a danger that costs something now still speaks on the verdict turn', () => {
    const now = { ...notYet, text: 'Watch out — your rook is attacked.', stakes: { points: 5, plies: 1 } };
    expect(decideTurn([now], '', undefined, null, null, false, { kind: 'instant', ply: 43, moveCostCp: 450, priceSettled: true, price: null, midExchange: null }).spoke).toContain('threat');
  });
});

describe('a trade in progress is a now turn (Learn walk 2026-10-19, 12…Nxb3 / 13…Bxg3)', () => {
  const plan = { lane: 'planArc' as const, namesStudentMove: NAMES_NO_MOVE, proof: NO_PROOF.stated, text: 'So the plan: break open with the pawn push that is ready now.', fen: MIDDLEGAME, squares: ['d4', 'd5'] };
  const tactic = { lane: 'tactic' as const, namesStudentMove: NAMES_NO_MOVE, proof: NO_PROOF.stated, text: 'There is a tactic on f7 for you.', fen: MIDDLEGAME, squares: ['f7'], stakes: { points: 3, plies: 1 } };
  it('a plan waits while the recapture is owed, and says why; a tactic still speaks', async () => {
    const { onLearnTurn } = await import('./coachDecisionEvents');
    const rows: Array<{ heldWhy?: Record<string, string> }> = [];
    const off = onLearnTurn((r) => rows.push(r as { heldWhy?: Record<string, string> }));
    try {
      const d = decideTurn([plan, tactic], '', undefined, null, null, false, { kind: 'instant', ply: 23, moveCostCp: 0, priceSettled: true, price: null, midExchange: 'b3' });
      expect(d.spoke).not.toContain('planArc');
      expect(d.spoke).toContain('tactic');
      expect(rows.at(-1)?.heldWhy?.planArc).toBe('mid-exchange');
    } finally { off(); }
    expect(decideTurn([plan], '', undefined, null, null, false, { kind: 'instant', ply: 23, moveCostCp: 0, priceSettled: true, price: null, midExchange: null }).spoke).toContain('planArc');
  });
  it('a costly-move hold is reported as a verdict turn, never as a mate turn', async () => {
    const { onLearnTurn } = await import('./coachDecisionEvents');
    const rows: Array<{ heldWhy?: Record<string, string> }> = [];
    const off = onLearnTurn((r) => rows.push(r as { heldWhy?: Record<string, string> }));
    try {
      decideTurn([plan], '', undefined, null, null, false, { kind: 'late', ply: 15, moveCostCp: 300, priceSettled: true, price: null, midExchange: null });
      expect(rows.at(-1)?.heldWhy?.planArc).toBe('verdict-turn');
    } finally { off(); }
  });
});
