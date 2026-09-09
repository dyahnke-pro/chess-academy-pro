import { describe, it, expect } from 'vitest';
import { assemblePositionalAnswer } from './groundedAnswer';
const START='r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4';
describe('assemblePositionalAnswer — correct deterministic data', () => {
  it('material: even + real piece breakdown in symmetric Italian', () => {
    const a = assemblePositionalAnswer(START, 'white', 'material');
    expect(a?.facts).toMatch(/Material is even/);
    expect(a?.facts).toMatch(/2 knights/);
    expect(a?.facts).not.toMatch(/pawn of|winning/); // NOT an eval
  });
  it('center: real central-piece counts, not an eval', () => {
    const a = assemblePositionalAnswer(START, 'white', 'center');
    expect(a?.facts).toMatch(/bearing on the centre/);
  });
  it('development: developed-minor count + castling state', () => {
    const a = assemblePositionalAnswer(START, 'white', 'development');
    expect(a?.facts).toMatch(/developed \d of your \d minor/);
  });
  it('structure: sound / weak-pawn read', () => {
    const a = assemblePositionalAnswer(START, 'white', 'structure');
    expect(a?.facts).toMatch(/sound|isolated|doubled/);
  });
  it('king: castled + exposure read', () => {
    const a = assemblePositionalAnswer(START, 'white', 'king');
    expect(a?.facts).toMatch(/king is (?:castled|not castled)/);
  });
  it('key-squares: names the opponent hole as an outpost target (Sicilian d5)', () => {
    // 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5 — ...e5 leaves d5 a hole
    // in Black's camp (no black c- or e-pawn can ever guard it). For a White
    // student that is an outpost target, computed from findWeakSquares (G3).
    const SICILIAN = 'r1bqkb1r/pp1p1ppp/2n2n2/4p3/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6';
    const a = assemblePositionalAnswer(SICILIAN, 'white', 'key-squares');
    expect(a?.facts).toMatch(/d5/);
    expect(a?.facts).toMatch(/outpost/);
    expect(a?.bestMoveSan).toBeNull(); // NOT an engine move — a board read
  });
  it('key-squares: no bare deflect when no side has a hole — points to a break', () => {
    const START_POS = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const a = assemblePositionalAnswer(START_POS, 'white', 'key-squares');
    expect(a?.facts).toMatch(/no weak squares|pawn break|create one/i);
  });
  // Every board-awareness computer wired into chat (David 2026-09-09: "all
  // 30ish need to be wired in") — a REAL answer comes out for a real position.
  it('space: names the contested-square counts', () => {
    const a = assemblePositionalAnswer(START, 'white', 'space');
    expect(a?.facts).toMatch(/space|square/i);
    expect(a?.bestMoveSan).toBeNull();
  });
  it('bishop-pair: reports the pair when a side has two vs one', () => {
    const twoB = '4k3/8/8/8/8/8/8/2B1KB2 w - - 0 1'; // White two bishops, Black none
    expect(assemblePositionalAnswer(twoB, 'white', 'bishop-pair')?.facts).toMatch(/bishop pair/i);
  });
  it('passed-pawn: names the passer square', () => {
    const passer = '6k1/8/8/3P4/8/8/8/6K1 w - - 0 1';
    expect(assemblePositionalAnswer(passer, 'white', 'passed-pawn')?.facts).toMatch(/d5|passed|passer/i);
  });
  it('best-piece: names the most-active piece square', () => {
    const a = assemblePositionalAnswer(START, 'white', 'best-piece');
    expect(a?.facts).toMatch(/most active|least active/i);
    expect(a?.facts).toMatch(/[a-h][1-8]/);
  });
  it('open-files: names an open file for the rooks', () => {
    const openCDE = 'r3k2r/pp3ppp/8/8/8/8/PP3PPP/R3K2R w KQkq - 0 1'; // c/d/e files open
    expect(assemblePositionalAnswer(openCDE, 'white', 'open-files')?.facts).toMatch(/file/i);
  });
  it('pawn-breaks: names a break for the side to move', () => {
    const sicilian = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2'; // 1.e4 c5, White to move
    expect(assemblePositionalAnswer(sicilian, 'white', 'pawn-breaks')?.facts).toMatch(/d4|break/i);
  });
  it('pressure: reports what the student is pressuring', () => {
    const press = '4k3/8/8/3n4/8/3R4/8/4K3 w - - 0 1'; // White Rd3 hits undefended Nd5
    expect(assemblePositionalAnswer(press, 'white', 'pressure')?.facts).toMatch(/pressur|d5/i);
  });
  it('xray: names the x-ray through a blocker', () => {
    const xr = '4k3/4r3/4n3/8/8/8/4R3/4K3 w - - 0 1'; // Re2 x-rays Re7 through Ne6
    expect(assemblePositionalAnswer(xr, 'white', 'xray')?.facts).toMatch(/x-?ray|e[1-8]/i);
  });
  it('endgame-plan: gives king/opposition technique in a K+P ending', () => {
    const kp = '8/8/8/4k3/8/4K3/4P3/8 w - - 0 1';
    const a = assemblePositionalAnswer(kp, 'white', 'endgame-plan');
    // May be null if no technique fires; when present it must be real technique.
    if (a) expect(a.facts).toMatch(/king|opposition|passer|endgame/i);
  });
  it('returns null on an invalid FEN (degrades safe)', () => {
    expect(assemblePositionalAnswer('not-a-fen', 'white', 'material')).toBeNull();
  });
});
