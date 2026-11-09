// The heads `moveIntro` can open a move's sentence with, as regex source — so a
// test checks the seat, the move and what it does, never one fixed stem
// (David 2026-11-09: "mix up the phrasing whenever possible").
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PIECE: Record<string, string> = { N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };

function owned(seat: 'student' | 'opponent', san: string): string | null {
  const whose = seat === 'student' ? 'Your' : 'Their';
  const piece = /^([NBRQK])([a-h])?([1-8])?([a-h][1-8])(\+)?$/.exec(san);
  if (piece) return `${whose} ${piece[2] ? `${piece[2]}-` : ''}${PIECE[piece[1]]} goes to ${piece[4]}${piece[5] ? ' with check' : ''} and `;
  return /^[a-h][1-8]/.test(san) && !san.includes('x') ? `${whose} ${esc(san)} ` : null;
}

/** Any present-tense head for a verb-led predicate, ending where the predicate starts. */
export function introHead(seat: 'student' | 'opponent', san: string): string {
  const who = seat === 'student' ? 'You' : 'They';
  const heads = [`${who} play ${esc(san)}(?: — it|: it|\\. It)`, `${who} go ${esc(san)}, which`];
  const o = owned(seat, san);
  if (o) heads.push(esc(o).replace(/ $/, ''));
  return `(?:${heads.join('|')}) `;
}

/** Any present-tense head for a gerund list. */
export function introGerundHead(seat: 'student' | 'opponent', san: string): string {
  const who = seat === 'student' ? 'You' : 'They';
  return `(?:${who} play|${who} go) ${esc(san)}, `;
}

/** Any head a Review or lesson sentence about a move may open with, present
 *  or past, ending where the predicate starts — or a seat-free "X: it ". */
export const MOVE_HEAD = String.raw`(?:[^:.]+: it |(?:Your|Their) \S+ |(?:Your|Their) (?:[a-h]-)?(?:knight|bishop|rook|queen|king) (?:goes|went) to [a-h][1-8](?: with check)?,? and (?:it )?|(?:You|They) (?:play|played) \S+(?: — it|: it|\. It) |(?:You|They) (?:go|went for) \S+, which |(?:You|They) castled? (?:kingside|queenside)(?: — it|: it|\. It) )`;

/** Only the SEAT-STAMPED heads (no seat-free "X: it", no bare "Your X "
 *  piece phrase) — a move's own sentence, said by whose move it was. */
export const SEAT_MOVE_HEAD = String.raw`(?:(?:You|They) (?:play|played) \S+(?: —|:)|(?:You|They) (?:go|went for) \S+, |(?:Your|Their) (?:[a-h]-)?(?:knight|bishop|rook|queen|king) (?:goes|went) to [a-h][1-8]|(?:Your|Their) [a-h][1-8](?:=[QRBN])?\+? [a-z]|(?:You|They) castled? (?:kingside|queenside))`;
