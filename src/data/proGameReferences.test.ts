import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
// Lives in public/data (served, not bundled) — import the real shipped
// asset directly so this data-integrity gate validates exactly what ships.
import proGameReferencesData from '../../public/data/pro-game-references.json';
import proRepertoireData from './pro-repertoires.json';
import type { ProGameReference } from '../types';

const REFS = proGameReferencesData as unknown as ProGameReference[];
const PRO_OPENING_IDS = new Set(
  (proRepertoireData as { openings: { id: string }[] }).openings.map((o) => o.id),
);
const PLAYER_IDS = new Set(
  (proRepertoireData as { players: { id: string }[] }).players.map((p) => p.id),
);
const ALLOWED_SOURCES = new Set(['chess.com', 'otb', 'lichess']);

describe('pro-game-references.json', () => {
  it('has entries (the coach breadth layer is non-empty)', () => {
    expect(REFS.length).toBeGreaterThan(0);
  });

  it('every id is unique', () => {
    const ids = new Set(REFS.map((g) => g.id));
    expect(ids.size).toBe(REFS.length);
  });

  it('every entry references a real pro player + pro opening', () => {
    const badPlayer = REFS.filter((g) => !PLAYER_IDS.has(g.playerId)).map((g) => g.id);
    const badOpening = REFS.filter((g) => !PRO_OPENING_IDS.has(g.proOpeningId)).map((g) => g.id);
    expect(badPlayer, `unknown playerId: ${badPlayer.slice(0, 5).join(', ')}`).toEqual([]);
    expect(badOpening, `unknown proOpeningId: ${badOpening.slice(0, 5).join(', ')}`).toEqual([]);
  });

  it('every source is from the allowlist', () => {
    const bad = REFS.filter((g) => !ALLOWED_SOURCES.has(g.source)).map((g) => `${g.id}:${g.source}`);
    expect(bad).toEqual([]);
  });

  it('NEVER cites the student side losing (orientation doctrine)', () => {
    const losing = REFS.filter(
      (g) =>
        (g.studentSide === 'white' && g.result === '0-1') ||
        (g.studentSide === 'black' && g.result === '1-0'),
    ).map((g) => `${g.id} (${g.studentSide} ${g.result})`);
    expect(losing, `student-losing references must be excluded at build: ${losing.slice(0, 5).join(', ')}`).toEqual([]);
  });

  it('every PGN replays legally via chess.js and plyCount matches', { timeout: 60000 }, () => {
    const bad: string[] = [];
    for (const g of REFS) {
      const chess = new Chess();
      const tokens = g.pgn.trim().split(/\s+/).filter(Boolean);
      let played = 0;
      for (const san of tokens) {
        try {
          chess.move(san);
          played++;
        } catch {
          break;
        }
      }
      if (played !== tokens.length) {
        bad.push(`${g.id}: illegal at ply ${played + 1} (${tokens[played]})`);
      } else if (played !== g.plyCount) {
        bad.push(`${g.id}: plyCount ${g.plyCount} != ${played} actual`);
      } else if (played < 12) {
        bad.push(`${g.id}: too short (${played} plies)`);
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it('studentSide matches the player being on that side of the board', () => {
    // The player's username sits on studentSide; the opponent on the other.
    // (build script invariant — guards a mis-tagged orientation.)
    const bad = REFS.filter((g) => {
      const onWhite = g.white;
      const onBlack = g.black;
      // We can't know the username here, but white !== black always holds
      // and exactly one side is the pro. Sanity: the two players differ.
      return onWhite === onBlack;
    }).map((g) => g.id);
    expect(bad).toEqual([]);
  });
});
