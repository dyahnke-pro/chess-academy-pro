import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

// 2 student-side wins per opening, picked from the deep files. Hand-authored
// overviews (no boilerplate). [openingId, deepFile, opponentName, tag]
const PICKS = [
  ['pro-caruana-ruy-lopez', 'caruana-ruy-lopez-berlin-d3', 'Abund', 'a'],
  ['pro-caruana-ruy-lopez', 'caruana-ruy-lopez-morphy-a6', 'Salem-AR', 'b'],
  ['pro-caruana-nimzo-indian', 'caruana-nimzo-indian-classical-oo', 'mishanick', 'a'],
  ['pro-caruana-nimzo-indian', 'caruana-nimzo-indian-classical-oo', 'michaelq2d5', 'b'],
  ['pro-caruana-najdorf', 'caruana-najdorf-english-be3', 'hansen', 'a'],
  ['pro-caruana-najdorf', 'caruana-najdorf-classical-be2', 'KChor05', 'b'],
  ['pro-caruana-taimanov', 'caruana-taimanov-main-nc6', 'rpragchess', 'a'],
  ['pro-caruana-taimanov', 'caruana-taimanov-main-nc6', 'daro94', 'b'],
  ['pro-caruana-italian', 'caruana-italian-two-knights', 'Firouzja2003', 'a'],
  ['pro-caruana-italian', 'caruana-italian-pianissimo', 'michaelq2d5', 'b'],
  ['pro-caruana-french', 'caruana-french-classical-be7', 'ilqar_74', 'a'],
  ['pro-caruana-french', 'caruana-french-winawer', 'ArtemDyachuk', 'b'],
  ['pro-caruana-caro-kann', 'caruana-caro-kann-two-knights-bg4', 'Nitzan_Steinberg', 'a'],
  ['pro-caruana-caro-kann', 'caruana-caro-kann-advance-bf5', 'Good_Knight_Kiss', 'b'],
  ['pro-caruana-kid', 'caruana-kid-classical-e4', 'rpragchess', 'a'],
  ['pro-caruana-kid', 'caruana-kid-fianchetto', 'DenLaz', 'b'],
];

const OVERVIEWS = {
  'pro-caruana-ruy-lopez|a': "Caruana grinds down a 2764 in his signature d3 Ruy: Bxc6 doubles the pawns, then patient maneuvering — Nb3, a4 — presses the queenside weakness. A 163-move technical masterclass converting a tiny structural edge.",
  'pro-caruana-ruy-lopez|b': "Caruana's Closed Ruy against Salem (2689): Ba4 keeps the pin, a4 and a5 clamp the queenside, and the rich classical middlegame unfolds exactly as he likes it — slow plans, a fixed target, a precise conversion.",
  'pro-caruana-nimzo-indian|a': "Caruana beats a 3003 with the Black Nimzo: the Bb4 pin, the trade on c3 to double White's pawns, then active piece play against the damaged structure converts over 102 moves — the soundest defence in expert hands.",
  'pro-caruana-nimzo-indian|b': "Another Black Nimzo win for Caruana: the Bb4 pin and the c3 trade wreck White's queenside, and harmonious development with active pieces converts the structural edge.",
  'pro-caruana-najdorf|a': "Caruana dismantles hansen (3058) in the English Attack Najdorf: …e5 grabs the centre, …Be6 contests d5, and counterplay on the queenside and the half-open c-file decides against a 3000+ opponent.",
  'pro-caruana-najdorf|b': "Caruana's Najdorf against the quiet Be2: the principled …e5, harmonious development, and the …Bxd5 outpost trade lead to a 124-move grind where his sound structure tells.",
  'pro-caruana-taimanov|a': "Caruana dismantles a 3185 with the Taimanov: …Nc6 pressures the centre, after the knight trade he gets the half-open b-file and active bishops, and the …d5 break frees a dynamic game against elite opposition.",
  'pro-caruana-taimanov|b': "Caruana's Taimanov against daro94: the flexible …e6/…Nc6 setup, the …d5 strike, and queenside play down the half-open b-file bring home a smooth win.",
  'pro-caruana-italian|a': "Caruana outplays Firouzja (2859) in his modern Pianissimo: c3/d3, the slow Re1/b4 squeeze, and the Bxe6 structural press — a 123-move strategic win over a future World Championship challenger.",
  'pro-caruana-italian|b': "Caruana's Giuoco Pianissimo against michaelq2d5: patient maneuvering with a4, Nbd2, and the bishop reroute, building a small lasting pull into a 149-move technical conversion.",
  'pro-caruana-french|a': "Caruana beats ilqar_74 (3043) with the Black French: the Classical Steinitz with …Be7, …Nfd7, and the …c5 break against the pawn chain, then a 132-move grind where the sound structure decides.",
  'pro-caruana-french|b': "Caruana's Winawer French: …Bb4 pins and …Bxc3 doubles White's pawns, then a raging counterattack down the c-file against the shattered queenside brings a quick win.",
  'pro-caruana-caro-kann|a': "Caruana grinds down Nitzan_Steinberg (2958) in the Caro Two Knights: …Bg4 develops the light bishop, the solid wall holds, and a 162-move technical battle goes his way — the Caro's soundness rewarded.",
  'pro-caruana-caro-kann|b': "Caruana's Caro Advance against Good_Knight_Kiss: …Bf5 frees the light bishop outside the chain, …c5 challenges the centre, and active piece play converts.",
  'pro-caruana-kid|a': "Caruana beats rpragchess (3190) with the Black King's Indian: …e5 strikes the centre, …a5 grabs queenside space, and the thematic kingside storm decides against a 3190 opponent.",
  'pro-caruana-kid|b': "Caruana's Fianchetto King's Indian against DenLaz (3100): the …c6/…Qb6 setup, the central tension, and dynamic piece play down the long diagonal bring home a 106-move win.",
};

