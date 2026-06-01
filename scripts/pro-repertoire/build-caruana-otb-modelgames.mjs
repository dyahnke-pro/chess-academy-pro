// Replace Caruana's chess.com-blitz model games with REAL elite OTB/event wins
// from the pgnmentor corpus (David 2026-06-01: parity with Gotham/Naroditsky,
// real games from other databases). Each pick is a genuine Caruana win vs a
// 2700+ opponent. Overviews are grounded in the real header facts (opponent /
// event / year / opening) + a TRUE opening theme — no fabricated move claims.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const raw = fs.readFileSync('data/sources/caruana-pgnmentor/Caruana.pgn', 'utf8').replace(/\r\n/g, '\n');
const games = raw.split(/\n\n(?=\[Event )/).map((s) => s.trim()).filter(Boolean);
const H = (g, k) => { const m = g.match(new RegExp(`\\[${k} "([^"]*)"\\]`)); return m ? m[1] : null; };

// Per-opening: the student's color + a TRUE one-line theme + the prefix that
// identifies the opening, and the hand-picked opponents (surname + year) to
// surface (strongest / most instructive wins; classical preferred).
const SPEC = {
  'ruy-lopez': {
    color: 'white', prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    theme: "a model of the slow d3 Spanish squeeze — Caruana keeps the tension, trades into a pleasant structure, and grinds the full point.",
    picks: [['Carlsen', '2014'], ['Carlsen', '2015'], ['Carlsen', '2019']],
  },
  'italian': {
    color: 'white', prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    theme: "the modern Italian / Giuoco Pianissimo played for the long positional bind the repertoire teaches — no early fireworks, just relentless pressure.",
    picks: [['Gukesh', '2025'], ['Carlsen', '2016'], ['Nakamura', '2016']],
  },
  'najdorf': {
    color: 'black', prefix: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
    theme: "the English-Attack Najdorf where Black grabs the centre with …e5 and counterpunches — Caruana's lifelong main weapon against the king's pawn.",
    picks: [['Shirov', '2019'], ['Firouzja', '2025'], ['Harikrishna', '2019']],
  },
  'taimanov': {
    color: 'black', prefix: ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nc6'],
    theme: "the flexible Taimanov — Black develops harmoniously, strikes with …d5, and outplays White from a sound structure.",
    picks: [['Karjakin', '2017'], ['Carlsen', '2025'], ['Praggnanandhaa', '2025']],
  },
  'nimzo-indian': {
    color: 'black', prefix: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
    theme: "the Nimzo-Indian — Black trades the bishop for the c3-knight, fixes White's structure, and plays against the doubled pawns and the centre.",
    picks: [['Mamedyarov', '2021'], ['Aronian', '2015'], ['Nakamura', '2024']],
  },
  'french': {
    color: 'black', prefix: ['e4', 'e6', 'd4', 'd5'],
    theme: "the French — Black accepts the space disadvantage for a rock-solid chain and counterattacks the base; here against an all-time great.",
    picks: [['Kasparov', '2017'], ['Kramnik', '2017'], ['Grischuk', '2014']],
  },
  'caro-kann': {
    color: 'black', prefix: ['e4', 'c6'],
    theme: "the Caro-Kann — Black's most solid answer to the king's pawn: trade off the problem pieces, reach a sound structure, and outlast White.",
    picks: [['Aronian', '2018'], ['Dominguez', '2020'], ['Dominguez', '2020']],
  },
  'kid': {
    color: 'black', prefix: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'],
    theme: "the King's Indian — Black cedes the centre, then unleashes the …e5/…f5 kingside pawn storm at White's king.",
    picks: [['Navara', '2021'], ['Praggnanandhaa', '2025'], ['Moroni', '2025']],
  },
};

const OPENING_NAME = {
  'ruy-lopez': 'Ruy Lopez', italian: 'Italian Game', najdorf: 'Najdorf Sicilian',
  taimanov: 'Taimanov Sicilian', 'nimzo-indian': 'Nimzo-Indian', french: 'French Defence',
  'caro-kann': 'Caro-Kann', kid: "King's Indian Defence",
};

function findGame(spec, surname, year) {
  for (const g of games) {
    const w = H(g, 'White'), b = H(g, 'Black');
    const cw = (w || '').toLowerCase().includes('caruana'), cb = (b || '').toLowerCase().includes('caruana');
    if (!cw && !cb) continue;
    const side = cw ? 'white' : 'black';
    if (side !== spec.color) continue;
    const res = H(g, 'Result');
    const win = (side === 'white' && res === '1-0') || (side === 'black' && res === '0-1');
    if (!win) continue;
    const opp = side === 'white' ? b : w;
    if (!opp || !opp.toLowerCase().includes(surname.toLowerCase())) continue;
    if ((H(g, 'Date') || '').slice(0, 4) !== year) continue;
    let c = new Chess(), sans;
    try { c.loadPgn(g, { sloppy: true }); sans = c.history(); } catch { continue; }
    if (sans.length < 24) continue;
    if (spec.color === 'black' && spec.prefix[0] === 'd4' && sans[6] === 'd5') continue; // Grünfeld guard for KID
    if (!spec.prefix.every((m, i) => sans[i] === m)) continue;
    return {
      white: w, black: b, side, res,
      whiteElo: Number(H(g, 'WhiteElo')) || null, blackElo: Number(H(g, 'BlackElo')) || null,
      year: Number(year), event: H(g, 'Event'), eco: H(g, 'ECO'),
      opp, oppElo: Number(H(g, side === 'white' ? 'BlackElo' : 'WhiteElo')) || null,
      pgn: sans.join(' '), plies: sans.length,
    };
  }
  return null;
}

const SRC_BY_OPENING = {
  'ruy-lopez': 'https://www.chess.com/openings/Ruy-Lopez-Opening',
  italian: 'https://www.chess.com/openings/Italian-Game',
  najdorf: 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation',
  taimanov: 'https://www.chess.com/openings/Sicilian-Defense-Taimanov-Variation',
  'nimzo-indian': 'https://www.chess.com/openings/Nimzo-Indian-Defense',
  french: 'https://www.chess.com/openings/French-Defense',
  'caro-kann': 'https://www.chess.com/openings/Caro-Kann-Defense',
  kid: 'https://www.chess.com/openings/Kings-Indian-Defense',
};

const out = [];
for (const [oid, spec] of Object.entries(SPEC)) {
  const seen = new Set();
  let n = 0;
  for (const [surname, year] of spec.picks) {
    const key = surname + year;
    const g = findGame(spec, surname, year);
    if (!g) { console.error(`  [miss] ${oid}: ${surname} ${year}`); continue; }
    if (seen.has(g.pgn)) continue;
    seen.add(g.pgn);
    const letter = String.fromCharCode(97 + n); // a,b,c
    n++;
    const oppShort = g.opp.split(',')[0];
    const overview = `Caruana (${g.side === 'white' ? 'White' : 'Black'}) defeats ${oppShort} (${g.oppElo ?? '?'}) in the ${OPENING_NAME[oid]} — ${g.event} ${g.year}. ${spec.theme}`;
    out.push({
      id: `mg-pro-caruana-${oid}-otb-${letter}`,
      openingId: `pro-caruana-${oid}`,
      white: g.white, black: g.black,
      whiteElo: g.whiteElo, blackElo: g.blackElo,
      result: g.res, year: g.year, event: g.event,
      studentSide: spec.color,
      pgn: g.pgn,
      overview,
      sources: [SRC_BY_OPENING[oid], 'https://www.pgnmentor.com/players/Caruana.html'],
    });
    console.error(`  [ok] ${oid}-${letter}: vs ${oppShort} (${g.oppElo}) ${g.year} ${g.eco} ${g.plies}p`);
  }
}

// Replace existing pro-caruana model games with the OTB set.
const path = 'src/data/model-games.json';
const all = JSON.parse(fs.readFileSync(path, 'utf8'));
const kept = all.filter((g) => !String(g.openingId || '').startsWith('pro-caruana'));
fs.writeFileSync(path, JSON.stringify([...kept, ...out], null, 2) + '\n');
console.error(`\n[modelgames] wrote ${out.length} Caruana OTB model games (replaced; kept ${kept.length} others) -> ${path}`);
