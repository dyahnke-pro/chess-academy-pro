// position-facts.mjs — PHASE 1 of the PositionFacts calculator, COMPLETE.
// (docs/plans/2026-08-26-position-facts-calculator.md)
//
// The unified Phase-1 board-truth packet per ply — supersedes fuse-engine.mjs's
// packet (carries everything it did + criticality + WDL). Pure computed facts,
// no prose (G0). Emits a durable JSON so nothing is lost, plus a readable
// criticality tape. Generalises to ANY video: the game is the align-bank spine.
//
// Per ply (all board-true, from ONE `go depth D` MultiPV 5 + WDL, + a cheap
// after-search only when the played move is a blunder outside the fan):
//   opening (DB longest-prefix) · mover · san · capture/check
//   evalAfter (mover POV) · cpLoss vs best · label (book..blunder)
//   best SAN · pv (full ~10 ply) · candidates[5] {san,cp}
//   wdl (win/draw/loss per-mille — the practical read) · seldepth
//   forcing/material (the tactic played out) · loose material (SEE-lite)
//   trap (shallow-vs-deep disagreement) · CRITICALITY {V,O,T,F,L,score,band}
//
// Usage: node scripts/voiced-authoring/position-facts.mjs <videoId> [--json] [--depth=18]
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { Chess } from 'chess.js';

const ID = process.argv[2];
const EMIT_JSON = process.argv.includes('--json');
const DEPTH = parseInt((process.argv.find((a) => a.startsWith('--depth=')) || '').split('=')[1] || process.env.SF_DEPTH || '18', 10);
const SHALLOW = 8;
const THREAT_DEPTH = parseInt(process.env.SF_THREAT_DEPTH || '14', 10); // null-move threat search (cheaper than the main read)
const MPV = 5;
if (!ID) { console.error('usage: node position-facts.mjs <videoId> [--json] [--depth=18]'); process.exit(1); }

function resolveSF() {
  const c = [process.env.STOCKFISH_PATH, '/usr/games/stockfish', '/usr/bin/stockfish', '/usr/local/bin/stockfish'].filter(Boolean);
  for (const p of c) if (existsSync(p)) return p;
  try { return execSync('which stockfish', { encoding: 'utf8' }).trim() || null; } catch { return null; }
}
const BIN = resolveSF();
if (!BIN) { console.error('no stockfish'); process.exit(1); }

// Engine: one `go depth D` with MultiPV + WDL; return every (depth,multipv) info
// row so we read the deep fan AND the shallow (d8) line from one search.
function engine(bin) {
  const sf = spawn(bin);
  let buf = '', rows = [], resolver = null, rawLines = [], rawResolver = null;
  sf.stdout.on('data', (d) => {
    buf += d.toString(); const lines = buf.split('\n'); buf = lines.pop() ?? '';
    for (const l of lines) {
      if (rawResolver) { // capturing an `eval` text block until readyok
        if (l.trim() === 'readyok') { const r = rawResolver; rawResolver = null; r(rawLines.join('\n')); rawLines = []; }
        else rawLines.push(l);
        continue;
      }
      if (l.startsWith('info') && / multipv /.test(l) && / pv /.test(l)) {
        const depth = +(/ depth (\d+)/.exec(l)?.[1] ?? 0);
        const seldepth = +(/ seldepth (\d+)/.exec(l)?.[1] ?? 0);
        const mpv = +(/ multipv (\d+)/.exec(l)?.[1] ?? 0);
        const mc = / score cp (-?\d+)/.exec(l), mm = / score mate (-?\d+)/.exec(l);
        const cp = mm ? (parseInt(mm[1], 10) > 0 ? 100000 : -100000) : (mc ? parseInt(mc[1], 10) : null);
        const w = / wdl (\d+) (\d+) (\d+)/.exec(l);
        const wdl = w ? [+w[1], +w[2], +w[3]] : null;
        const pv = (/ pv (.+)$/.exec(l)?.[1] ?? '').trim().split(/\s+/);
        rows.push({ depth, seldepth, mpv, cp, wdl, pv });
      }
      if (l.startsWith('bestmove') && resolver) { const r = resolver; resolver = null; r(rows); rows = []; }
    }
  });
  sf.stdin.write(`uci\nsetoption name Threads value 1\nsetoption name UCI_ShowWDL value true\nsetoption name MultiPV value ${MPV}\nisready\n`);
  return {
    go(fen, depth = DEPTH) { return new Promise((res) => { rows = []; resolver = res;
      sf.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);
      setTimeout(() => { if (resolver === res) { resolver = null; res(rows); } }, 30000); }); },
    // Static `eval` — the NNUE per-piece contribution board + the material/
    // positional bucket split. No search: the perturbation probe's cheap engine.
    evalRaw(fen) { return new Promise((res) => { rawLines = []; rawResolver = res;
      sf.stdin.write(`position fen ${fen}\neval\nisready\n`);
      setTimeout(() => { if (rawResolver === res) { rawResolver = null; res(rawLines.join('\n')); } }, 8000); }); },
    quit() { try { sf.stdin.write('quit\n'); sf.kill(); } catch { /* */ } },
  };
}

