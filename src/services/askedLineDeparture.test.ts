// THE GAME LEAVES THE ASKED LINE (David 2026-11-21): said once in Learn, where
// it happened, from the one computer Play's plan tracker reads.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { askedLineDeparture } from './askedLineDeparture';
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

describe('the spoken line', () => {
  it('Learn never names the student\'s own move; it names where and what the line plays', () => {
    const mine = renderAskedLineLeft({ name: 'Najdorf', seat: 'student', played: 'g6', book: 'a6', moveNumber: 5, ply: 9 });
    expect(mine).not.toMatch(/\bg6\b/);
    expect(mine).toMatch(/Najdorf on move 5/);
    expect(mine).toMatch(/a6/);
    const theirs = renderAskedLineLeft({ name: 'Najdorf', seat: 'opponent', played: 'f3', book: 'Be3', moveNumber: 6, ply: 10 });
    expect(theirs).toMatch(/\bf3\b/);
    expect(theirs).not.toMatch(/\b(we|our|us)\b/i);
    // Rotated on the ply, never random.
    expect(renderAskedLineLeft({ name: 'Najdorf', seat: 'student', played: 'g6', book: 'a6', moveNumber: 5, ply: 10 })).not.toBe(mine);
  });

  it('Learn and Play both read the one computer; Play keeps no private loop', () => {
    const learn = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(learn).toMatch(/askedLineDeparture\(history, askedMoves, studentCC/);
    expect(learn).toMatch(/lane: 'opening' as const, computer: 'askedLineDeparture'/);
    const play = readFileSync('src/components/Coach/CoachGamePage.tsx', 'utf8');
    expect(play).toMatch(/askedLineDeparture\(playedMoves, allEntries/);
    expect(play).not.toMatch(/let divergenceIdx = -1/);
  });
});
