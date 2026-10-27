// Gate: a subline narration names moves that happen in ITS line (WO-COURSE-01
// E, 2026-10-27). 154 spoken lines in 103 narrations opened with a move the
// line never plays — the Scotch …Nf6 reply narrated as "…Qh4, Steinitz's
// queen raid", an Alekhine line told "your …Bg4 pins", a Sicilian told to
// "strike with …g5" where it plays …Nh6: narration written for another line
// and bound to this one by its trigger move. They were retired; this keeps the
// class out.
//   - a beat that opens with a move names the move played on its own ply;
//   - an intro (and its cue) that opens with a move names a move of the line —
//     the reply, a move before it, or the plan it goes on to play;
//   - "…" marks Black's moves only;
//   - "your X on SQ" / "their SQ-X" is the right seat's piece (20 narrations
//     talked to a Black French student about "your d4-pawn" and coached the
//     Black side of a White Smith-Morra — retired 2026-10-27). The piece may be
//     on that square a few moves either side of the beat, since a sentence
//     recounts or looks ahead.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { _SUBLINE_NARRATION } from './sublineNarration';
import sublinesData from '../course-sublines.json';
import type { CourseSubline } from '../../services/openingCourse';
import repertoire from '../repertoire.json';
import proRepertoires from '../pro-repertoires.json';
import gambits from '../gambits.json';
import antiOpenings from '../anti-openings.json';

const SUBS = sublinesData as Record<string, Record<string, CourseSubline[] | undefined> | undefined>;
const LEAD = /^(…|\.\.\.)?\s*((?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8]|[a-h][1-8]|O-O(?:-O)?)(?:=[QRBN])?)(?=[\s,.!?—+#:;]|$)/;

export function leadMoveViolations(): string[] {
  const out: string[] = [];
  for (const [key, n] of Object.entries(_SUBLINE_NARRATION)) {
    const m = /^(.+)::(-?\d+)::(.+)@(\d+)$/.exec(key);
    if (!m) continue;
    const sub = SUBS[m[1]]?.[m[2]]?.find((s) => s.triggerMove === m[3] && s.atPly === Number(m[4]));
    if (!sub) continue;
    const c = new Chess();
    const sans = sub.moves.map((x) => c.move(x).san.replace(/[+#]/g, ''));
    const units: Array<[string, string | undefined, number | null]> = [
      ['intro', n.intro.say, null],
      ['intro (short)', n.intro.sayShort, null],
      ...(n.beats ?? []).flatMap((b): Array<[string, string | undefined, number | null]> => [
        [`beat@${b.atMove}`, b.say, b.atMove],
        [`beat@${b.atMove} (short)`, b.sayShort, b.atMove],
      ]),
    ];
    for (const [unit, text, ply] of units) {
      const lead = text ? LEAD.exec(text.trim()) : null;
      if (!lead) continue;
      const said = lead[2];
      const black = !!lead[1];
      const plies = ply === null ? sans.map((_, i) => i) : [ply];
      const sameSide = plies.find((p) => sans[p] === said && (p % 2 === 1) === black);
      const any = plies.find((p) => sans[p] === said);
      if (sameSide !== undefined) continue;
      if (any === undefined) out.push(`${key} ${unit}: opens with ${black ? '…' : ''}${said}, which the line never plays${ply === null ? '' : ` (it plays ${sans[ply]})`}`);
      else if (black) out.push(`${key} ${unit}: "…${said}" marks a White move as Black's`);
    }
  }
  return out;
}

const COLOR = new Map<string, string>();
const gambitList = (Array.isArray(gambits) ? gambits : Object.values(gambits as Record<string, unknown>)) as Array<{ id?: string; color?: string }>;
for (const list of [repertoire, (proRepertoires as { openings: unknown[] }).openings, gambitList, antiOpenings] as Array<Array<{ id?: string; color?: string }>>) {
  for (const o of list) if (o?.id) COLOR.set(o.id, o.color ?? 'white');
}
const PIECE: Record<string, string> = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k', pawn: 'p' };
const SEAT = [
  { re: /\b(your|their) ([a-h][1-8])-(knight|bishop|rook|queen|king|pawn)\b/gi, sq: 2, piece: 3 },
  { re: /\b(your|their) (knight|bishop|rook|queen|king|pawn) on ([a-h][1-8])\b/gi, sq: 3, piece: 2 },
];

export function seatViolations(): string[] {
  const out: string[] = [];
  for (const [key, n] of Object.entries(_SUBLINE_NARRATION)) {
    const m = /^(.+)::(-?\d+)::(.+)@(\d+)$/.exec(key);
    if (!m) continue;
    const sub = SUBS[m[1]]?.[m[2]]?.find((s) => s.triggerMove === m[3] && s.atPly === Number(m[4]));
    if (!sub) continue;
    const me = COLOR.get(m[1]) === 'black' ? 'b' : 'w';
    const units: Array<[string, string | undefined, number]> = [
      ['intro', n.intro.say, sub.atPly],
      ...(n.beats ?? []).map((b): [string, string, number] => [`beat@${b.atMove}`, b.say, b.atMove]),
    ];
    // every board of the line, built once; a unit reads its window of it
    let all: Chess[] | null = null;
    for (const [unit, text, ply] of units) {
      if (!text || !/\b(?:your|their)\b/i.test(text)) continue;
      if (!all) { const c = new Chess(); all = sub.moves.map((x) => { c.move(x); return new Chess(c.fen()); }); }
      const boards = all.slice(Math.max(0, ply - 3), ply + 7);
      for (const { re, sq: si, piece: pi } of SEAT) {
        for (const mm of text.matchAll(re)) {
          const sq = mm[si].toLowerCase() as Parameters<Chess['get']>[0];
          const piece = PIECE[mm[pi].toLowerCase()];
          const want = mm[1].toLowerCase() === 'your' ? me : me === 'w' ? 'b' : 'w';
          const right = boards.some((b) => { const q = b.get(sq); return !!q && q.type === piece && q.color === want; });
          const wrong = boards.some((b) => { const q = b.get(sq); return !!q && q.type === piece && q.color !== want; });
          if (!right && wrong) out.push(`${key} ${unit}: "${mm[0]}" names the other side's ${mm[pi].toLowerCase()} on ${sq}`);
        }
      }
    }
  }
  return out;
}

describe('subline narration names its own line', () => {
  it('every opening move is a move of the line, on its own ply, on the right side', { timeout: 120000 }, () => {
    expect(leadMoveViolations()).toEqual([]);
  });

  it('every "your" piece is yours and every "their" piece is theirs', { timeout: 120000 }, () => {
    expect(seatViolations()).toEqual([]);
  });
});