// ── `eval` parsers (ported from src/services/pieceValueRead.ts) ──────────────
const FILES = 'abcdefgh';
function parseEvalTable(raw) {
  const lines = raw.split('\n');
  const isCell = (l) => l.trimStart().startsWith('|') && l.includes('|');
  const cellsOf = (l) => l.split('|').slice(1, -1).map((c) => c.trim());
  const out = []; let rank = 8;
  for (let i = 0; i < lines.length - 1 && rank >= 1; i += 1) {
    const pl = lines[i], vl = lines[i + 1];
    if (!isCell(pl) || !isCell(vl)) continue;
    const pieces = cellsOf(pl), values = cellsOf(vl);
    if (pieces.length !== 8 || values.length !== 8) continue;
    if (!pieces.every((c) => c === '' || /^[pnbrqkPNBRQK]$/.test(c))) continue;
    if (!values.every((c) => c === '' || /^[+-]?\d+(\.\d+)?$/.test(c.replace(/\s+/g, '')))) continue;
    for (let f = 0; f < 8; f += 1) {
      const piece = pieces[f]; if (!piece) continue;
      const rv = values[f].replace(/\s+/g, ''); if (!rv) continue;
      const value = Number(rv); if (!Number.isFinite(value)) continue;
      out.push({ square: `${FILES[f]}${rank}`, piece, color: piece === piece.toUpperCase() ? 'w' : 'b', value });
    }
    rank -= 1; i += 1;
  }
  return out;
}
function parseEvalSplit(raw) {
  const line = raw.split('\n').find((l) => /this bucket is used/.test(l));
  if (!line) return null;
  const cells = line.split('|').slice(1, -1).map((c) => c.replace(/\s+/g, ''));
  if (cells.length < 4) return null;
  const material = Number(cells[1]), positional = Number(cells[2]);
  if (!Number.isFinite(material) || !Number.isFinite(positional)) return null;
  return { material, positional };
}
const PNAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
// A piece's contribution in ITS OWN side's favour (table is white-positive).
function own(v) { return v.color === 'w' ? v.value : -v.value; }
function meanByType(vals) {
  const s = new Map();
  for (const v of vals) { const t = v.piece.toLowerCase(); const c = s.get(t) ?? { tot: 0, n: 0 }; c.tot += Math.abs(v.value); c.n += 1; s.set(t, c); }
  const m = new Map(); for (const [t, { tot, n }] of s) m.set(t, tot / n); return m;
}
// Mover's strongest piece + weakest minor, opponent's strongest — each measured
// as delta vs what its OWN KIND is managing here (scale-free, per pieceValueRead).
function forcesRead(table, moverColor) {
  if (!table.length) return null;
  const me = moverColor; // 'w' | 'b'
  const play = table.filter((v) => v.piece.toLowerCase() !== 'k');
  const mean = meanByType(table);
  const delta = (v) => Math.abs(own(v)) - (mean.get(v.piece.toLowerCase()) ?? Math.abs(own(v)));
  const mine = play.filter((v) => v.color === me), theirs = play.filter((v) => v.color !== me);
  const myBest = mine.filter((v) => v.piece.toLowerCase() !== 'p').map((v) => ({ v, d: delta(v) })).sort((a, b) => b.d - a.d)[0];
  const myWorst = mine.filter((v) => v.piece.toLowerCase() === 'n' || v.piece.toLowerCase() === 'b').map((v) => ({ v, d: delta(v) })).sort((a, b) => a.d - b.d)[0];
  const theirBest = theirs.filter((v) => v.piece.toLowerCase() !== 'p').map((v) => ({ v, d: delta(v) })).sort((a, b) => b.d - a.d)[0];
  const fmt = (x) => x ? { square: x.v.square, piece: PNAME[x.v.piece.toLowerCase()], contribution: +Math.abs(own(x.v)).toFixed(2), delta: +x.d.toFixed(2) } : null;
  return { myBest: fmt(myBest), myWorst: myWorst && myWorst.d <= -0.3 ? fmt(myWorst) : null, theirBest: theirBest && theirBest.d >= 0.3 ? fmt(theirBest) : null };
}

