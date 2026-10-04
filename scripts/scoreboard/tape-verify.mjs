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
    const white = l.mate !== null && l.mate !== undefined ? (l.mate > 0 ? 10000 - l.mate : -10000 - l.mate) : l.cp;
    // STORED SCORES ARE WHITE'S POINT OF VIEW (verified 2026-09-30 by six
    // independent readers). Before this conversion, every engine claim on a
    // Black-to-move board passed: best − hit went negative, always ≤ 60.
    return { san, cp: fen.split(' ')[1] === 'b' ? -white : white };
  }).sort((a, b) => b.cp - a.cp);
}
const stripSan = (s) => s.replace(/^…|^\.\.\./, '').replace(/[+#!?]+$/, '');

// ── sentence verifiers ─────────────────────────────────────────────────────
// ctx: { g, me, them, fenBefore, fenMid (after student), fenAfter (after reply), taggedFen (the board the page graded the fact on, when the tape has it — plan 1.6) }
function checkSentence(s, ctx) {
  const res = []; // [ok, why]
  const { me, them } = ctx;
  const boards = [ctx.fenAfter, ctx.fenMid].map(board).filter(Boolean);
  const who = (w) => (/^(your|you)$/i.test(w) ? me : /^(their|they|my)$/i.test(w) ? them : null);
  // A sentence about a FUTURE board ("After X, Y, …", "if …", "would") is about
  // a line, not this position: only its moves' legality is checked.
  const future = /^(After |If |Then |Once )/.test(s) || /was waiting deeper|deeper in the line|\bonce you\b/.test(s);

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
    // "exd5 didn't work: exd5, Bxd5 and hxg2 — you come out behind on material,
    // two pawns for a bishop" / "— they win a bishop" (the found-move verdict,
    // P2 #2). The line is the ALTERNATIVE, played from the board BEFORE the
    // student's move — replay it there, check every move is legal and the
    // claimed result (the mover ends behind on material).
    for (const m of s.matchAll(/(…?\S+) didn't work: ([^—]+?) — (you come out behind on material|they win (?:a|an|the|two) \w+)/g)) {
      const b = board(ctx.fenBefore); if (!b) continue;
      const mover = b.turn(); const V = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
      const mat = (c, col) => c.board().flat().filter((q) => q && q.color === col).reduce((t, q) => t + V[q.type], 0);
      const start = mat(b, mover) - mat(b, other(mover));
      let legal = true;
      for (const tok of m[2].split(/,\s*|\s+and\s+/).map((t) => stripSan(t.trim())).filter(Boolean)) {
        try { b.move(tok); } catch { legal = false; break; }
      }
      if (!legal) { res.push([false, `the line after ${m[1]} is not legal from the board before the move`]); continue; }
      const end = mat(b, mover) - mat(b, other(mover));
      res.push([end < start, `after ${m[1]}'s line the mover is not behind on material`]);
    }
    // "…X doesn't work: the knight would just be taken on c5" / "…lost on f4"
    for (const m of s.matchAll(/(…?[NBRQK]?[a-h]?x?[a-h][1-8]) (?:doesn't work|isn't possible any more): the (\w+) would just be (?:taken|lost) on ([a-h][1-8])/g)) {
      const san = stripSan(m[1]); const sq = m[3];
      const ok = [ctx.fenAfter, ctx.fenMid].some((fen) => { const b = board(withTurn(fen, them)); if (!b) return false; try { b.move(san); } catch { return false; } return see(b.fen(), sq, me) > 0; });
      res.push([ok, `after ${san} the piece on ${sq} is not lost`]);
    }
    // "…e6 prepares …Bd6, to hit the pawn on h2"
    for (const m of s.matchAll(/prepares? (…?[NBRQK]?[a-h]?x?[a-h][1-8]),? to hit (?:the|their|your) (\w+) on ([a-h][1-8])/g)) {
      const san = stripSan(m[1]); const sq = m[3];
      // WHOSE plan: "Their …Nd5 prepares …f6" is the OPPONENT's move (run J —
      // the verifier played every such move for the student, and three true
      // lines read false).
      const mover = /^Their /.test(s) ? them : me; const target = mover === me ? them : me;
      const ok = [ctx.fenAfter, ctx.fenMid].some((fen) => { const b = board(withTurn(fen, mover)); if (!b) return false; let mv; try { mv = b.move(san); } catch { return false; } const t = b.get(sq); return !!t && t.color === target && attackers(b, sq, mover).includes(mv.to); });
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
    // "Their pawns on the d-file are doubled"
    for (const m of s.matchAll(/(Their|Your) pawns on the ([a-h])-file are doubled/g)) {
      const col = who(m[1]); const b = boards[0]; let n = 0; for (let r = 1; r <= 8; r++) { const p = b.get(`${m[2]}${r}`); if (p?.type === 'p' && p.color === col) n++; }
      res.push([n >= 2, `${m[2]}-file has ${n} such pawns`]);
    }
    // "They still have 3 minor pieces at home"
    for (const m of s.matchAll(/(They|You) still have (\d+) minor pieces? at home/g)) {
      const col = who(m[1]); const home = col === 'w' ? ['b1', 'g1', 'c1', 'f1'] : ['b8', 'g8', 'c8', 'f8'];
      const n = home.filter((sq) => boards.some((b) => { const p = b.get(sq); return p && p.color === col && (p.type === 'n' || p.type === 'b'); })).length;
      res.push([n === Number(m[2]), `${n} minors at home, not ${m[2]}`]);
    }
    // "…d6 shuts in their own bishop on c5 — the pawn now sits on its colour"
    for (const m of s.matchAll(/(\S+) shuts in (?:their|your) own bishop on ([a-h][1-8])/g)) {
      const pawnSq = stripSan(m[1]).match(/[a-h][1-8]/)?.[0]; const bSq = m[2];
      const colour = (sq) => (FILES.indexOf(sq[0]) + Number(sq[1])) % 2;
      res.push([!!pawnSq && colour(pawnSq) === colour(bSq), `pawn on ${pawnSq} is not on the bishop's colour`]);
    }
    // "back-rank threat: the king on g1 has no escape square"
    for (const m of s.matchAll(/the king on ([a-h][1-8]) has no escape square/g)) {
      const b = boards[0]; const k = b.get(m[1]);
      let ok = !!k && k.type === 'k';
      if (ok) { const c = board(withTurn(ctx.fenAfter, k.color)); ok = !c.moves({ square: m[1], verbose: true }).some((mv) => mv.to[1] !== m[1][1]); }
      res.push([ok, `king on ${m[1]} has an escape off the rank`]);
    }
    // "Bg7 first, so you can castle next"
    for (const m of s.matchAll(/(…?\S+) first, so you can castle next/g)) {
      const c = board(withTurn(ctx.fenMid, me));
      res.push([!!c && c.moves().some((x) => x.startsWith('O-O')), 'castling not legal after it']);
    }
    // "…Bc6 moves the same piece twice … but here it hits the pawn on g2"
    for (const m of s.matchAll(/(\S+) moves the same piece twice[^.]*hits the (\w+) on ([a-h][1-8])/g)) {
      const to = stripSan(m[1]).match(/[a-h][1-8]$/)?.[0]; const b = board(ctx.fenMid);
      res.push([!!to && !!b && attackers(b, m[3], me).includes(to), `${to} does not hit ${m[3]}`]);
    }
    // "Nxf2 was the move — it would take the pawn on f2"
    for (const m of s.matchAll(/(\S+) was the move — it would take the (\w+) on ([a-h][1-8])/g)) {
      const c = board(ctx.fenBefore); let ok = false; try { const mv = c.move(stripSan(m[1])); ok = mv.to === m[3] && !!mv.captured; } catch { ok = false; }
      res.push([ok, `${m[1]} does not take on ${m[3]}`]);
    }
    // "You have a pawn break on c3" / "They have a pawn break available on c5"
    for (const m of s.matchAll(/(You|They) have a pawn break (?:available )?on ([a-h][1-8])/g)) {
      const col = who(m[1]); const c = board(withTurn(ctx.fenAfter, col));
      res.push([!!c && c.moves({ verbose: true }).some((mv) => mv.piece === 'p' && mv.to === m[2]), `no ${m[1]} pawn can reach ${m[2]}`]);
    }
    // "You're 5 points up"
    for (const m of s.matchAll(/You're (\d+) points? (up|down)/g)) {
      const b = boards[0]; let d = 0; for (const row of b.board()) for (const p of row) if (p && p.type !== 'k') d += (p.color === me ? 1 : -1) * VAL[p.type];
      const want = Number(m[1]) * (m[2] === 'up' ? 1 : -1);
      res.push([Math.abs(d - want) <= 1, `material is ${d}, not ${want}`]);
    }
    // "Castle and the king steps off it" → castling legal
    if (/\bCastle and the king steps off it/.test(s)) {
      const b = board(withTurn(ctx.fenAfter, me));
      res.push([!!b && b.moves().some((x) => x.startsWith('O-O')), 'castling not legal']);
    }
  }

  // ── 2026-09-30 manual-check classes (WO-TEACH-GAPS P0.2) ──
  if (!future) {
    const ownPawnOnFile = (b, col, f) => { for (let r = 1; r <= 8; r++) { const p = b.get(`${f}${r}`); if (p?.type === 'p' && p.color === col) return true; } return false; };
    // "Their plan is taking shape: the c-file" — the side's own pawn is off it.
    for (const m of s.matchAll(/(Their|Your) plan is taking shape: the ([a-h])-file|(?:what they are after|Here is what they are after): the ([a-h])-file/g)) {
      const col = m[1] ? who(m[1]) : them; const f = m[2] ?? m[3];
      res.push([boards.some((b) => !ownPawnOnFile(b, col, f)), `${m[1] ?? 'their'} own pawn stands on the ${f}-file`]);
    }
    // "It's a step toward the c-file" — the moved piece is a rook or queen.
    for (const m of s.matchAll(/(?:a step|another step) toward the ([a-h])-file/g)) {
      const mv = ctx.g.plies[ctx.i]?.san ?? '';
      const theirMv = ctx.g.plies[ctx.i + 1]?.san ?? '';
      res.push([/^[RQ]/.test(stripSan(mv)) || /^[RQ]/.test(stripSan(theirMv)), `the move toward the ${m[1]}-file was not a rook or queen`]);
    }
    // "The point of X: it takes Y away" / "X — now Y doesn't work" / "X stops Y":
    // Y must be illegal, or lose material, or rank well below their best.
    for (const m of s.matchAll(/(?:it takes (…?[NBRQK]?[a-h]?x?[a-h][1-8]\S*) away|stops (?:your )?(…?[NBRQK]?[a-h]?x?[a-h][1-8]\S*))/g)) {
      const san = stripSan(m[1] ?? m[2]);
      const fen = /^Their /.test(s) ? ctx.fenAfter : ctx.fenMid;
      const side = /^Their /.test(s) ? me : them;
      const b = board(withTurn(fen, side)); if (!b) continue;
      let mv = null; try { mv = b.move(san); } catch { mv = null; }
      if (!mv) { res.push([true, '']); continue; }
      const loses = see(b.fen(), mv.to, side === 'w' ? 'b' : 'w') > (mv.captured ? VAL[mv.captured] : 0);
      const lines = engineAt(ctx.g, withTurn(fen, side)) ?? engineAt(ctx.g, fen);
      const hit = lines?.find((l) => l.san && stripSan(l.san) === san);
      const fine = !loses && hit && lines && lines[0].cp - hit.cp < 60;
      res.push([!fine, `${san} is still fine after it (legal, safe${hit ? `, ${lines[0].cp - hit.cp}cp off best` : ''})`]);
    }
    // "Can you take the X on sq? No — it's bait: A runs into B" — the best move
    // does not itself capture on sq.
    for (const m of s.matchAll(/Can you take the \w+ on ([a-h][1-8])\? .*?No — it's bait/g)) {
      const lines = engineAt(ctx.g, ctx.fenAfter);
      if (!lines?.[0]?.san) continue;
      const best = board(ctx.fenAfter)?.moves({ verbose: true }).find((x) => x.san === lines[0].san);
      res.push([!(best && best.to === m[1] && best.captured), `the best move ${lines[0].san} takes on ${m[1]} itself`]);
    }
    // "The bishop on f6 hangs after this" — net of what the move captured.
    for (const m of s.matchAll(/The (\w+) on ([a-h][1-8]) hangs after this/g)) {
      const mv = board(ctx.fenBefore)?.moves({ verbose: true }).find((x) => x.san === stripSan(ctx.g.plies[ctx.i]?.san ?? ''));
      const took = mv?.captured && mv.to === m[2] ? VAL[mv.captured] : 0;
      res.push([see(ctx.fenMid, m[2], them) - took >= 2, `${m[2]} was a trade, not a hanging piece`]);
    }
    // "N challenges it" — the challenger is not taken by a cheaper piece.
    for (const m of s.matchAll(/— (…?[NBRQ][a-h]?[1-8]?[a-h][1-8]) challenges it/g)) {
      const c = board(withTurn(ctx.fenAfter, me)); let ok = false;
      try { const mv = c.move(stripSan(m[1])); const cheap = attackers(c, mv.to, them).map((sq) => VAL[c.get(sq).type]); ok = !cheap.some((v) => v < VAL[mv.piece]); } catch { ok = false; }
      res.push([ok, `${m[1]} is simply taken by a cheaper piece`]);
    }
    // "Your king's cover is thin — N of the pawns in front of it are gone"
    for (const m of s.matchAll(/king's cover is thin — (\d|all three) of the pawns/g)) {
      const want = m[1] === 'all three' ? 3 : Number(m[1]);
      const b = boards[0]; const k = b.board().flat().find((x) => x && x.type === 'k' && x.color === me);
      if (!k) continue;
      const f = FILES.indexOf(k.square[0]); const shelterRank = me === 'w' ? 2 : 7; const step = me === 'w' ? 1 : -1;
      let gone = 0;
      for (const df of [-1, 0, 1]) { const nf = f + df; if (nf < 0 || nf > 7) continue; const a = `${FILES[nf]}${shelterRank}`; const z = `${FILES[nf]}${shelterRank + step}`; const own = (sq) => { const p = b.get(sq); return p?.type === 'p' && p.color === me; }; if (!own(a) && !own(z)) gone++; }
      res.push([gone === want, `${gone} shield pawns gone, not ${want}`]);
    }
    // "c5 is a weak pawn now" — isolated or backward on the board after the reply.
    for (const m of s.matchAll(/([a-h][1-8]) is a weak pawn now|no pawn beside ([a-h][1-8]) can defend it|the pawn on ([a-h][1-8]) is now a weakness/g)) {
      const sq = m[1] ?? m[2] ?? m[3]; const b = board(ctx.fenAfter); const p = b?.get(sq);
      if (!p || p.type !== 'p') { res.push([false, `no pawn on ${sq}`]); continue; }
      const f = FILES.indexOf(sq[0]); const neighbours = b.board().flat().filter((x) => x && x.type === 'p' && x.color === p.color && Math.abs(FILES.indexOf(x.square[0]) - f) === 1);
      const dir = p.color === 'w' ? 1 : -1;
      const backward = !neighbours.some((q) => (Number(sq[1]) - Number(q.square[1])) * dir >= 0);
      res.push([neighbours.length === 0 || backward, `${sq} has a pawn beside or behind it`]);
    }
    // "the tactics have settled" / "it is a quiet game now" — no capture wins by exchange.
    if (/tactics have settled|quiet game now/.test(s)) {
      const wins2 = (fen, by) => { const b = board(fen); return !!b && b.board().flat().some((x) => x && x.color !== by && x.type !== 'k' && see(fen, x.square, by) > 0); };
      res.push([![ctx.fenAfter].some((fen) => wins2(fen, me) || wins2(fen, them)), 'material is still loose on the board']);
    }
  }

  // ENGINE: "X comes first", "The move is X", "X was cleaner", "It can wait — X",
  // "Take it — X", "Step out of it — X", "Ask the question — X", "Guard it — X", "Block it — X", "Move it — X"
  const engineClaim = /(?:It can wait|Take it|Step out of it|Ask the question|Guard it|Block it|Move it|No) — (…?\S+?)(?=[ ,.])|The move is (…?\S+?)(?=[ ,.])|(…?\S+) comes first|(…?\S+) was cleaner|but (…?\S+) was the move|Move it with gain — [^:.]*: (…?\S+?)(?=\.)/g;
  for (const m of s.matchAll(engineClaim)) {
    const san = stripSan(m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? m[6]);
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
  // PLAYED-OUT LINES (lineCalc, 2026-09-30): "That wins a pawn: Nxd5 cxd5 …",
  // "The line: … — they come out X up.", "The engine punishes f6: …",
  // "It is a forced mate: …". Walked IN ORDER from a board the line can start
  // on; a "wins N" claim is checked against the material the walk actually
  // changes hands, and a mate line must end in checkmate.
  const WORTH = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const AMOUNT = { 'a pawn': 1, 'two pawns': 2, 'a piece': 3, 'a piece and a pawn': 4, 'the exchange': 2, 'a rook and a pawn': 6, 'the queen': 9 };
  for (const m of s.matchAll(/(?:(?:That|It) wins ([^:]+)|The line|The engine punishes \S+|It is a forced mate|is mate\.)[:]?\s((?:…?(?:[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?|O-O(?:-O)?)[+#]?\s?)+)/g)) {
    const sans = m[2].trim().split(/\s+/).map((x) => stripSan(x));
    if (sans.length < 2) continue;
    sans.forEach((x) => lineSans.add(x));
    let walked = null;
    for (const fen of [ctx.fenBefore, ctx.fenMid, ctx.fenAfter]) {
      const c = board(fen); if (!c) continue;
      const mover = c.turn();
      try { let net = 0; for (const x of sans) { const mv = c.move(x); if (mv.captured) net += (mv.color === mover ? 1 : -1) * WORTH[mv.captured]; } walked = { net, mate: c.isCheckmate() }; break; } catch { /* next board */ }
    }
    if (!walked) { res.push([false, `line ${sans.join(' ')} is illegal`]); continue; }
    if (/forced mate|is mate/.test(m[0]) || /#$/.test(m[2].trim())) { res.push([walked.mate, `line ${sans.join(' ')} does not end in mate`]); continue; }
    const claim = m[1] ? AMOUNT[m[1].trim()] ?? Number((/^(\d+) points/.exec(m[1].trim()) ?? [])[1]) : null;
    if (claim) res.push([Math.abs(walked.net) === claim, `line nets ${walked.net}, said ${m[1].trim()}`]);
    else res.push([true, 'line legal']);
  }
  // "Why not X? It grabs …, but Y refutes it." — Y answers X, so walk them together.
  const whyNot = /Why not (…?\S+?)\?[^.]*?, but (…?\S+?) refutes it/.exec(s);
  if (whyNot) {
    const sans = [whyNot[1], whyNot[2]].map((x) => stripSan(x.trim()));
    sans.forEach((x) => lineSans.add(x));
    res.push([walkLine(sans), `line ${sans.join(' ')} is illegal`]);
  }
  // LEGALITY: a named student/opponent move must be legal on a board it can be about.
  if (!future) {
    // Moves inside a found-move line ("X didn't work: X, Y and Z — …") were
    // replayed from the board before the move by their own verifier.
    for (const m of s.matchAll(/didn't work: ([^—]+?) —/g)) for (const t of m[1].split(/,\s*|\s+and\s+/)) lineSans.add(stripSan(t.trim()));
    for (const m of s.matchAll(/(?<![\w-])(…)?([NBRQK][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8])[+#]?(?![\w-])/g)) {
      const san = m[2];
      if (hypo && (stripSan(hypo[1]) === san || stripSan(hypo[2]) === san)) continue;
      if (lineSans.has(san)) continue;
      // A verdict on the student's PREVIOUS move ("Bxf6+ still wins") is heard
      // after the reply, two plies on — its move is legal on the board before it.
      const ok = [ctx.g.plies[ctx.i - 2]?.fen, ctx.fenBefore, ctx.fenMid, ctx.fenAfter].filter(Boolean).some((fen) => [me, them].some((t) => { const b = board(withTurn(fen, t)); if (!b) return false; try { b.move(san); return true; } catch { return false; } }));
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
  if (!future) {
    const pawnsOf = (b, c) => b.board().flat().filter((x) => x && x.type === 'p' && x.color === c).map((x) => x.square);
    // "The isolated pawn on d5" — no pawn of its side on a neighbouring file.
    for (const m of s.matchAll(/isolated (?:queen[’']s )?pawn on ([a-h][1-8])/gi)) {
      // "X, which would leave an isolated pawn on f3" is about the board AFTER
      // X — play it first (run I, 1rcE ply 55: gxf3 would, and it does).
      const hypo = /(\S+), which would leave an isolated/.exec(s);
      const iso = (b) => { const p = b.get(m[1]); if (!p || p.type !== 'p') return false; const f = FILES.indexOf(m[1][0]); return !pawnsOf(b, p.color).some((q) => Math.abs(FILES.indexOf(q[0]) - f) === 1); };
      let ok;
      if (hypo) {
        const san = stripSan(hypo[1]);
        ok = [ctx.fenAfter, ctx.fenMid, ctx.fenBefore].some((fen) => [me, them].some((t) => { const c = board(withTurn(fen, t)); if (!c) return false; try { c.move(san); } catch { return false; } return iso(c); }));
      } else ok = boards.some(iso);
      res.push([ok, `${m[1]} is not an isolated pawn`]);
    }
    // "The backward pawn on e6" — no neighbouring pawn of its side level with it or behind it.
    for (const m of s.matchAll(/backward pawn on ([a-h][1-8])/gi)) {
      const ok = boards.some((b) => { const p = b.get(m[1]); if (!p || p.type !== 'p') return false; const f = FILES.indexOf(m[1][0]); const r = Number(m[1][1]); const dir = p.color === 'w' ? 1 : -1; return !pawnsOf(b, p.color).some((q) => Math.abs(FILES.indexOf(q[0]) - f) === 1 && (Number(q[1]) - r) * dir <= 0); });
      res.push([ok, `${m[1]} is not a backward pawn`]);
    }
    // "Now you have the two bishops"
    if (/you have the two bishops/i.test(s)) {
      const count = (b, c) => b.board().flat().filter((x) => x && x.type === 'b' && x.color === c).length;
      res.push([boards.some((b) => count(b, me) === 2 && count(b, them) < 2), 'the student does not have the bishop pair']);
    }
    // "d5 is the pawn break … ready now" / "You have a pawn break on d5"
    for (const m of s.matchAll(/([a-h][1-8]) is the pawn break|pawn break on ([a-h][1-8])/gi)) {
      const sq = m[1] ?? m[2];
      const theirs = /^They /.test(s);
      const side = theirs ? them : me;
      const ok = [ctx.fenAfter, ctx.fenMid].some((fen) => { const b = board(withTurn(fen, side)); return !!b && b.moves({ verbose: true }).some((x) => x.piece === 'p' && x.to === sq); });
      res.push([ok, `no pawn move to ${sq}`]);
    }
    // "there is a tactic on the board" / "a tactic is live" — some capture wins by exchange.
    const wins = (fen, by) => { const b = board(fen); if (!b) return false; return b.board().flat().some((x) => x && x.color !== by && x.type !== 'k' && see(fen, x.square, by) > 0); };
    if (/tactic on the board|a tactic is live/i.test(s)) {
      // The app's own read also counts detected forks/pins, which a capture scan
      // cannot see — so a miss here stays UNCHECKED, never false.
      if ([ctx.fenAfter, ctx.fenMid].some((fen) => wins(fen, me) || wins(fen, them))) res.push([true, '']);
    }
  }
  if (!res.length) {
    // A method, a definition, a question: advice, not a claim about this board.
    if (/\?$|^(Remember —|Here's how|The habit that fixes it|Next time|Follow every forcing|If the line ends|Only when none|Calculate to|Scan forcing|Count it|Look one move ahead|Check\.$|The thread was lost|Before you leave theory|If you cannot say)/.test(s.trim())) return { v: 'N' };
    return { v: 'U' };
  }
  const bad = res.find((r) => !r[0]);
  return bad ? { v: 'F', why: bad[1] } : { v: 'T' };
}

// ── run ────────────────────────────────────────────────────────────────────
const spokenForm = /(knight|bishop|rook|queen|king) (to|takes) [a-h]|[a-h]-pawn takes|\bcastles\b/i;
let T = 0; let F = 0; let U = 0; let N = 0; const falses = []; const unchecked = []; const dumpU = [];
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
        // BOARD TAG (plan 1.6): the board the page graded this fact on, when
        // the tape recorded it — shown with every FALSE and in the dump, so a
        // manual pass reads that board instead of guessing among three.
        const probe = k.slice(0, 40);
        const taggedFen = (rec.boards?.[plyS] ?? []).find((b) => b.text.toLowerCase().replace(/[^a-z0-9]/g, '').includes(probe))?.fen ?? null;
        const r = checkSentence(s, { ...ctx, taggedFen });
        if (r.v === 'T') T++; else if (r.v === 'F') { F++; falses.push({ id, ply: plyS, s, why: r.why, taggedFen }); } else if (r.v === 'N') N++; else { U++; unchecked.push(s.slice(0, 140)); dumpU.push({ id, ply: plyS, seat: rec.seat, s, fenBefore, fenMid, fenAfter, taggedFen, lines: [g.plies[i]?.lines, g.plies[i + 1]?.lines, g.plies[i + 2]?.lines].map((ls) => (ls ?? []).slice(0, 3).map((l) => ({ cp: l.cp, mate: l.mate, pv: (l.pv ?? []).slice(0, 6) }))) }); }
      }
    }
  }
}
const n = T + F + U;
console.log(`sentences ${n + N} (${N} advice, no board claim); claims ${n}; checked ${T + F} (${(100 * (T + F) / Math.max(1, n)).toFixed(0)}% coverage); TRUE ${T} FALSE ${F}; ACCURACY ${(100 * T / Math.max(1, T + F)).toFixed(1)}%`);
if (process.env.SHOW_U) for (const u of unchecked) console.log(`? ${u}`);
for (const f of falses.slice(0, SHOW)) console.log(`✗ ${f.id}:${f.ply} [${f.why}] ${f.s.slice(0, 160)}${f.taggedFen ? `\n    graded on: ${f.taggedFen}` : ''}`);
if (process.env.DUMP_U) (await import('node:fs')).writeFileSync(process.env.DUMP_U, JSON.stringify(dumpU, null, 1));
