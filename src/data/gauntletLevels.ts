import type { GauntletLevel } from '../services/gauntletEngine';

// Queen's Gauntlet — the queen carves through a guarded army. Every move
// captures one enemy; land on a square a remaining enemy still defends
// and the queen is taken. The kid must find the safe capture order
// (take the undefended piece first to un-guard the rest).
//
// Every level here is verified winnable by gauntletEngine.isGauntletSolvable
// (gauntletLevels.test.ts) — never ship an unsolvable gauntlet.

export const QUEEN_GAUNTLET_LEVELS: GauntletLevel[] = [
  {
    id: 1,
    name: 'First Cut',
    hero: { type: 'queen', square: 'd4' },
    enemies: [
      { type: 'bishop', square: 'd7' }, // guards a4 and g4 — must fall first
      { type: 'rook', square: 'a4' },
      { type: 'knight', square: 'g4' },
    ],
    showGuarded: true,
  },
  {
    id: 2,
    name: 'Cross Guard',
    hero: { type: 'queen', square: 'e6' },
    enemies: [
      { type: 'knight', square: 'h3' },
      { type: 'rook', square: 'd7' },
      { type: 'knight', square: 'a6' },
      { type: 'bishop', square: 'a4' },
    ],
    showGuarded: true,
  },
  {
    id: 3,
    name: 'The Thicket',
    hero: { type: 'queen', square: 'e1' },
    enemies: [
      { type: 'rook', square: 'a6' },
      { type: 'bishop', square: 'f6' },
      { type: 'bishop', square: 'e2' },
      { type: 'rook', square: 'c4' },
      { type: 'knight', square: 'f1' },
    ],
    showGuarded: false,
  },
  {
    id: 4,
    name: 'The Whole Army',
    hero: { type: 'queen', square: 'g5' },
    enemies: [
      { type: 'rook', square: 'g6' },
      { type: 'knight', square: 'd3' },
      { type: 'knight', square: 'b5' },
      { type: 'knight', square: 'g3' },
      { type: 'knight', square: 'a6' },
      { type: 'knight', square: 'g8' },
    ],
    showGuarded: false,
  },
];