// ── perturbation causal why-probe (the genuinely-NEW capability) ─────────────
// Leave-one-out on the SUPPORTERS of the mover's strongest piece: remove each
// defender, re-run the static `eval`, measure how much the star piece's own
// contribution drops. The biggest drop = the load-bearing supporter ("the
// knight leans on the d-pawn; take it and it's ordinary"). Cheap: static eval,
// no search. Gated to key+ plies so the extra evals stay bounded.
async function supporterProbe(evalFn, fen, table, moverColor, starSquare) {
  // The star is the mover's genuinely-OUTPERFORMING piece (highest delta vs its
  // own kind — the outpost knight, not the naturally-big queen). Caller passes
  // its square from forces.myBest so "leans on" lands on a real strong piece.
  const star = table.find((v) => v.square === starSquare && v.color === moverColor);
  if (!star || 'kp'.includes(star.piece.toLowerCase())) return null;
  const c = new Chess(fen);
  let defenders = [];
  try { defenders = c.attackers(star.square, moverColor) || []; } catch { defenders = []; }
  const sups = [];
  for (const dsq of defenders) {
    const cc = new Chess(fen);
    const removed = cc.remove(dsq);
    if (!removed || removed.type === 'k') continue;
    let t2;
    try { t2 = parseEvalTable(await evalFn(cc.fen())); } catch { continue; }
    const after = t2.find((v) => v.square === star.square);
    if (!after) continue;
    const drop = Math.abs(own(star)) - Math.abs(own(after));
    sups.push({ square: dsq, piece: PNAME[removed.type], drop: +drop.toFixed(2) });
  }
  sups.sort((a, b) => b.drop - a.drop);
  const top = sups[0];
  if (!top || top.drop < 0.5) return null;
  return { piece: PNAME[star.piece.toLowerCase()], square: star.square, contribution: +Math.abs(own(star)).toFixed(2), leansOn: top, all: sups };
}

