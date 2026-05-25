import { Chess } from 'chess.js';
import { readFileSync, writeFileSync } from 'node:fs';
function build(prefix, lineMoves) {
  const c = new Chess();
  for (const m of prefix.split(' ')) { const b = c.fen(); c.move(m); if (c.fen() === b) throw new Error('illegal prefix ' + m); }
  const fen = c.fen(); const sans = [];
  for (const m of lineMoves) { const b = c.fen(); const r = c.move(m); if (!r || c.fen() === b) throw new Error('illegal line move ' + m + ' from ' + c.fen()); sans.push(r.san); }
  return { fen, moves: sans };
}
const S = 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5';
const PLANS = [
  { id: 'mp-siciliansveshnikov-main', title: 'Sveshnikov: the f5 Break and Two Bishops',
    overview: "The Sveshnikov's defining plan: with the dark-squared bishop active and the centre fixed, Black strikes f5 to blast open lines and let the two bishops breathe past the d5-knight.",
    pawnBreaks: [{ move: 'f5', explanation: 'The f5 break opens the position for Black\'s bishop pair.' }],
    pieceManeuvers: [{ piece: 'Bishop', route: 'Bf6-g5', explanation: 'The dark-squared bishop relocates to g5 and the kingside.' }],
    strategicThemes: ['f5 is the thematic freeing break.', 'The two bishops outgun the d5-knight.', 'Play on the half-open c-file.'],
    endgameTransitions: ['The bishop pair tells in an open endgame.'],
    prefix: `${S} Nd5 Be7 Bxf6 Bxf6 c3 O-O Nc2`,
    line: ['Bg5', 'Qd3', 'f5', 'exf5', 'Bxf5'],
    annotations: ['Bg5 — the bishop swings to the kingside.', 'Qd3 — White eyes the f5-square.', 'f5 — the thematic break opens the position.', 'exf5 — White takes; lines open.', 'Bxf5 — the light bishop joins, both bishops alive.'] },
  { id: 'mp-siciliansveshnikov-9bxf6', title: '9.Bxf6: Doubled Pawns, Roaring Bishops',
    overview: "After the early exchange Black's pawns are doubled, but the bishop pair, the open g-file and the e5/f5 duo give ferocious activity — trade the d5-knight and roll the f-pawn.",
    pawnBreaks: [{ move: 'f4', explanation: 'After f5, the f4 push gains kingside space and attacking lines.' }],
    pieceManeuvers: [{ piece: 'Bishop', route: 'Be6xd5', explanation: 'Trade off the strong d5-knight.' }],
    strategicThemes: ['The bishop pair pays for the doubled pawns.', 'Trade the d5-knight.', 'Roll the f-pawn for the attack.'],
    endgameTransitions: ['The bishops dominate once lines open.'],
    prefix: `${S} Bxf6 gxf6 Nd5 f5 Bd3 Be6`,
    line: ['Qh5', 'Bg7', 'O-O', 'Bxd5', 'exd5', 'f4'],
    annotations: ['Qh5 — White probes the loose kingside.', 'Bg7 — the bishop rakes the long diagonal.', 'O-O — White tucks the king away.', 'Bxd5 — Black trades the strong knight.', 'exd5 — White recaptures.', 'f4 — the f-pawn rolls, gaining space.'] },
  { id: 'mp-siciliansveshnikov-chelyabinsk', title: 'Chelyabinsk: Challenge the c4 Bind',
    overview: "Against the c4 bind Black jabs with b4, claims the c5 outpost, supports it with a5, and challenges the d5-knight with Be6 — the two bishops fighting the clamp.",
    pawnBreaks: [{ move: 'a5', explanation: 'a5 cements the b4-pawn and the queenside space.' }],
    pieceManeuvers: [{ piece: 'Bishop', route: 'Bc8-e6', explanation: 'The bishop challenges the d5-knight.' }],
    strategicThemes: ['b4 challenges the bind at once.', 'The c5 outpost is Black\'s.', 'Two bishops vs the clamp.'],
    endgameTransitions: ['If the bind cracks, the bishops take over.'],
    prefix: `${S} Nd5 Be7 Bxf6 Bxf6 c4 b4 Nc2`,
    line: ['O-O', 'Be2', 'Be6', 'O-O', 'a5'],
    annotations: ['O-O — Black completes development.', 'Be2 — White develops toward the bind.', 'Be6 — the bishop challenges the d5-knight.', 'O-O — White castles.', 'a5 — Black cements b4 and the queenside.'] },
  { id: 'mp-siciliansveshnikov-antisvesh', title: 'Anti-Sveshnikov: Free, Equal Development',
    overview: "Against the quiet 6.Nf3 Black develops actively, trades on e3 to deny White any edge, and challenges the centre with Be6 — a comfortable, fully equal game.",
    pawnBreaks: [{ move: 'd5 (eventual)', explanation: 'With easy development Black can aim for a later d5 break.' }],
    pieceManeuvers: [{ piece: 'Bishop', route: 'Bf8-c5xe3', explanation: 'Develop actively and trade off White\'s dark bishop.' }],
    strategicThemes: ['Active development, no theory needed.', 'Trade on e3 to neutralise White.', 'Challenge the centre with Be6.'],
    endgameTransitions: ['Symmetrical and equal into the endgame.'],
    prefix: `e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Nf3 h6 Bc4 Be7 O-O O-O`,
    line: ['Qe2', 'Bc5', 'Be3', 'Bxe3', 'Qxe3', 'd6'],
    annotations: ['Qe2 — White develops quietly.', 'Bc5 — Black develops with bite.', 'Be3 — White offers a trade.', 'Bxe3 — Black takes off the dark bishop.', 'Qxe3 — White recaptures, no edge.', 'd6 — free the bishop; Black is fully equal.'] },
  { id: 'mp-siciliansveshnikov-kalashnikov', title: 'Kalashnikov: Seize the d4 Outpost',
    overview: "In the Kalashnikov bind Black completes development, takes the half-open c-file with Rc8, and plants a knight on the d4 outpost — full counterplay against White's space.",
    pawnBreaks: [{ move: 'f5 (eventual)', explanation: 'Once placed, Black aims for the f5 or b5 break.' }],
    pieceManeuvers: [{ piece: 'Knight', route: 'Nc6-d4', explanation: 'The knight seizes the d4 outpost.' }],
    strategicThemes: ['Take the half-open c-file.', 'Plant a knight on d4.', 'Break with f5 or b5 for counterplay.'],
    endgameTransitions: ['The d4 outpost anchors Black\'s game.'],
    prefix: `e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e5 Nb5 d6 c4 Be7 N1c3 a6 Na3 Be6 Nc2 Nf6 Be2 Rc8`,
    line: ['O-O', 'O-O', 'Ne3', 'Nd4'],
    annotations: ['O-O — White castles.', 'O-O — Black castles, fully developed.', 'Ne3 — White reroutes the knight.', 'Nd4 — Black seizes the d4 outpost.'] },
];
const out = [];
for (const p of PLANS) {
  const { fen, moves } = build(p.prefix, p.line);
  if (moves.length !== p.annotations.length) throw new Error(`${p.id}: ${moves.length} vs ${p.annotations.length}`);
  out.push({ id: p.id, openingId: 'sicilian-sveshnikov', title: p.title, criticalPositionFen: fen, overview: p.overview,
    pawnBreaks: p.pawnBreaks.map((pb) => ({ ...pb, fen })), pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes, endgameTransitions: p.endgameTransitions,
    playableLines: [{ title: p.title, fen, moves, annotations: p.annotations, arrows: moves.map(() => []), highlights: moves.map(() => []) }] });
  console.log(`${p.id}: ok ${moves.length} moves`);
}
const path = 'src/data/middlegame-plans.json';
const existing = JSON.parse(readFileSync(path, 'utf-8')).filter((p) => p.openingId !== 'sicilian-sveshnikov');
writeFileSync(path, JSON.stringify([...existing, ...out], null, 2) + '\n');
console.log(`merged ${out.length} sveshnikov plans`);
