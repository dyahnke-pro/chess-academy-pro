import { describe, it, expect } from 'vitest';
import { buildFastMoveLine } from './fastMoveNarration';
import type { TacticPattern, HangingPiece } from '../types/tacticTypes';

const fork: TacticPattern = {
  type: 'fork',
  involvedSquares: ['d5', 'c7', 'f6'],
  description: 'knight on d5 forks queen on c7 and rook on f6',
};

describe('buildFastMoveLine', () => {
  it('is silent when density is none', () => {
    expect(
      buildFastMoveLine({ san: 'Nf3', moverIsWhite: true, density: 'none', tactics: [fork] }),
    ).toBe('');
  });

  it('speaks a real tactic motif, capitalized and punctuated', () => {
    expect(
      buildFastMoveLine({ san: 'Nd5', moverIsWhite: true, density: 'fast', tactics: [fork], volunteerBoardReading: true }),
    ).toBe('Knight on d5 forks queen on c7 and rook on f6.');
  });

  it('ignores no-op tactics', () => {
    const none: TacticPattern = { type: 'none', involvedSquares: [], description: '' };
    // fast density + routine move + no real tactic → silent
    expect(
      buildFastMoveLine({ san: 'Be2', moverIsWhite: true, density: 'fast', tactics: [none] }),
    ).toBe('');
  });

  it('warns of the mover\'s own hanging piece on a key move, naming the consequence', () => {
    const hanging: HangingPiece[] = [{ square: 'd4', piece: 'n', color: 'w' }];
    expect(
      buildFastMoveLine({
        san: 'Nd4',
        moverIsWhite: true,
        density: 'fast',
        classification: 'blunder',
        hangingPieces: hanging, volunteerBoardReading: true }),
    ).toBe('That leaves your knight on d 4 hanging — it can be taken.');
  });

  it('narrates a hanging pawn ONCE, then suppresses the repeat for that square', () => {
    const hanging: HangingPiece[] = [{ square: 'd4', piece: 'p', color: 'w' }];
    const announcedHangingSquares = new Set<string>();
    // First time the d4 pawn is loose → speak it.
    expect(
      buildFastMoveLine({
        san: 'd4', moverIsWhite: true, density: 'fast',
        classification: 'blunder', hangingPieces: hanging, announcedHangingSquares, volunteerBoardReading: true }),
    ).toBe('That leaves your pawn on d 4 hanging — it can be taken.');
    // Same pawn still loose next ply → do NOT repeat; fall to the key flag.
    expect(
      buildFastMoveLine({
        san: 'Ke2', moverIsWhite: true, density: 'fast',
        classification: 'blunder', hangingPieces: hanging, announcedHangingSquares, volunteerBoardReading: true }),
    ).toBe('That drops material.');
  });

  it('does not warn about a hanging piece on a move graded good under fast density', () => {
    const hanging: HangingPiece[] = [{ square: 'd4', piece: 'n', color: 'w' }];
    expect(
      buildFastMoveLine({
        san: 'Nd4', moverIsWhite: true, density: 'fast',
        classification: 'good', hangingPieces: hanging, volunteerBoardReading: true }),
    ).toBe('');
  });

  it('does not surface the opponent\'s hanging piece as the mover\'s blunder', () => {
    const hanging: HangingPiece[] = [{ square: 'd4', piece: 'n', color: 'b' }];
    // White just moved; a Black hanging piece is not White's blunder.
    // No tactic, classification good, fast density → silent.
    expect(
      buildFastMoveLine({
        san: 'Nd4', moverIsWhite: true, density: 'fast',
        classification: 'good', hangingPieces: hanging, volunteerBoardReading: true }),
    ).toBe('');
  });

  // PLAY STAYS SILENT UNTIL ASKED (David 2026-08-16, on the prod audit catching
  // it volunteering: "Keep it silent. Unless the user asks! It still needs to
  // be able to identify!"). The default is OFF because the only caller is
  // /coach/play — a playing surface, not a teaching one.
  describe('volunteered board reading is off by default', () => {
    it('does NOT name a fork the student did not ask about', () => {
      // The exact line the audit caught, minus the flag.
      expect(
        buildFastMoveLine({ san: 'Nd5', moverIsWhite: true, density: 'fast', tactics: [fork] }),
      ).toBe('');
    });

    it('does NOT volunteer a hanging piece', () => {
      const hanging: HangingPiece[] = [{ square: 'd4', piece: 'n', color: 'w' }];
      expect(
        buildFastMoveLine({ san: 'Nd4', moverIsWhite: true, density: 'unlimited', classification: 'inaccuracy', hangingPieces: hanging }),
      ).toBe('A small slip — there was better.');   // the slip flag, not the board reading
    });

    it('still dictates the move, which is how the student knows what was played', () => {
      expect(
        buildFastMoveLine({ san: 'Nd5', moverIsWhite: true, density: 'unlimited', tactics: [fork] }),
      ).toBe('Knight to d5.');
    });

    it('still flags a mistake — the Play contract allows mentioning those', () => {
      expect(
        buildFastMoveLine({ san: 'Qh5', moverIsWhite: true, density: 'fast', classification: 'blunder', tactics: [fork] }),
      ).toBe('That drops material.');
    });

    it('says the fork when a surface DOES opt in — the ability is intact', () => {
      expect(
        buildFastMoveLine({ san: 'Nd5', moverIsWhite: true, density: 'fast', tactics: [fork], volunteerBoardReading: true }),
      ).toBe('Knight on d5 forks queen on c7 and rook on f6.');
    });
  });

  it('flags a blunder with no motif', () => {
    expect(
      buildFastMoveLine({ san: 'Qh5', moverIsWhite: true, density: 'fast', classification: 'blunder' }),
    ).toBe('That drops material.');
  });

  it('stays silent on a routine move under fast density', () => {
    expect(
      buildFastMoveLine({ san: 'Nf3', moverIsWhite: true, density: 'fast', classification: 'good' }),
    ).toBe('');
  });

  it('dictates a routine move under full density', () => {
    expect(
      buildFastMoveLine({ san: 'Nf3', moverIsWhite: true, density: 'unlimited', classification: 'good' }),
    ).toBe('Knight to f3.');
  });

  it('dictates captures + checks under full density', () => {
    expect(
      buildFastMoveLine({ san: 'Bxf7+', moverIsWhite: true, density: 'unlimited' }),
    ).toBe('Bishop takes on f7, check.');
  });
});