// ── positional feature vector + structure→plan (Phase 4) ────────────────────
// All MECHANICAL — pure chess.js/FEN, no engine, no fuzzy judgment. A feature is
// only asserted when the skeleton unambiguously has it (empty > generic >
// invented). The structure→plan text is the canonical, mainstream plan for that
// structure ("translation, not invention" — the board-true structure is the
// raw material; the established plan is the phrasing).
const FILE_OF = (sq) => sq.charCodeAt(0) - 97;
const RANK_OF = (sq) => +sq[1];
function pawnsOf(board, color) {
  const out = [];
  for (const row of board) for (const c of row) if (c && c.type === 'p' && c.color === color) out.push(c.square);
  return out;
}
function positionalFeatures(fen, moverColor) {
  let b; try { b = new Chess(fen); } catch { return null; }
  const board = b.board();
  const wp = pawnsOf(board, 'w'), bp = pawnsOf(board, 'b');
  const filesOf = (ps) => ps.map(FILE_OF);
  const countByFile = (ps) => { const m = {}; for (const f of filesOf(ps)) m[f] = (m[f] || 0) + 1; return m; };
  const wf = countByFile(wp), bf = countByFile(bp);
  const doubled = (cnt) => Object.entries(cnt).filter(([, n]) => n >= 2).map(([f]) => FILES[+f]);
  const isolated = (ps, cnt) => ps.filter((s) => { const f = FILE_OF(s); return !cnt[f - 1] && !cnt[f + 1]; }).map((s) => s);
  const passed = (ps, enemyPs, dir) => ps.filter((s) => { const f = FILE_OF(s), r = RANK_OF(s);
    return !enemyPs.some((e) => Math.abs(FILE_OF(e) - f) <= 1 && (dir > 0 ? RANK_OF(e) > r : RANK_OF(e) < r)); }).map((s) => s);
  const allFiles = [...Array(8).keys()];
  const openFiles = allFiles.filter((f) => !wf[f] && !bf[f]).map((f) => FILES[f]);
  const halfOpen = (mine, cnt, oppCnt) => allFiles.filter((f) => !cnt[f] && oppCnt[f]).map((f) => FILES[f]);
  // bad bishop: ≥4 friendly pawns on the bishop's own square colour
  const sqColor = (sq) => (FILE_OF(sq) + RANK_OF(sq)) % 2 === 0 ? 'dark' : 'light';
  const badBishops = (color, ps) => { const out = [];
    for (const row of board) for (const c of row) if (c && c.type === 'b' && c.color === color) {
      const same = ps.filter((p) => sqColor(p) === sqColor(c.square)).length;
      if (same >= 4) out.push({ square: c.square, on: sqColor(c.square), blockedBy: same }); }
    return out; };
  // king zone pressure: distinct enemy pieces attacking the king's ring
  const kingPressure = (color) => { const ks = (() => { for (const row of board) for (const c of row) if (c && c.type === 'k' && c.color === color) return c.square; return null; })();
    if (!ks) return null; const foe = color === 'w' ? 'b' : 'w';
    const f = FILE_OF(ks), r = RANK_OF(ks); const ring = new Set();
    for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) { const nf = f + df, nr = r + dr;
      if (nf < 0 || nf > 7 || nr < 1 || nr > 8) continue; ring.add(`${FILES[nf]}${nr}`); }
    const attackers = new Set(), defenders = new Set();
    for (const sq of ring) { try { for (const a of (b.attackers(sq, foe) || [])) attackers.add(a); for (const d of (b.attackers(sq, color) || [])) defenders.add(d); } catch { /* */ } }
    return { attackers: attackers.size, defenders: defenders.size }; };

  // phase — mechanical (piece count + development). Gates placement judgments:
  // "improve your worst piece" is a middlegame idea; in the opening a minor is
  // idle because it isn't developed YET (pieceValueRead's isMiddlegame gate).
  const nonPawn = board.flat().filter((c) => c && c.type !== 'p' && c.type !== 'k').length;
  const homeMinors = (color) => { const br = color === 'w' ? 1 : 8; let n = 0;
    for (const row of board) for (const c of row) if (c && c.color === color && (c.type === 'n' || c.type === 'b') && RANK_OF(c.square) === br) n += 1; return n; };
  const phase = nonPawn <= 6 ? 'endgame' : (homeMinors('w') >= 2 || homeMinors('b') >= 2) ? 'opening' : 'middlegame';

  const feat = {
    phase,
    doubled: { w: doubled(wf), b: doubled(bf) },
    isolated: { w: isolated(wp, wf), b: isolated(bp, bf) },
    passed: { w: passed(wp, bp, 1), b: passed(bp, wp, -1) },
    openFiles,
    halfOpen: { w: halfOpen(wp, wf, bf), b: halfOpen(bp, bf, wf) },
    badBishop: { w: badBishops('w', wp), b: badBishops('b', bp) },
    kingPressure: { w: kingPressure('w'), b: kingPressure('b') },
  };
  // structure→plan is a middlegame read; in the opening it's premature.
  feat.structure = phase === 'opening' ? null : classifyStructure(wf, bf, wp, bp, moverColor, feat);
  return feat;
}
// Canonical middlegame structures → the mainstream plan for each side.
function classifyStructure(wf, bf, wp, bp, moverColor, feat) {
  const has = (cnt, file) => !!cnt[FILES.indexOf(file)];
  // closed centre = a real head-on pawn lock in the centre: BOTH central files
  // locked (the KID/French chain), or one central file locked WITH a flank pawn
  // also in contact (a chain, not one blocked pawn). One lone locked pawn with
  // tension elsewhere is NOT closed — that stays null (empty > generic).
  const contact = (file) => { const wr = wp.filter((s) => s[0] === file).map(RANK_OF); const br = bp.filter((s) => s[0] === file).map(RANK_OF);
    return wr.some((a) => br.some((c) => c === a + 1)); };
  const centerLocked = (contact('d') && contact('e'))
    || ((contact('d') || contact('e')) && (contact('c') || contact('f')));
  const dFileOpen = !has(wf, 'd') && !has(bf, 'd');
  const eFileOpen = !has(wf, 'e') && !has(bf, 'e');
  // IQP: the DYNAMIC isolani only — an isolated d-pawn ADVANCED to the 4th
  // (white) / 5th (black) rank, controlling central squares. An isolated d2/d3
  // or d6/d7 pawn is a static WEAKNESS, not this structure, and gets the wrong
  // "it's a strength" plan — so it is NOT tagged here (the isolated-pawn feature
  // already lists it as the target it is). David's outpost-bug lesson: a
  // plausible structure claim that's wrong is worse than none.
  const iqp = (color) => { const cnt = color === 'w' ? wf : bf; const rank = color === 'w' ? 4 : 5;
    return has(cnt, 'd') && !has(cnt, 'c') && !has(cnt, 'e')
      && (color === 'w' ? feat.isolated.w : feat.isolated.b).some((s) => s[0] === 'd' && RANK_OF(s) === rank); };
  // hanging pawns: the advanced c+d duo (c4/d4 white, c5/d5 black) with half-open
  // b- and e-flanks. Rank-guarded for the same reason as the IQP.
  const hanging = (color) => { const cnt = color === 'w' ? wf : bf; const ps = color === 'w' ? wp : bp; const rank = color === 'w' ? 4 : 5;
    return has(cnt, 'c') && has(cnt, 'd') && !has(cnt, 'b') && !has(cnt, 'e')
      && ps.some((s) => s[0] === 'c' && RANK_OF(s) === rank) && ps.some((s) => s[0] === 'd' && RANK_OF(s) === rank); };
  const me = moverColor, foe = moverColor === 'w' ? 'b' : 'w';
  const side = (c) => (c === me ? 'you' : 'they');
  if (iqp('w') || iqp('b')) { const holder = iqp('w') ? 'w' : 'b';
    return { type: 'isolated queen pawn', holder: holder === me ? 'you' : 'they',
      plan: holder === me
        ? 'The isolated d-pawn gives you space and open lines for the pieces — play actively, aim the d-pawn at a d5 break, and keep pieces on; the pawn is a strength while the middlegame lasts.'
        : 'They hold the isolani — blockade the square in front of it with a piece, trade the active pieces off, and the pawn becomes a pure endgame target.' }; }
  if (hanging('w') || hanging('b')) { const holder = hanging('w') ? 'w' : 'b';
    return { type: 'hanging pawns', holder: holder === me ? 'you' : 'they',
      plan: holder === me
        ? 'The hanging pawns own the centre and the space — you look for the d5 (or c5) break to open lines while they stand; let them be provoked into advancing and you gain the squares behind.'
        : 'Against the hanging pawns you press until one has to advance, then blockade the square it leaves and pile onto the pawn that stayed behind.' }; }
  if (centerLocked) return { type: 'closed centre',
    plan: 'The centre is locked, so the play is on the flanks — the pawn breaks at the base of the chains are where the game is decided; the side with more space attacks, the other strikes back at the base.' };
  if (dFileOpen && eFileOpen) return { type: 'open centre',
    plan: 'The centre is open — piece activity and king safety decide it; put the rooks on the open files and make every tempo count before the position simplifies.' };
  return null;
}

