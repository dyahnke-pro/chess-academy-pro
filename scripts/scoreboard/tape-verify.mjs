// ACCURACY OF WHAT THE STUDENT HEARD (David 2026-09-30: "getting the computers
// to 97% accuracy or better"). Reads a Learn walk tape (tape.mjs) and checks
// every spoken SENTENCE against the board (chess.js) and the engine (the
// MultiPV reads stored with each game in sr-all80.json). Nothing here imports
// app code — a verifier that shared the computer's helpers would agree with it
// by construction.
//
// Verdicts per sentence: TRUE (every checkable claim holds), FALSE (one fails,
// with the reason), UNCHECKED (no claim this reader can settle). Accuracy =
// TRUE / (TRUE + FALSE); coverage = checked / all.
//
//   node scripts/scoreboard/tape-verify.mjs <tape.json> <games.json> [--show 40]
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const [TAPE, GAMES] = process.argv.slice(2);
const SHOW = Number(process.argv[process.argv.indexOf('--show') + 1]) || 40;
const tape = JSON.parse(readFileSync(TAPE, 'utf8'));
const games = new Map(JSON.parse(readFileSync(GAMES, 'utf8')).map((g) => [g.id.replace(/^naro-/, ''), g]));

const PIECE = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const FILES = 'abcdefgh';
const other = (c) => (c === 'w' ? 'b' : 'w');
const withTurn = (fen, t) => { const p = fen.split(' '); p[1] = t; p[3] = '-'; return p.join(' '); };
const key = (fen) => fen.split(' ').slice(0, 4).join(' ');
const board = (fen) => { try { return new Chess(fen); } catch { return null; } };

// ── independent geometry ────────────────────────────────────────────────────
function attackers(b, sq, by) {
  const out = []; const f = FILES.indexOf(sq[0]); const r = Number(sq[1]);
  const on = (ff, rr) => (ff >= 0 && ff < 8 && rr >= 1 && rr <= 8 ? `${FILES[ff]}${rr}` : null);
  const push = (s, t) => { if (!s) return; const p = b.get(s); if (p && p.color === by && t.includes(p.type)) out.push(s); };
  const pd = by === 'w' ? -1 : 1; push(on(f - 1, r + pd), ['p']); push(on(f + 1, r + pd), ['p']);
  for (const [a, c] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) push(on(f + a, r + c), ['n']);
  for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) if (a || c) push(on(f + a, r + c), ['k']);
  const ray = (a, c, t) => { let ff = f + a; let rr = r + c; for (;;) { const s = on(ff, rr); if (!s) return; const p = b.get(s); if (p) { if (p.color === by && t.includes(p.type)) out.push(s); return; } ff += a; rr += c; } };
  for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ray(a, c, ['r', 'q']);
  for (const [a, c] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) ray(a, c, ['b', 'q']);
  return out;
}
function between(a, z) {
  const df = FILES.indexOf(z[0]) - FILES.indexOf(a[0]); const dr = Number(z[1]) - Number(a[1]);
  if (!(df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr))) return null;
  const sf = Math.sign(df); const sr = Math.sign(dr); const out = [];
  let f = FILES.indexOf(a[0]) + sf; let r = Number(a[1]) + sr;
  while (f !== FILES.indexOf(z[0]) || r !== Number(z[1])) { out.push(`${FILES[f]}${r}`); f += sf; r += sr; }
  return out;
}
/** Static exchange: net material for `by` capturing on `sq` first (≥ 0 means it does not lose). */
function see(fen, sq, by) {
  const b = board(withTurn(fen, by)); if (!b) return 0;
  const target = b.get(sq); if (!target) return 0;
  const caps = b.moves({ verbose: true }).filter((m) => m.to === sq && m.captured);
  if (!caps.length) return 0;
  const cheapest = caps.sort((x, y) => VAL[x.piece] - VAL[y.piece])[0];
  b.move(cheapest);
  return Math.max(0, VAL[target.type] - see(b.fen(), sq, other(by)));
}

