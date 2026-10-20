import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { NO_PROOF } from './proof';
import { decideTurn, STORY_LANE, DNA_BEAT, type LaneFact } from './learnTurnDoor';
import { onLearnTurn } from './coachDecisionEvents';

// THE OPENING'S STORY IN THE DOOR (OS-3, 2026-10-19). On a calm opening move
// the story is the teaching, each beat where it belongs in the turn — the
// crossroads in front of the student last; a verdict turn or a trade in
// progress keeps it for a calm move.
const board = new Chess();
for (const m of ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3']) board.move(m);
const FEN = board.fen();
const fact = (lane: LaneFact['lane'], text: string, squares: string[] = []): LaneFact => ({ lane, text, fen: FEN, squares, role: 'teach', proof: NO_PROOF.description });
const cost = fact(STORY_LANE['structure-cost'], "That's the price of …e5: no pawn of yours can cover d5 again, and their knight on c3 is one move from it.", ['d5', 'c3']);
const theirs = fact(STORY_LANE['their-setup'], "They've gone for the English Attack: in master games from here they usually castle long.");
const roads = fact(STORY_LANE.fork, 'A real crossroads: from here master games split into the Najdorf and the Scheveningen — each its own kind of position.');

describe('the opening story in the door', () => {
  it('every beat has a lane, and the crossroads is the last thing in a turn', () => {
    expect(DNA_BEAT[STORY_LANE.fork]).toBe('now');
    expect(DNA_BEAT[STORY_LANE['structure-cost']]).toBe('but');
    expect(DNA_BEAT[STORY_LANE.identity]).toBe('name');
  });
  it('a calm opening move speaks the story, the crossroads last', () => {
    const d = decideTurn([roads, theirs, cost], '', undefined, null, null, false, { kind: 'instant', ply: 12, moveCostCp: 0, midExchange: null });
    expect(d.spoke).toEqual(expect.arrayContaining([STORY_LANE['structure-cost'], STORY_LANE['their-setup'], STORY_LANE.fork]));
    const said = d.pkg.spoken;
    expect(said.indexOf('price of')).toBeLessThan(said.indexOf('English Attack'));
    expect(said.indexOf('English Attack')).toBeLessThan(said.indexOf('crossroads'));
  });
  it('a verdict turn keeps the story for a calm move; the price of the move rides with its verdict', () => {
    const d = decideTurn([roads, theirs, cost], '', undefined, null, null, false, { kind: 'late', ply: 12, moveCostCp: 300, midExchange: null });
    expect(d.spoke).not.toContain(STORY_LANE.fork);
    expect(d.spoke).not.toContain(STORY_LANE['their-setup']);
    expect(d.spoke).toContain(STORY_LANE['structure-cost']);
  });
  it('a trade in progress keeps the whole story, with the reason', () => {
    const rows: Array<{ heldWhy?: Record<string, string> }> = [];
    const off = onLearnTurn((r) => rows.push(r as { heldWhy?: Record<string, string> }));
    try {
      const d = decideTurn([roads, theirs, cost], '', undefined, null, null, false, { kind: 'instant', ply: 12, moveCostCp: 0, midExchange: 'd5' });
      expect(d.spoke).toEqual([]);
      expect(rows.at(-1)?.heldWhy?.[STORY_LANE.fork]).toBe('mid-exchange');
      expect(rows.at(-1)?.heldWhy?.[STORY_LANE['structure-cost']]).toBe('mid-exchange');
    } finally { off(); }
  });
});