// ── move classification WITH the reason (missing item 5) ─────────────────────
// Not just cpLoss's label — WHY. Computed from signals already in hand: the
// after-position SEE, the standing threat before/after, the forcing win missed,
// the only-move gap. Fault reasons for bad moves; merit reasons for good ones.
function classifyReason({ label, isBest, cpLoss, gap12, threatNetBefore, hangAfter, forceNetBest, capture, seeNow, refuteNet }) {
  if (Math.abs(cpLoss ?? 0) >= 100000) return 'mate';
  const bad = label === 'mistake' || label === 'blunder';
  if (bad) {
    if (hangAfter >= 3) return 'hung-piece';                 // left material en prise NOW (SEE)
    if (threatNetBefore >= 3) return 'ignored-threat';       // a standing must-defend went unmet
    if (refuteNet >= 2) return 'walked-into-tactic';         // the refutation wins material a few ply in
    if (forceNetBest >= 2) return 'missed-forcing-win';      // a concrete win was on, and this wasn't it
    return 'lost-the-thread';                                // positional slip, no tactic found
  }
  if (label === 'inaccuracy') return threatNetBefore >= 3 ? 'imprecise-defence' : 'second-best';
  // good / best
  if (isBest && gap12 >= 150) return 'only-move';
  if (threatNetBefore >= 3) return 'defends-threat';
  if (capture && seeNow >= 2) return 'wins-material';
  if (isBest) return 'best';
  return 'solid';
}