// ── the engine, from the stored reads ──────────────────────────────────────
/** Mover-POV score of `san` at `fen` if it is among the stored top lines, and the best score. */
function engineAt(g, fen) {
  const k = key(fen);
  const p = g.plies.find((x) => key(x.fen) === k);
  if (!p?.lines?.length) return null;
  const c = board(fen);
  return p.lines.map((l) => {
    let san = null; try { san = c ? new Chess(fen).move({ from: l.pv[0].slice(0, 2), to: l.pv[0].slice(2, 4), promotion: l.pv[0][4] }).san : null; } catch { /* */ }
    return { san, cp: l.mate !== null && l.mate !== undefined ? (l.mate > 0 ? 10000 - l.mate : -10000 - l.mate) : l.cp };
  });
}
const stripSan = (s) => s.replace(/^…|^\.\.\./, '').replace(/[+#!?]+$/, '');

// ── sentence verifiers ─────────────────────────────────────────────────────
// ctx: { g, me, them, fenBefore, fenMid (after student), fenAfter (after reply) }
function checkSentence(s, ctx) {
  const res = []; // [ok, why]
  const { me, them } = ctx;
  const boards = [ctx.fenAfter, ctx.fenMid].map(board).filter(Boolean);
  const who = (w) => (/^(your|you)$/i.test(w) ? me : /^(their|they|my)$/i.test(w) ? them : null);
  // A sentence about a FUTURE board ("After X, Y, …", "if …", "would") is about
  // a line, not this position: only its moves' legality is checked.
  const future = /^(After |If |Then |Once )/.test(s);

  if (!future) {
    for (const m of s.matchAll(/\b(your|their)\s+(pawn|knight|bishop|rook|queen|king)\s+on\s+([a-h][1-8])/gi)) {
      const ok = boards.some((b) => { const p = b.get(m[3]); return p && p.type === PIECE[m[2].toLowerCase()] && p.color === who(m[1]); });
      res.push([ok, `no ${m[1]} ${m[2]} on ${m[3]}`]);
    }
    // "X on a1 hits/attacks your Y on b2"
    for (const m of s.matchAll(/\b(pawn|knight|bishop|rook|queen|king) on ([a-h][1-8]) (?:hits|attacks) (?:your|their) (pawn|knight|bishop|rook|queen|king) on ([a-h][1-8])/gi)) {
      const ok = boards.some((b) => { const a = b.get(m[2]); return a && attackers(b, m[4], a.color).includes(m[2]); });
      res.push([ok, `${m[2]} does not attack ${m[4]}`]);
    }
    // "… pins your knight on f3 against your rook on d1"
    for (const m of s.matchAll(/\b(?:bishop|rook|queen) on ([a-h][1-8]) pins (?:your|their) \w+ on ([a-h][1-8]) against (?:your|their) \w+ on ([a-h][1-8])/gi)) {
      const ok = boards.some((b) => { const line = between(m[1], m[3]); return line && line.includes(m[2]) && line.filter((x) => x !== m[2]).every((x) => !b.get(x)) && !!b.get(m[1]); });
      res.push([ok, `no pin ${m[1]}-${m[2]}-${m[3]}`]);
    }
    // "your X on e6 is attacked and nothing's defending it"
    for (const m of s.matchAll(/your (\w+) on ([a-h][1-8]) is attacked and nothing's defending it/gi)) {
      const ok = boards.some((b) => attackers(b, m[2], them).length > 0 && attackers(b, m[2], me).length === 0);
      res.push([ok, `${m[2]} not hanging`]);
    }
    // "the X file is open toward your/their king"
    for (const m of s.matchAll(/\bthe ([a-h])[ -]file is open/gi)) {
      const b = boards[0]; let pw = 0; for (let r = 1; r <= 8; r++) { const p = b.get(`${m[1]}${r}`); if (p?.type === 'p') pw++; }
      res.push([pw <= 1, `${m[1]}-file has ${pw} pawns`]);
    }
    // "it wins the bishop on g1" / "would win your bishop on c6"
    for (const m of s.matchAll(/(?:threatens|eyeing) (…?[NBRQK]?x[a-h][1-8]|…?[a-h]x[a-h][1-8])[^.]*?wins? (?:the|your) (\w+) on ([a-h][1-8])/gi)) {
      // The threat is about a board BEFORE it is carried out — the reply may
      // already have played it, so any of the three boards may hold it.
      const tgt = m[3];
      const ok = [ctx.fenBefore, ctx.fenMid, ctx.fenAfter].some((fen) => { const b = board(fen); const p = b?.get(tgt); return !!p && p.color === me && see(fen, tgt, them) > 0; });
      res.push([ok, `${m[1]} does not win material on ${tgt}`]);
    }
    // "…Nc5 isn't possible any more" — a stopped move is still legal; it loses.
    for (const m of s.matchAll(/(…?[NBRQK]?[a-h]?x?[a-h][1-8]) isn't possible any more/g)) {
      const san = stripSan(m[1]);
      const legal = [ctx.fenAfter, ctx.fenMid].some((fen) => { const b = board(withTurn(fen, them)); try { b.move(san); return true; } catch { return false; } });
      res.push([!legal, `${san} is still legal — it loses, it is not impossible`]);
    }
    // "…X doesn't work: the knight would just be taken on c5" / "…lost on f4"
    for (const m of s.matchAll(/(…?[NBRQK]?[a-h]?x?[a-h][1-8]) (?:doesn't work|isn't possible any more): the (\w+) would just be (?:taken|lost) on ([a-h][1-8])/g)) {
      const san = stripSan(m[1]); const sq = m[3];
      const ok = [ctx.fenAfter, ctx.fenMid].some((fen) => { const b = board(withTurn(fen, them)); if (!b) return false; try { b.move(san); } catch { return false; } return see(b.fen(), sq, me) > 0; });
      res.push([ok, `after ${san} the piece on ${sq} is not lost`]);
    }
    // "…e6 prepares …Bd6, to hit the pawn on h2"
    for (const m of s.matchAll(/prepares? (…?[NBRQK]?[a-h]?x?[a-h][1-8]),? to hit the (\w+) on ([a-h][1-8])/g)) {
      const san = stripSan(m[1]); const sq = m[3];
      const ok = [ctx.fenAfter, ctx.fenMid].some((fen) => { const b = board(withTurn(fen, me)); if (!b) return false; let mv; try { mv = b.move(san); } catch { return false; } const t = b.get(sq); return !!t && t.color === them && attackers(b, sq, me).includes(mv.to); });
      res.push([ok, `${san} does not hit ${sq}`]);
    }
    // "Their knight on e4 has nothing defending it"
    for (const m of s.matchAll(/(your|their) (\w+) on ([a-h][1-8]) has nothing defending it/gi)) {
      const owner = who(m[1]);
      const ok = boards.some((b) => { const p = b.get(m[3]); return !!p && p.color === owner && attackers(b, m[3], owner).length === 0; });
      res.push([ok, `${m[3]} is defended`]);
    }
    // "That wins the pawn on h3 — nothing takes it back safely"
    for (const m of s.matchAll(/wins the (\w+) on ([a-h][1-8]) — nothing takes it back safely/g)) {
      const sq = m[2];
      const b = board(ctx.fenMid); const p = b?.get(sq);
      res.push([!!p && p.color === me && see(ctx.fenMid, sq, them) <= 0, `${sq} can be taken back`]);
    }
    // "your bishop on f1 gets there via b5" — the stop is empty and not lost
    for (const m of s.matchAll(/your (\w+) on ([a-h][1-8]) (?:gets|can get) there via ([a-h][1-8])/g)) {
      const b = board(ctx.fenAfter); const via = m[3];
      const empty = !!b && !b.get(via);
      let safe = false;
      if (empty) { const c = board(withTurn(ctx.fenAfter, me)); try { c.move({ from: m[2], to: via }); safe = see(c.fen(), via, them) <= 0; } catch { safe = false; } }
      res.push([empty && safe, `route stop ${via} is ${empty ? 'lost to a capture' : 'occupied'}`]);
    }
    // "now …e6 doesn't work" — false when …e6 was their actual reply
    for (const m of s.matchAll(/now (…?[NBRQK]?[a-h]?x?[a-h][1-8])\S* doesn't work/g)) {
      const san = stripSan(m[1]); const reply = ctx.g.plies[ctx.i + 1]?.san;
      res.push([!reply || stripSan(reply) !== san, `they played ${san} anyway`]);
    }
    // "Guard it — X adds a defender to your Y on sq"
    for (const m of s.matchAll(/Guard it — (\S+) adds a defender to your (\w+) on ([a-h][1-8])/g)) {
      const san = stripSan(m[1]); const sq = m[3];
      const c = board(withTurn(ctx.fenAfter, me)); let ok = false;
      try { const before = attackers(c, sq, me).length; c.move(san); const p = c.get(sq); ok = !!p && p.color === me && attackers(c, sq, me).length > before; } catch { ok = false; }
      res.push([ok, `${san} does not add a defender to ${sq}`]);
    }
    // "Castle and the king steps off it" → castling legal
    if (/\bCastle and the king steps off it/.test(s)) {
      const b = board(withTurn(ctx.fenAfter, me));
      res.push([!!b && b.moves().some((x) => x.startsWith('O-O')), 'castling not legal']);
    }
  }

  // ENGINE: "X comes first", "The move is X", "X was cleaner", "It can wait — X",
  // "Take it — X", "Step out of it — X", "Ask the question — X", "Guard it — X", "Block it — X", "Move it — X"
  const engineClaim = /(?:It can wait|Take it|Step out of it|Ask the question|Guard it|Block it|Move it|No) — (…?\S+?)(?=[ ,.])|The move is (…?\S+?)(?=[ ,.])|(…?\S+) comes first|(…?\S+) was cleaner|but (…?\S+) was the move/g;
  for (const m of s.matchAll(engineClaim)) {
    const san = stripSan(m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5]);
    if (!/^([NBRQK][a-h]?[1-8]?x?[a-h][1-8]|[a-h](x[a-h])?[1-8](=[NBRQ])?|O-O(-O)?)$/.test(san)) continue;
    const retro = /was cleaner|was the move|The move is/.test(m[0]) && !/comes first/.test(m[0]);
    // A retrospective claim is about the board BEFORE the student's move; a
    // forward one about the board they now face.
    // Each claim is judged on the ONE board it is about; with no stored read
    // for that board it stays unchecked, never false.
    const fens = retro ? [ctx.fenBefore] : [ctx.fenAfter];
    let verdict = null;
    for (const fen of fens) {
      const lines = engineAt(ctx.g, fen);
      if (!lines) continue;
      const legal = (() => { try { new Chess(fen).move(san); return true; } catch { return false; } })();
      if (!legal) continue;
      const best = lines[0].cp;
      const hit = lines.find((l) => l.san && stripSan(l.san) === san);
      verdict = hit ? [best - hit.cp <= 60, `${san} is ${best - hit.cp}cp below best`] : [false, `${san} not in the engine's top ${lines.length}`];
      break;
    }
    if (verdict) res.push(verdict);
  }

  // "Na3 at once would have met …Rxe3+" / "Nf3 straight away would have run into …Rxe3":
  // the pair is walked from the board BEFORE the student's move.
  const hypo = /(\S+) (?:at once|straight away) would have (?:met|run into) (…?\S+?)[,.]/.exec(s);
  if (hypo) {
    const a1 = stripSan(hypo[1]); const a2 = stripSan(hypo[2]);
    const c = board(ctx.fenBefore);
    let ok = false; try { c.move(a1); c.move(a2); ok = true; } catch { ok = false; }
    res.push([ok, `${a1} then ${a2} is illegal from the board before the move`]);
  }
  // Hypothetical lines, walked as sequences from a board they can start on:
  // "Rxc7+? Then Kxc7 and fxe4 — …" and "after c5, c3, their dxc3 arrives".
  const walkLine = (sans) => [ctx.fenAfter, ctx.fenMid, ctx.fenBefore].some((fen) => { const c = board(fen); if (!c) return false; try { for (const x of sans) c.move(x); return true; } catch { return false; } });
  const lineSans = new Set();
  const qThen = /(…?\S+?)\? Then ([^—.]+?)(?: —|\.)/.exec(s);
  if (qThen) {
    const sans = [qThen[1], ...qThen[2].split(/,\s*|\s+and\s+/)].map((x) => stripSan(x.trim())).filter((x) => /^([NBRQK]|[a-h]|O-O)/.test(x));
    sans.forEach((x) => lineSans.add(x));
    res.push([walkLine(sans), `line ${sans.join(' ')} is illegal`]);
  }
  const afterLine = /after ([^.]*?), (?:their )?(…?[NBRQKa-h]\S*) (?:arrives|lands|breaks)/.exec(s);
  if (afterLine) {
    const sans = [...afterLine[1].replace(/ hitting [^,]*/g, '').split(/,\s*/), afterLine[2]].map((x) => stripSan(x.trim())).filter((x) => /^([NBRQK]|[a-h]|O-O)/.test(x));
    sans.forEach((x) => lineSans.add(x));
    res.push([walkLine(sans), `line ${sans.join(' ')} is illegal`]);
  }
  // LEGALITY: a named student/opponent move must be legal on a board it can be about.
  if (!future) {
    for (const m of s.matchAll(/(?<![\w-])(…)?([NBRQK][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8])[+#]?(?![\w-])/g)) {
      const san = m[2];
      if (hypo && (stripSan(hypo[1]) === san || stripSan(hypo[2]) === san)) continue;
      if (lineSans.has(san)) continue;
      const ok = [ctx.fenBefore, ctx.fenMid, ctx.fenAfter].some((fen) => [me, them].some((t) => { const b = board(withTurn(fen, t)); if (!b) return false; try { b.move(san); return true; } catch { return false; } }));
      if (!ok) res.push([false, `${san} is not a legal move on these boards`]);
    }
  } else {
    // walk "After A, B, C, …" sequentially from the board the student faces
    const seq = /^After ([^.]*?), (?:your|their|you|they|the|it|a|an)\b/.exec(s);
    if (seq) {
      const sans = seq[1].split(/,\s*|\s+and\s+/).map((x) => stripSan(x.trim())).filter((x) => /^([NBRQK]|[a-h]|O-O)/.test(x));
      const ok = [ctx.fenAfter, ctx.fenMid].some((fen) => { const c = board(fen); if (!c) return false; try { for (const x of sans) c.move(x); return true; } catch { return false; } });
      res.push([ok, `line ${sans.join(' ')} is illegal`]);
    }
  }
  if (!res.length) return { v: 'U' };
  const bad = res.find((r) => !r[0]);
  return bad ? { v: 'F', why: bad[1] } : { v: 'T' };
}

// ── run ────────────────────────────────────────────────────────────────────
const spokenForm = /(knight|bishop|rook|queen|king) (to|takes) [a-h]|[a-h]-pawn takes|\bcastles\b/i;
let T = 0; let F = 0; let U = 0; const falses = [];
for (const [id, rec] of Object.entries(tape)) {
  const g = games.get(id); if (!g) continue;
  const me = rec.seat === 'white' ? 'w' : 'b'; const them = other(me);
  for (const [plyS, lines] of Object.entries(rec.plies)) {
    const i = Number(plyS) - 1;
    const fenBefore = g.plies[i]?.fen; const fenMid = g.plies[i + 1]?.fen;
    const fenAfter = g.plies[i + 2]?.fen ?? (() => { const c = board(fenMid); try { c.move(g.plies[i + 1].san); return c.fen(); } catch { return fenMid; } })();
    if (!fenBefore || !fenMid) continue;
    // The last ply's reply is the COACH's own move, not in the recorded game —
    // the board the student heard is unknown here, so nothing is judged.
    if (!g.plies[i + 1]?.san || !g.plies[i + 2]) continue;
    const ctx = { g, i, me, them, fenBefore, fenMid, fenAfter };
    const seen = new Set();
    for (const line of lines) {
      if (spokenForm.test(line)) continue; // the voice's spelled-out copy of a SAN line
      for (const s of line.split(/(?<=[.!])\s+(?=[A-Z…"])/)) {
        const k = s.toLowerCase().replace(/[^a-z0-9]/g, ''); if (!k || seen.has(k)) continue; seen.add(k);
        const r = checkSentence(s, ctx);
        if (r.v === 'T') T++; else if (r.v === 'F') { F++; falses.push({ id, ply: plyS, s, why: r.why }); } else U++;
      }
    }
  }
}
const n = T + F + U;
console.log(`sentences ${n}; checked ${T + F} (${(100 * (T + F) / Math.max(1, n)).toFixed(0)}% coverage); TRUE ${T} FALSE ${F}; ACCURACY ${(100 * T / Math.max(1, T + F)).toFixed(1)}%`);
for (const f of falses.slice(0, SHOW)) console.log(`✗ ${f.id}:${f.ply} [${f.why}] ${f.s.slice(0, 160)}`);