function strip(pgn) {
  const body = pgn.replace(/\[[^\]]*\]/g, '').replace(/\{[^}]*\}/g, '').replace(/\d+\.(\.\.)?/g, ' ').replace(/\s+/g, ' ').trim();
  const c = new Chess(); const mv = [];
  for (const t of body.split(' ').filter(Boolean)) { if (/^(1-0|0-1|1\/2|\*)$/.test(t)) break; try { c.move(t); mv.push(t); } catch { break; } }
  return mv;
}

const out = [];
for (const [oid, file, oppName, tag] of PICKS) {
  const d = JSON.parse(readFileSync('data/sources/fabianocaruana-deep/' + file + '.json', 'utf8'));
  const wins = (d.topModelGames || []).filter((g) => g.outcome === 'win');
  const g = oppName ? wins.find((x) => x.opponent === oppName) : wins[0];
  if (!g) { console.error('SKIP ' + oid + '|' + tag + ' — no win for ' + oppName); continue; }
  const wm = g.pgn.match(/\[White "([^"]+)"/); const bm = g.pgn.match(/\[Black "([^"]+)"/);
  const weM = g.pgn.match(/\[WhiteElo "([^"]+)"/); const beM = g.pgn.match(/\[BlackElo "([^"]+)"/);
  const dt = g.pgn.match(/\[Date "([0-9]{4})/);
  const white = wm[1]; const black = bm[1];
  const ss = /fabianocaruana/i.test(white) ? 'white' : 'black';
  const mv = strip(g.pgn);
  if (mv.length < 20) { console.error('SKIP ' + oid + '|' + tag + ' only ' + mv.length + ' plies'); continue; }
  const overview = OVERVIEWS[oid + '|' + tag];
  if (!overview) { console.error('NO OVERVIEW ' + oid + '|' + tag); continue; }
  out.push({
    id: 'mg-' + oid + '-' + tag, openingId: oid, white, black,
    whiteElo: weM ? +weM[1] : g.opponentRating, blackElo: beM ? +beM[1] : g.opponentRating,
    result: ss === 'white' ? '1-0' : '0-1', year: dt ? +dt[1] : 2020,
    event: 'chess.com ' + g.timeClass + ' (' + g.date + ')', pgn: mv.join(' '), sourceUrl: g.url, studentSide: ss, overview,
  });
}

const path = 'src/data/model-games.json';
const all = JSON.parse(readFileSync(path, 'utf8'));
const kept = all.filter((g) => !(g.openingId || '').startsWith('pro-caruana'));
writeFileSync(path, JSON.stringify([...kept, ...out], null, 2) + '\n');
console.error('wrote ' + out.length + ' caruana model games | ' + (kept.length + out.length) + ' total');
for (const g of out) console.error('  ' + g.id + ' ' + g.studentSide + ' ' + g.result + ' ' + g.pgn.split(' ').length + 'p');