// ── opening naming (DB longest prefix) ──────────────────────────────────────
const OPENINGS = (() => {
  const raw = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf8'));
  const arr = Array.isArray(raw) ? raw : Object.values(raw);
  const map = new Map(); for (const e of arr) if (e.pgn && e.name) map.set(e.pgn.trim(), e.name); return map;
})();
function openingAt(sans) { for (let n = sans.length; n >= 1; n--) { const k = sans.slice(0, n).join(' '); if (OPENINGS.has(k)) return OPENINGS.get(k); } return null; }

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
function uciSan(fen, u) { const c = new Chess(fen); const m = c.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u[4] }); return m ? m.san : u; }
function pvSans(fen, pv, n) { const c = new Chess(fen); const out = []; for (const u of pv.slice(0, n)) { const m = c.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u[4] }); if (!m) break; out.push(m.san); } return out; }
function forcingWinsMaterial(fen, pv, mover, n = 6) {
  const c = new Chess(fen); let net = 0, forcing = true, saw = false, i = 0;
  for (const u of pv.slice(0, n)) { const m = c.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u[4] }); if (!m) break; i++;
    if (m.captured) { saw = true; net += (m.color === mover ? 1 : -1) * (VAL[m.captured] || 0); }
    const f = m.san.includes('+') || m.san.includes('#') || !!m.captured; if (!f && i <= 4) forcing = false; }
  return forcing && saw ? net : 0;
}
function looseMaterial(fen) {
  const c = new Chess(fen); let best = 0;
  for (const m of c.moves({ verbose: true })) { if (!m.captured) continue;
    const cc = new Chess(fen); cc.move(m);
    const defended = cc.attackers ? (cc.attackers(m.to, cc.turn())?.length ?? 0) > 0 : true;
    const gain = (VAL[m.captured] || 0) - (defended ? (VAL[m.piece] || 0) : 0);
    if (gain > best) best = gain; }
  return best;
}
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
// Give the opponent the move: flip the side-to-move, clear en passant. Returns
// null when that is illegal (the side now NOT to move is in check — you can't
// null-move out of / into that). The result answers "what must I defend?".
function flipSide(fen) {
  const p = fen.split(' '); p[1] = p[1] === 'w' ? 'b' : 'w'; p[3] = '-';
  const flipped = p.join(' ');
  try { const c = new Chess(flipped); if (c.inCheck()) return null; return flipped; } catch { return null; }
}
// First ply in a played-out line where a NEW capture nets material for `side`
// (the moment a latent threat actually lands).
function latentLandsAt(fen, pv, side, n = 8) {
  const c = new Chess(fen);
  for (let i = 0; i < Math.min(n, pv.length); i++) {
    const u = pv[i]; const m = c.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u[4] }); if (!m) break;
    if (m.captured && m.color === side && (VAL[m.captured] || 0) >= 3) return i + 1; // a piece falls
  }
  return 0;
}
// Settled material `side` nets over a played-out window (all captures netted, NO
// forcing gate) — a fair trade → ~0, a won piece → +3. This catches the common
// must-defend the forcing gate misses: attack now, capture next.
function lineNet(fen, pv, side, n = 8) {
  const c = new Chess(fen); let net = 0;
  for (const u of pv.slice(0, n)) { const m = c.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u[4] }); if (!m) break;
    if (m.captured) net += (m.color === side ? 1 : -1) * (VAL[m.captured] || 0); }
  return net;
}
// Same, but for a SAN line (the refutation PV, played from the after-position).
function sanLineNet(fen, sans, side, n = 8) {
  const c = new Chess(fen); let net = 0;
  for (const s of sans.slice(0, n)) { let m; try { m = c.move(s); } catch { break; } if (!m) break;
    if (m.captured) net += (m.color === side ? 1 : -1) * (VAL[m.captured] || 0); }
  return net;
}
function label(cpLoss, isBest, mate) {
  if (isBest) return 'best'; if (mate) return 'forcing'; if (cpLoss == null) return '?';
  if (cpLoss <= 15) return 'best'; if (cpLoss <= 50) return 'good'; if (cpLoss <= 100) return 'inaccuracy';
  if (cpLoss <= 250) return 'mistake'; return 'blunder';
}

// ── reconstruct the forward line ────────────────────────────────────────────
const bank = JSON.parse(readFileSync(`data/video-narration/${ID}.json`, 'utf8'));
let voiced = { openingName: bank.title || '', studentSide: '?' };
try { voiced = JSON.parse(readFileSync(`data/video-narration-voiced/${ID}.json`, 'utf8')); } catch { /* */ }
const beats = []; let maxPly = 0;
for (const m of bank.moves) { if (!m.line?.length || m.ply <= maxPly) continue; maxPly = m.ply; beats.push(m); }
function beatLegal(fen, line) { const c = new Chess(fen); for (const s of line) { try { if (!c.move(s)) return false; } catch { return false; } } return true; }

