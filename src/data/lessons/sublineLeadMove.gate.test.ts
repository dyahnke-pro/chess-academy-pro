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
//   - "…" marks Black's moves only.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { _SUBLINE_NARRATION } from './sublineNarration';
import sublinesData from '../course-sublines.json';
import type { CourseSubline } from '../../services/openingCourse';

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

describe('subline narration names its own line', () => {
  it('every opening move is a move of the line, on its own ply, on the right side', { timeout: 120000 }, () => {
    expect(leadMoveViolations()).toEqual([]);
  });
});
