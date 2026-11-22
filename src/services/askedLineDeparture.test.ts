// THE GAME LEAVES THE ASKED LINE (David 2026-11-21): said once in Learn, where
// it happened, from the one computer Play's plan tracker reads.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { askedLineDeparture } from './askedLineDeparture';
import { askedLineLeft } from './askedLineLeft';
import { renderAskedLineLeft } from './teachingSentence';

const NAJDORF = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3'];

describe('askedLineDeparture', () => {
  it('is null while the game is still on the line, and past its end', () => {
    expect(askedLineDeparture(NAJDORF.slice(0, 6), NAJDORF, 'b', 4)).toBeNull();
    expect(askedLineDeparture([...NAJDORF, 'e5'], NAJDORF, 'b', 10)).toBeNull();
  });

  it('names the student leaving the line on the wave it happened', () => {
    const played = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3'];
    const d = askedLineDeparture(played, NAJDORF, 'b', played.length - 2);
    expect(d).toEqual({ ply: 9, played: 'g6', book: 'a6', moveNumber: 5, seat: 'student' });
  });

  it('names the opponent leaving it, and says it once: a later wave is silent', () => {
    const played = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'f3'];
    expect(askedLineDeparture(played, NAJDORF, 'b', played.length - 2)?.seat).toBe('opponent');
    expect(askedLineDeparture([...played, 'e5', 'Be3'], NAJDORF, 'b', played.length + 1 - 1)).toBeNull();
  });

  it('a check or annotation mark is not a departure', () => {
    expect(askedLineDeparture(['e4', 'c5', 'Nf3!'], ['e4', 'c5', 'Nf3'], 'w', 0)).toBeNull();
  });
});

// Engine-read (Stockfish 18, depth 18, White's view): after 1.e4 e5 2.Nf3 Nc6
// 3.Bc4, …Nf6 is +30 and …f6 is +161 — leaving the Two Knights with …f6 costs
// Black 131. In the Najdorf after 5.Nc3, …a6 is +40 and …g6 +66 — 26, a fair
// sideline.
const TWO_KNIGHTS = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3'];
const F6 = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'f6'];

describe('the spoken line: only when leaving the line hurt (David 2026-11-21)', () => {
  it('a costly departure says why the line\'s move was better, and never names the student\'s move', () => {
    const r = askedLineLeft({ name: 'Two Knights', pgn: TWO_KNIGHTS.join(' ') }, F6, 'b', F6.length - 1, 131);
    expect(r?.text).toMatch(/Two Knights on move 3/);
    expect(r?.text).toMatch(/Nf6/);
    expect(r?.text).toMatch(/costs you/);
    expect(r?.text).not.toMatch(/\bf6\b(?!.*Nf6)|…f6/);
    expect(r?.text).not.toMatch(/\b(we|our|us)\b/i);
    expect(r?.squares.length).toBeGreaterThan(0);
  });
  it('a cheap departure, an unpriced move and the opponent leaving the line say nothing', () => {
    const g6 = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'];
    expect(askedLineLeft({ name: 'My Najdorf', pgn: NAJDORF.join(' ') }, g6, 'b', g6.length - 1, 26)).toBeNull();
    expect(askedLineLeft({ name: 'Two Knights', pgn: TWO_KNIGHTS.join(' ') }, F6, 'b', F6.length - 1, null)).toBeNull();
    const theirs = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'f3'];
    expect(askedLineLeft({ name: 'My Najdorf', pgn: NAJDORF.join(' ') }, theirs, 'b', theirs.length - 1, 300)).toBeNull();
  });
  it('rotated on the ply, never random', () => {
    const d = { name: 'Two Knights', book: 'Nf6', job: 'it hits your pawn on e4', left: null, moveNumber: 3 };
    expect(renderAskedLineLeft({ ...d, ply: 5 })).not.toBe(renderAskedLineLeft({ ...d, ply: 6 }));
  });

  it('Learn and Play both read the one asked-line path, with the move\'s price; neither surface calls the computer', () => {
    const learn = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(learn).toMatch(/askedLineLeft\(asked, history, studentCC, Math\.max\(0, history\.length - 2\), args\.slipCp\)/);
    expect(learn).toMatch(/lane: 'opening' as const, computer: 'askedLineDeparture'/);
    const play = readFileSync('src/components/Coach/CoachGamePage.tsx', 'utf8');
    expect(play).toMatch(/askedLineLeft\(intent, played, [^)]*movePriced \? evalLoss : null\)/);
    expect(play).not.toMatch(/let divergenceIdx = -1|Heads up — /);
    for (const page of [learn, play]) expect(page).not.toMatch(/askedLineDeparture\(|renderAskedLineLeft/);
  });

  it('the asked line is the launched PGN when there is one, else the named opening', () => {
    const byPgn = askedLineLeft({ name: 'My Two Knights', pgn: TWO_KNIGHTS.join(' ') }, F6, 'b', F6.length - 1, 131);
    expect(byPgn?.departure).toEqual({ ply: 5, played: 'f6', book: 'Nf6', moveNumber: 3, seat: 'student' });
    expect(byPgn?.canonicalName).toBe('My Two Knights');
    expect(askedLineLeft({ name: 'no such opening zzz' }, F6, 'b', 0, 131)).toBeNull();
    // With no job on the board for the line's move, nothing is said (never bare).
    const qb6 = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'Qb6'];
    expect(askedLineLeft({ name: 'My Najdorf', pgn: NAJDORF.join(' ') }, qb6, 'b', qb6.length - 1, 200)).toBeNull();
  });
});