const sf = engine(BIN);
const chess = new Chess();
const facts = [];
const sanSoFar = [];
for (const beat of beats) {
  if (!beatLegal(chess.fen(), beat.line)) continue;
  for (const san of beat.line) {
    const fen = chess.fen();
    const mover = chess.turn();
    const rows = await sf.go(fen);
    const dmax = Math.max(0, ...rows.map((r) => r.depth));
    const deep = [1,2,3,4,5].map((k) => rows.filter((r) => r.mpv === k && r.depth === dmax).pop()).filter(Boolean);
    const seldepth = Math.max(0, ...rows.filter((r) => r.depth === dmax).map((r) => r.seldepth));
    const sd = Math.max(0, ...rows.filter((r) => r.depth <= SHALLOW && r.mpv === 1).map((r) => r.depth));
    const shallow = rows.filter((r) => r.mpv === 1 && r.depth === sd).pop();

    const cps = deep.map((r) => r.cp);
    const cp1 = cps[0] ?? 0, cp2 = cps[1] ?? cp1, cpN = cps[cps.length - 1] ?? cp1;
    const gap12 = cp1 - cp2, spread = cp1 - cpN;
    const bestUci = deep[0]?.pv?.[0];
    const bestSan = bestUci ? uciSan(fen, bestUci) : '?';
    const bestPv = deep[0] ? pvSans(fen, deep[0].pv, 10) : [];
    const wdl = deep[0]?.wdl ?? null;
    const shBestUci = shallow?.pv?.[0];
    const trapMove = !!(shBestUci && bestUci && shBestUci !== bestUci);
    const trapEval = (shallow?.cp != null && cp1 != null) ? (shallow.cp - cp1) : 0;
    const forceNet = deep[0] ? forcingWinsMaterial(fen, deep[0].pv, mover) : 0;
    const seldepthSpike = Math.max(0, seldepth - dmax);
    const loose = looseMaterial(fen);

    // ── STATE OF FORCES — per-piece contribution (one static eval, every ply) ─
    const evalTxt = await sf.evalRaw(fen);
    const table = parseEvalTable(evalTxt);
    const split = parseEvalSplit(evalTxt);
    const forces = forcesRead(table, mover);
    const positional = positionalFeatures(fen, mover); // mechanical, no engine

    // ── THREAT, calculated out (null-move) ──────────────────────────────────
    // Give the opponent the move at THIS position; their best line = the thing
    // the mover must answer. net>0 = a concrete standing threat (must-defend);
    // landsAt = the ply the material actually falls (latent-threat depth).
    const oppColor = mover === 'w' ? 'b' : 'w';
    let threat = null;
    const flipped = flipSide(fen);
    if (flipped) {
      const immediate = looseMaterial(flipped); // SEE — what hangs to the opponent right now (cheap, no search)
      const trows = await sf.go(flipped, THREAT_DEPTH);
      const ttd = Math.max(0, ...trows.map((r) => r.depth));
      const tcands = [1,2,3,4,5].map((k) => trows.filter((r) => r.mpv === k && r.depth === ttd).pop()).filter((r) => r?.pv?.length);
      const tbest = tcands.find((r) => r.mpv === 1) || tcands[0];
      // Calculated-out: scan ALL candidate lines for the biggest settled material
      // net (the threat can be the engine's 2nd choice, and it need not be forcing
      // — attack now, take next). landsAt = the ply the piece actually falls.
      let calcNet = 0, netPv = tbest?.pv || [];
      for (const r of tcands) { const n = lineNet(flipped, r.pv, oppColor, 8); if (n > calcNet) { calcNet = n; netPv = r.pv; } }
      const net = Math.max(immediate, calcNet);
      if (net > 0) threat = { net, immediate, calcNet, landsAt: latentLandsAt(flipped, netPv, oppColor, 8), pv: pvSans(flipped, netPv, 6), cp: tbest?.cp ?? null };
    }
    const threatNet = threat?.net ?? 0;

    // played-move eval → cpLoss. Use the candidate's cp if the move is in the
    // fan, else a cheap after-search (only blunders fall here).
    const playedUci = (() => { const c = new Chess(fen); const m = c.move(san); return m ? m.from + m.to + (m.promotion || '') : null; })();
    let playedCp = null;
    const inFan = deep.find((r) => r.pv?.[0] === playedUci);
    if (inFan) playedCp = inFan.cp;
    const mv = chess.move(san); if (!mv) break;
    sanSoFar.push(mv.san);
    const afterFen = chess.fen();
    // refutation branch: after a bad move, the opponent's best reply = WHY it
    // failed, played out. Grab it from the after-search (out-of-fan moves) or
    // from the in-fan candidate's own continuation (no extra search).
    let refutation = null;
    if (playedCp == null) {
      const after = await sf.go(afterFen, DEPTH);
      const ad = Math.max(0, ...after.map((x) => x.depth));
      const a1 = after.filter((r) => r.mpv === 1 && r.depth === ad).pop();
      playedCp = a1?.cp != null ? -a1.cp : null;
      if (a1?.pv?.length) refutation = pvSans(afterFen, a1.pv, 6);
    }
    const cpLoss = (cp1 != null && playedCp != null) ? cp1 - playedCp : null;
    const isBest = playedUci === bestUci;
    const mate = Math.abs(cp1) >= 100000 || Math.abs(playedCp || 0) >= 100000;
    const lbl = label(cpLoss, isBest, mate);
    // in-fan mistake/blunder: the candidate row already carries the opponent's
    // punishing continuation after the played move — no extra search needed.
    if (!refutation && (lbl === 'mistake' || lbl === 'blunder') && inFan?.pv?.length > 1) {
      refutation = pvSans(fen, inFan.pv, 8).slice(1);
    }
    if (lbl !== 'mistake' && lbl !== 'blunder') refutation = null; // only a bad move HAS a refutation

    // criticality — Phase-1 sharpness base (UNCHANGED weights, so a game with no
    // threats keeps its validated scores), plus threat as an ADDITIVE escalator
    // (never a budget competitor that deflates the others). Tr = must-defend.
    const V = clamp01(spread / 300), O = clamp01(gap12 / 150);
    const T = clamp01(Math.max(trapEval / 150, trapMove ? 0.5 : 0));
    const F = forceNet > 0 ? clamp01(forceNet / 5) : clamp01(seldepthSpike / 8);
    const L = clamp01(loose / 3);
    const Tr = threatNet > 0 ? clamp01(threatNet / 5) : 0;
    const base = 100 * (0.42 * V + 0.20 * O + 0.16 * T + 0.12 * F + 0.10 * L);
    let score = Math.min(100, Math.round(base + 25 * Tr)); // a standing threat adds up to +25
    if (loose >= 3) score = Math.max(score, 55);
    if (threatNet >= 3) score = Math.max(score, 50); // must-defend floor → at least 'key'
    if (Math.abs(cp1) >= 100000) score = Math.max(score, 80);
    const band = score >= 70 ? 'CRITICAL' : score >= 45 ? 'key' : score >= 20 ? 'think' : 'quiet';

    // ── PERTURBATION why-probe (gated to key+ — bounded extra evals) ─────────
    // Only probe a genuinely well-placed piece (myBest delta ≥ 0.3), so "leans
    // on" describes a real strong piece, never the naturally-big queen.
    let support = null;
    if (score >= 45 && table.length && forces?.myBest && forces.myBest.delta >= 0.3) {
      support = await supporterProbe((f) => sf.evalRaw(f), fen, table, mover, forces.myBest.square);
    }

    // ── MOVE REASON (why, not just the label) ───────────────────────────────
    const hangAfter = looseMaterial(afterFen); // what hangs to the opponent after the move (SEE)
    const seeNow = (() => { if (!mv.captured) return 0; const cc = new Chess(afterFen); let def = 0; try { def = (cc.attackers(mv.to, cc.turn()) || []).length; } catch { def = 0; } return (VAL[mv.captured] || 0) - (def > 0 ? (VAL[mv.piece] || 0) : 0); })();
    const refuteNet = refutation ? sanLineNet(afterFen, refutation, oppColor, 8) : 0; // material the opponent nets in the refutation
    const reason = classifyReason({ label: lbl, isBest, cpLoss, gap12, threatNetBefore: threatNet, hangAfter, forceNetBest: forceNet, capture: !!mv.captured, seeNow, refuteNet });

    facts.push({
      ply: beat.ply, t: beat.t, mover: mover === 'w' ? 'W' : 'B', san: mv.san,
      capture: !!mv.captured, check: mv.san.includes('+') || mv.san.includes('#'),
      opening: openingAt(sanSoFar),
      evalAfter: playedCp == null ? null : +(playedCp / 100).toFixed(2), cpLoss, label: lbl, reason,
      best: bestSan, bestPv, refutation,
      candidates: deep.map((r) => ({ san: uciSan(fen, r.pv[0]), cp: r.cp, pv: pvSans(fen, r.pv, 6) })),
      threat, forces, support, positional, split: split ? { material: +split.material.toFixed(2), positional: +split.positional.toFixed(2) } : null,
      wdl, seldepth, forceNet, loose, hangAfter, seeNow, trap: trapMove ? 'move' : (trapEval >= 60 ? 'eval' : ''),
      crit: { V: +V.toFixed(2), O: +O.toFixed(2), T: +T.toFixed(2), F: +F.toFixed(2), L: +L.toFixed(2), Tr: +Tr.toFixed(2), score, band },
      fenAfter: chess.fen(),
    });
  }
}
sf.quit();

