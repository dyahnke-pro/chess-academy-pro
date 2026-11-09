// The heads `moveIntro` can open a move's sentence with, as regex source — so a
// test checks the seat, the move and what it does, never one fixed stem
// (David 2026-11-09: "mix up the phrasing whenever possible").
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function owned(seat: 'student' | 'opponent', san: string): string | null {
  const whose = seat === 'student' ? 'Your' : 'Their';
  return /^[a-h][1-8](?:=[QRBN])?\+?$/.test(san) ? `${whose} ${esc(san)} ` : null;
}

/** Any head for a verb-led predicate in the surface's tense (\`moveIntro\`:
 *  a lesson or a question shows the move, 'now'; Review says a move already
 *  played, 'past'), ending where the predicate starts. */
export function introHead(seat: 'student' | 'opponent', san: string, tense: 'now' | 'past'): string {
  const who = seat === 'student' ? 'You' : 'They';
  if (tense === 'past') return `(?:${who} played ${esc(san)}(?: — it|: it|\\. It)|${who} went for ${esc(san)}, which) `;
  const heads = [`${who} play ${esc(san)}(?: — it|: it|\\. It)`, `${who} go ${esc(san)}, which`];
  const o = owned(seat, san);
  if (o) heads.push(esc(o).replace(/ $/, ''));
  return `(?:${heads.join('|')}) `;
}

/** Any head for a gerund list, in the surface's tense. */
export function introGerundHead(seat: 'student' | 'opponent', san: string, tense: 'now' | 'past'): string {
  const who = seat === 'student' ? 'You' : 'They';
  return tense === 'past' ? `(?:${who} played|${who} went for) ${esc(san)}, ` : `(?:${who} play|${who} go) ${esc(san)}, `;
}

/** Any head a Review or lesson sentence about a move may open with, present
 *  or past, ending where the predicate starts — or a seat-free "X: it ". */
export const MOVE_HEAD = String.raw`(?:[^:.]+: it |(?:Your|Their) \S+ |(?:You|They) (?:play|played) \S+(?: — it|: it|\. It) |(?:You|They) (?:go|went for) \S+, which |(?:You|They) castled? (?:kingside|queenside)(?: — it|: it|\. It) )`;

/** Only the SEAT-STAMPED heads (no seat-free "X: it", no bare "Your X "
 *  piece phrase) — a move's own sentence, said by whose move it was. */
export const SEAT_MOVE_HEAD = String.raw`(?:(?:You|They) (?:play|played) \S+(?: —|:)|(?:You|They) (?:go|went for) \S+, |(?:Your|Their) [a-h][1-8](?:=[QRBN])?\+? [a-z]|(?:You|They) castled? (?:kingside|queenside))`;
