#!/usr/bin/env node
/**
 * Adds modern static one-sentence definitions to concepts that
 * had no book passages (mostly modern named patterns like Lucena,
 * Vancura, minority attack, smothered mate — terminology absent
 * from pre-1929 Gutenberg classics).
 *
 * The definitions are universal chess knowledge (named patterns
 * with concrete characteristics) — no attribution needed since
 * concept definitions aren't copyrightable.
 *
 * Static definitions are MARKED so the coach knows to credit
 * "modern definition" rather than book quote.
 */

import { readFile, writeFile } from 'node:fs/promises';

const PATH = 'src/data/chess-concepts.json';

const STATIC = {
  'pawn-hanging': "Two friendly pawns on adjacent half-open files (typically c- and d- files) with no own pawns flanking them. Strong attackers when mobile, weak targets when blockaded.",
  'pawn-majority': "More pawns on one wing than your opponent has on that wing. Creates a candidate passed pawn after exchanges — the side with the queenside majority typically aims to push it.",
  'pawn-minority-attack': "A side with fewer queenside pawns advances them anyway, aiming to trade off and leave the opponent with a weak isolated or backward pawn on the open file. Classic plan against the Carlsbad pawn structure (QGD Exchange variation).",
  'pawn-fianchetto': "A bishop developed to b2/g2 (White) or b7/g7 (Black) behind the b- or g-pawn. The bishop's diagonal reaches deep into the opponent's position; the structure also screens the king after kingside castling.",
  'end-triangulation': "A king maneuver that loses a tempo on purpose, traveling around three squares (forming a triangle) to put the opponent in zugzwang on the same position.",
  'end-zugzwang': "A position where any move worsens the side-to-move's position — being forced to move IS the disadvantage. Most common in pawn endings.",
  'end-key-squares': "The squares the stronger side's king must reach (in K+P vs K) to guarantee promotion. With pawns on the 5th/6th rank, key squares are typically the three squares two ranks ahead.",
  'end-philidor': "K+R+P vs K+R drawing technique: the weaker side's rook stays on the 3rd rank (or 6th from Black's view) to block the stronger king from advancing, then drops to the back rank only after the pawn advances.",
  'end-vancura': "K+R+P (a-pawn or h-pawn) vs K+R drawing technique: the defending rook attacks the rook pawn from the side along the 3rd rank, then shuffles between f6/g6/h6 — opposite-color flank pinning prevents the stronger side from making progress.",
  'end-mate-bn': "K+B+N vs K mate — must drive the lone king into the corner of the bishop's color (light or dark). Knight + bishop coordinate to herd along the W-shape or 'magic square' path.",
  'end-mate-q-vs-r': "K+Q vs K+R mating technique: keep the queen on the rim cutting off the king, force the defender's king onto a corner side, then snake-attack the rook with the queen until it's trapped or won by skewer.",
  'mate-anastasia': "Knight + rook coordinate to trap the enemy king on the edge: the knight covers the squares one over (typically e7 from a back-rank perspective), the rook delivers mate along the h-file. Named after Anastasia und das Schachspiel (1803).",
  'mate-boden': "Two bishops on intersecting diagonals deliver mate to a king castled long, often after the c-file and a-file pawns have been removed. Classic finish in Greco-style attacks.",
  'mate-damiano': "Queen + pawn (or queen + king) mate on h7/h2 after a sacrifice on h-file forces the king's pawn cover open. Named after Pedro Damiano (16th century).",
  'mate-legal': "Queen sacrifice in the opening (Légal de Kermeur, 1750): White plays Nxe5 ignoring Black's pin on the knight via Bg4, then after Bxd1 (winning the queen), the sequence Bxf7+ Ke7 Nd5# (or similar) checkmates with two minor pieces + pawn.",
  'mate-smothered': "Knight delivers mate to a king whose own pieces block all its escape squares. Classic pattern: queen sacrifice on a corner pushes the king into the corner where the knight forks K+Q.",
  'mate-back-rank': "Rook or queen mates a king on its first rank whose own pawns block escape upward. Defended by 'luft' — moving a pawn next to the castled king to give the king a flight square.",
  'mate-scholars': "1.e4 e5 2.Bc4 (or Qh5) Nc6 3.Qh5 (or Bc4) Nf6?? 4.Qxf7# — the queen + bishop battery on f7 mates an undefended pawn. The classic 'four-move' mate beginners learn to avoid.",
  'tac-skewer': "Like a pin but in reverse — a higher-value piece is attacked along a line, and when it moves, a lesser piece behind it is captured. Rook skewers king + queen along a file is the canonical example.",
  'tac-deflection': "Forcing a defending piece away from a square or piece it was protecting. Often via a check, capture, or threat the defender must respond to.",
  'tac-overloaded': "A piece tasked with too many defensive duties. Threatening one duty forces it to abandon another. Attack with a capture or check that exploits the piece's split focus.",
  'tac-xray': "An attack where a piece's threat passes through (or is exposed by removing) another piece on the same line. Often used with batteries (queen + bishop, queen + rook).",
  'tac-zwischen': "An 'in-between' move that interpolates a stronger threat into what looked like a forced sequence. Tactical key: a tempo-gaining move (check, capture, or large threat) that has to be answered before the opponent can complete their plan.",
  'tac-trap': "A move that looks natural for the opponent but loses material to a hidden refutation within ~3 plies. Examples: Légal's Mate, Stafford 'Oh No My Queen', Englund Gambit Nxd5 trap, Noah's Ark Trap.",
  'pos-centralization': "Placing pieces (especially knights and king in the endgame) on central squares (d4, d5, e4, e5) where they control more squares than from the edge. A piece's value rises with its mobility.",
  'pos-outpost': "A square in the opponent's territory protected by a friendly pawn that the opponent cannot easily challenge with a pawn. Knights are the ideal outpost occupants — bishops on outposts are less effective.",
  'pos-bishop-pair': "Two friendly bishops vs one bishop + one knight (or two knights). The pair covers all square colors; the imbalance favors the side with both bishops, especially in open positions.",
  'pos-prophylaxis': "Making a move that prevents the opponent's plan before it starts, rather than executing your own plan. Nimzowitsch's contribution to positional theory — 'before you do anything else, anticipate what the opponent wants and stop it'.",
  'pos-space': "Controlling more squares in the opponent's half. Quantified by counting pawns past the 4th rank. The side with more space has more room to maneuver, but cramped opponents can be hard to break.",
  'att-queenside-attack': "Pawn storm and piece pressure on the queenside (a/b/c files). Common in closed positions where the opponent's king has castled kingside — attacker advances pawns to open lines toward the enemy king or weaken its support structure.",
  'att-exchange-sac': "Giving up a rook for a minor piece (typically bishop or knight) to gain a positional advantage — open files, color complex domination, or breaking the opponent's coordination. Petrosian's specialty.",
};

const data = JSON.parse(await readFile(PATH, 'utf-8'));

let added = 0;
for (const c of data.concepts) {
  if (c.passages.length > 0) continue;
  const def = STATIC[c.id];
  if (def) {
    c.fallbackDefinition = def;
    c.fallbackKind = 'modern-definition';
    added++;
  }
}

await writeFile(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`added static fallback definitions to ${added} concepts`);
console.log(`concepts with EITHER passages or fallback: ${data.concepts.filter(c => c.passages.length || c.fallbackDefinition).length}/${data.concepts.length}`);
const stillEmpty = data.concepts.filter(c => !c.passages.length && !c.fallbackDefinition).map(c => c.id);
if (stillEmpty.length) console.log(`still empty: ${stillEmpty.join(', ')}`);