if (EMIT_JSON) {
  mkdirSync('audit-reports/position-facts', { recursive: true });
  const out = `audit-reports/position-facts/${ID}.json`;
  writeFileSync(out, JSON.stringify({ id: ID, opening: voiced.openingName, studentSide: voiced.studentSide, depth: DEPTH, facts }, null, 2));
  console.log(`wrote ${out} (${facts.length} plies)`);
}
console.log(`# ${ID} — ${voiced.openingName} — criticality tape (SF d${DEPTH}, MultiPV ${MPV}, WDL on)\n`);
for (const t of facts) {
  const bar = { quiet: '·', think: '▂', key: '▆', CRITICAL: '█' }[t.crit.band];
  const w = t.wdl ? `wdl ${t.wdl.map((x) => String(x).padStart(3)).join('/')}` : '';
  const thr = t.threat?.net > 0 ? `THREAT+${t.threat.net}${t.threat.landsAt ? '@' + t.threat.landsAt : ''}` : '';
  const sup = t.support ? `leans:${t.support.piece}${t.support.square}←${t.support.leansOn.piece}${t.support.leansOn.square}(-${t.support.leansOn.drop})` : '';
  const st = t.positional?.structure ? `[${t.positional.structure.type}]` : '';
  console.log(`${bar} ${String(t.ply).padStart(3)} ${t.mover} ${t.san.padEnd(6)} sc ${String(t.crit.score).padStart(3)} [${t.crit.band.padEnd(8)}] loss ${String(t.cpLoss).padStart(5)} ${(t.reason || '').padEnd(18)} ${w} ${t.trap ? ('trap:' + t.trap) : ''} ${t.threat?.net ? thr : ''} ${t.loose ? ('loose+' + t.loose) : ''} ${sup} ${st}`.replace(/\s+$/, ''));
}
