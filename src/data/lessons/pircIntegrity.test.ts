import { describe, it, expect } from 'vitest';
import { Chess, type Square } from 'chess.js';
import type { LessonScript } from '../../types';
import repertoire from '../repertoire.json';
import { getLessonScript, getVariationLessonScript } from './index';

// The Pirc is a Watch course now (watch/pircDefence.ts, one beat a move). This
// test reads the lessons the app SERVES — the main line by opening id, a tab
// by `<openingId>::<tab>` — so it checks what the Openings tab plays, whatever
// file the beats are written in. The tabs are the opening's variations in
// repertoire.json: the names the page looks lessons up by.
const OPENING_ID = 'pirc-defence';
const entry = (repertoire as unknown as Array<{ id: string; pgn: string; variations?: Array<{ name: string; pgn: string }> }>).find((o) => o.id === OPENING_ID);
const tabs = entry?.variations ?? [];
const main = getLessonScript(OPENING_ID);
const served = tabs.map((t) => ({ tab: t.name, pgn: t.pgn, lesson: getVariationLessonScript(OPENING_ID, t.name) }));
const lessons: LessonScript[] = [main, ...served.map((s) => s.lesson)].filter((l): l is LessonScript => l !== null);

function fileRank(sq: string): [number, number] {
  return [sq.charCodeAt(0) - 97, Number(sq[1]) - 1];
}
function clearRay(c: Chess, from: string, to: string): boolean {
  const [ff, fr] = fileRank(from);
  const [tf, tr] = fileRank(to);
  const df = Math.sign(tf - ff);
  const dr = Math.sign(tr - fr);
  let f = ff + df, r = fr + dr;
  while (f !== tf || r !== tr) {
    const sq = (String.fromCharCode(97 + f) + String(r + 1)) as Square;
    if (c.get(sq)) return false;
    f += df; r += dr;
  }
  return true;
}
function sees(c: Chess, from: string, to: string): boolean {
  const pc = c.get(from as Square);
  if (!pc) return false;
  const [ff, fr] = fileRank(from);
  const [tf, tr] = fileRank(to);
  const adf = Math.abs(tf - ff), adr = Math.abs(tr - fr);
  switch (pc.type) {
    case 'n': return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
    case 'b': return adf === adr && adf > 0 && clearRay(c, from, to);
    case 'r': return ((adf === 0) !== (adr === 0)) && clearRay(c, from, to);
    case 'q': return (adf === adr || adf === 0 || adr === 0) && clearRay(c, from, to);
    case 'k': return adf <= 1 && adr <= 1;
    default: return false;
  }
}

describe('Pirc master-class integrity', () => {
  for (const lesson of lessons) {
    describe(lesson.title, () => {
      for (const beat of lesson.beats) {
        it(`${beat.id}: legal moves + valid arrows`, () => {
          const c = new Chess();
          for (const m of beat.moves) {
            const before = c.fen();
            try { c.move(m); } catch { /* surfaced below */ }
            expect(c.fen(), `illegal move "${m}" in ${beat.id}`).not.toBe(before);
          }
          for (const a of beat.arrows ?? []) {
            const pc = c.get(a.from as Square);
            expect(pc, `arrow origin ${a.from} empty in ${beat.id}`).toBeTruthy();
            expect(pc?.type, `pawn arrow from ${a.from} in ${beat.id}`).not.toBe('p');
            expect(sees(c, a.from, a.to), `blocked/invalid arrow ${a.from}->${a.to} in ${beat.id}`).toBe(true);
          }
        });
      }
    });
  }
});

describe('Pirc master-class tabs — every tab is served', () => {
  it('reads the real opening (the checks below are not vacuous)', () => {
    expect(entry, `${OPENING_ID} is not in repertoire.json`).toBeTruthy();
    expect(tabs.length).toBeGreaterThanOrEqual(8);
    expect(main, 'the main line has no served lesson').not.toBeNull();
    expect(main?.beats.at(-1)?.moves.join(' ')).toBe(entry?.pgn);
  });
  for (const { tab, pgn, lesson } of served) {
    it(`${tab}: has its own lesson, on the tab's line`, () => {
      expect(lesson, `no lesson is served for the tab "${tab}"`).not.toBeNull();
      const line = lesson?.beats.at(-1)?.moves.join(' ') ?? '';
      expect(`${line} `.startsWith(`${pgn} `), `"${tab}" plays ${line}, the tab's line is ${pgn}`).toBe(true);
    });
  }
});

describe('Pirc master-class orientation', () => {
  // The Pirc is a BLACK opening — the student always plays Black, so
  // every lesson must orient the board black-at-bottom.
  for (const lesson of lessons) {
    it(`${lesson.title}: student plays Black`, () => {
      expect(lesson.orientation, `${lesson.title} should orient Black`).toBe('black');
    });
  }
});
