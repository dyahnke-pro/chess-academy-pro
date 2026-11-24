// endgameDefenderRules — THE DEFENDER'S RULES, BY ENDING CLASS, AS DATA
// (docs/plans/2026-11-23-learn-mistakes-only.md, "Missing items":
// `conceptEngine.DEFENDER_PRINCIPLE` covers only mating material and pieces
// against pawns). Each class the defending side can meet names the rules that
// hold it — ids only, no words: the one renderer words them, and the record
// keys a defender's mistake to the rule it broke. A new ending class fails to
// compile until it is given its rules (empty where the class has no defence
// to teach: the side with the pieces is the one to move).
//
// The rules are the standard defensive technique of each ending (Capablanca,
// Chess Fundamentals; Dvoretsky's endgame canon) — the board test that a rule
// applies is the renderer's to call, not this table's.
import type { MatchupClass } from './endgameMatchup';

export type DefenderRuleId =
  // King and pawn
  | 'king-in-front-of-pawn'
  | 'take-the-opposition'
  | 'stay-in-the-square'
  // Rook endings
  | 'philidor-third-rank'
  | 'checks-from-behind'
  | 'checking-distance'
  | 'rook-behind-passer'
  | 'king-to-the-short-side'
  | 'vancura-flank'
  // Queen endings
  | 'perpetual-check'
  | 'king-near-the-queening-square'
  // Queen against rook
  | 'rook-close-to-king'
  | 'stalemate-resource'
  // Minor-piece endings
  | 'blockade-on-the-other-colour'
  | 'fortress-wrong-bishop'
  | 'pawns-off-the-bishop-colour'
  | 'knight-blockades-passer'
  | 'trade-the-last-pawns'
  // Rook against minor
  | 'minor-beside-its-king'
  | 'king-to-the-safe-corner';

/** The rules that hold each ending for the defending side, most decisive
 *  first. Exhaustive over `MatchupClass`. */
export const DEFENDER_RULES: Record<MatchupClass, readonly DefenderRuleId[]> = {
  'kp-vs-k': ['king-in-front-of-pawn', 'take-the-opposition', 'stay-in-the-square'],
  'pawn-endgame': ['take-the-opposition', 'stay-in-the-square'],
  'rook-endgame': ['philidor-third-rank', 'checks-from-behind', 'checking-distance', 'rook-behind-passer', 'king-to-the-short-side', 'vancura-flank'],
  'queen-endgame': ['perpetual-check', 'king-near-the-queening-square'],
  'queen-vs-rook': ['rook-close-to-king', 'stalemate-resource'],
  'pieces-vs-pawns': [],
  'rook-vs-minor': ['minor-beside-its-king', 'king-to-the-safe-corner'],
  'opposite-bishops': ['blockade-on-the-other-colour', 'pawns-off-the-bishop-colour'],
  'same-bishops': ['pawns-off-the-bishop-colour', 'blockade-on-the-other-colour'],
  'bishop-vs-knight': ['knight-blockades-passer', 'trade-the-last-pawns'],
  'knight-endgame': ['knight-blockades-passer', 'king-in-front-of-pawn'],
  'minor-endgame': ['trade-the-last-pawns', 'fortress-wrong-bishop'],
  'rook-and-minor': ['rook-behind-passer', 'trade-the-last-pawns'],
  'major-piece': ['perpetual-check', 'rook-behind-passer'],
  'mating-material': [],
  complex: [],
  'non-endgame': [],
};

/** The named technique behind each rule (a book name, never a sentence), for
 *  the renderer and the record. */
export const DEFENDER_RULE_TECHNIQUE: Record<DefenderRuleId, string> = {
  'king-in-front-of-pawn': 'king in front of the pawn',
  'take-the-opposition': 'the opposition',
  'stay-in-the-square': 'the square of the pawn',
  'philidor-third-rank': 'Philidor position',
  'checks-from-behind': 'checks from behind',
  'checking-distance': 'checking distance',
  'rook-behind-passer': 'rook behind the passed pawn',
  'king-to-the-short-side': 'short side defence',
  'vancura-flank': 'Vancura position',
  'perpetual-check': 'perpetual check',
  'king-near-the-queening-square': 'king near the queening square',
  'rook-close-to-king': 'rook near its king',
  'stalemate-resource': 'stalemate resource',
  'blockade-on-the-other-colour': 'blockade on the other colour',
  'fortress-wrong-bishop': 'wrong bishop fortress',
  'pawns-off-the-bishop-colour': 'pawns off the bishop colour',
  'knight-blockades-passer': 'knight blockade',
  'trade-the-last-pawns': 'trade the last pawns',
  'minor-beside-its-king': 'minor beside its king',
  'king-to-the-safe-corner': 'the safe corner',
};
