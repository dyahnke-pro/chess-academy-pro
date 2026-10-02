#!/usr/bin/env node
/**
 * claim-verify — pass 2 of the CLAIM CHECKER (2026-09-27).
 *
 * Reads what the coach's computers SAID (audit-reports/claim-check/harvest.json,
 * written by `CLAIM_CHECK=1 npx vitest run src/services/claimChecker.measure.test.ts`) and checks each claim
 * against the board (chess.js) and the engine (the corpus's MultiPV reads).
 *
 * 🔒 INDEPENDENT BY DESIGN. Nothing here imports app code. A verifier that
 * called the same helper as the computer it checks would agree with it by
 * construction and prove nothing — the failure this whole instrument exists to
 * end. Each check is a second, plain implementation of what the sentence
 * asserts, and where a board test cannot settle it, the engine does.
 *
 * Verdicts: TRUE, FALSE (with the reason), or UNVERIFIED (judgment the board
 * cannot prove — counted and sampled, never silently passed).
 *
 * Usage: node scripts/claim-verify.mjs [--examples 3]
 * Output: audit-reports/claim-check/verdicts.json + a ranked console report.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const EXAMPLES = Number(arg('--examples', 3));
const harvest = JSON.parse(readFileSync('audit-reports/claim-check/harvest.json', 'utf8'));

// Engine reads by FEN (position part), from both corpora.
const LINES = new Map();
for (const p of ['data/sources/acc-naro/multipv-d14.json', 'data/sources/acc-corpus/multipv-d14.json']) {
  if (!existsSync(p)) continue;
  for (const g of JSON.parse(readFileSync(p, 'utf8'))) for (const ply of g.plies) LINES.set(fkey(ply.fen), ply.lines);
}
function fkey(fen) { return fen.split(' ').slice(0, 4).join(' '); }

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const NAME = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
const FILES = 'abcdefgh';
const board = (fen) => new Chess(fen);
const other = (c) => (c === 'w' ? 'b' : 'w');
const at = (b, sq) => b.get(sq);
const withTurn = (fen, turn) => { const p = fen.split(' '); p[1] = turn; p[3] = '-'; return p.join(' '); };

/** Attackers of `sq` by colour `by`, by walking the geometry — not chess.js's
 *  own helper, so an attack bug there cannot hide here. Pins ignored. */
function attackers(b, sq, by) {
  const out = [];
  const f = FILES.indexOf(sq[0]); const r = Number(sq[1]);
  const on = (ff, rr) => (ff >= 0 && ff < 8 && rr >= 1 && rr <= 8 ? `${FILES[ff]}${rr}` : null);
  const push = (s, types) => { if (!s) return; const p = at(b, s); if (p && p.color === by && types.includes(p.type)) out.push(s); };
  const pd = by === 'w' ? -1 : 1; push(on(f - 1, r + pd), ['p']); push(on(f + 1, r + pd), ['p']);
  for (const [df, dr] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) push(on(f + df, r + dr), ['n']);
  for (let df = -1; df <= 1; df += 1) for (let dr = -1; dr <= 1; dr += 1) if (df || dr) push(on(f + df, r + dr), ['k']);
  const ray = (df, dr, types) => { let ff = f + df; let rr = r + dr; for (;;) { const s = on(ff, rr); if (!s) return; const p = at(b, s); if (p) { if (p.color === by && types.includes(p.type)) out.push(s); return; } ff += df; rr += dr; } };
  for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ray(df, dr, ['r', 'q']);
  for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) ray(df, dr, ['b', 'q']);
  return out;
}

/** Static exchange on `sq`, `by` capturing first. Net material for `by` (≥0
 *  means the capture sequence does not lose). Least-valuable attacker first,
 *  either side may stop. */
function see(fen, sq, by) {
  const b = board(withTurn(fen, by));
  const target = at(b, sq); if (!target || target.color === by) return 0;
  const gains = []; let side = by; let onSq = target.type;
  const removed = new Set();
  // The king captures LAST, and only onto a square the other side no longer
  // covers (it had k=0 and sorted first, so every exchange with a king in it
  // was misread — claim check 2026-09-28).
  const ORDER = (t) => (t === 'k' ? 1000 : VAL[t]);
  const liveAtt = (col) => attackers(b, sq, col).filter((s) => !removed.has(s)).sort((x, y) => ORDER(at(b, x).type) - ORDER(at(b, y).type));
  for (let depth = 0; depth < 32; depth += 1) {
    const a = liveAtt(side)[0]; if (!a) break;
    if (at(b, a).type === 'k' && liveAtt(other(side)).length > 0) break;
    gains.push(VAL[onSq] === 0 && onSq === 'k' ? 100 : VAL[onSq]);
    onSq = at(b, a).type; removed.add(a);
    b.remove(a); // x-rays behind it now count
    side = other(side);
  }
  let v = 0; for (let i = gains.length - 1; i >= 0; i -= 1) v = Math.max(0, gains[i] - v);
  return gains.length ? v : 0;
}

function material(fen, col) { let s = 0; for (const row of board(fen).board()) for (const c of row) if (c && c.color === col) s += VAL[c.type]; return s; }
function pawnsOnFile(b, file, col) { const out = []; for (let r = 1; r <= 8; r += 1) { const p = at(b, `${file}${r}`); if (p && p.type === 'p' && (!col || p.color === col)) out.push(`${file}${r}`); } return out; }
function isPassed(b, sq, col) {
  const f = FILES.indexOf(sq[0]); const r = Number(sq[1]);
  for (const df of [-1, 0, 1]) { const ff = f + df; if (ff < 0 || ff > 7) continue;
    for (let rr = 1; rr <= 8; rr += 1) { const p = at(b, `${FILES[ff]}${rr}`); if (p && p.type === 'p' && p.color !== col && (col === 'w' ? rr > r : rr < r)) return false; } }
  return true;
}
/** A square no pawn of `col` can EVER attack (the hole definition). */
function noPawnCanAttack(b, sq, col) {
  const f = FILES.indexOf(sq[0]); const r = Number(sq[1]);
  for (const df of [-1, 1]) { const ff = f + df; if (ff < 0 || ff > 7) continue;
    for (let rr = 1; rr <= 8; rr += 1) { const p = at(b, `${FILES[ff]}${rr}`); if (p && p.type === 'p' && p.color === col && (col === 'w' ? rr < r : rr > r)) return false; } }
  return true;
}

const sc = (x) => (x.seat === 'white' ? 'w' : 'b');
const oc = (x) => other(sc(x));
const seatSign = (x) => (x.seat === 'white' ? 1 : -1);
const lineCp = (l) => (l.mate !== null ? (l.mate > 0 ? 100000 : -100000) : l.cp);
const T = (why) => ({ v: 'TRUE', why });
const F = (why) => ({ v: 'FALSE', why });
const U = (why) => ({ v: 'UNVERIFIED', why });

function fileClaims(x, b, text) {
  const res = [];
  const found = [...text.matchAll(/\b(?:the )?([a-h])[- ]file is (open|half-open)/gi)].map((m) => ({ f: m[1], kind: m[2], index: m.index }))
    .concat([...text.matchAll(/\bthe (open|half-open) ([a-h])-file/gi)].map((m) => ({ f: m[2], kind: m[1], index: m.index })));
  for (const m0 of found) {
    const m = [null, m0.f, m0.kind]; m.index = m0.index;
    const f = m[1].toLowerCase(); const wp = pawnsOnFile(b, f, 'w').length; const bp = pawnsOnFile(b, f, 'b').length;
    const mine = /\btheir\b/i.test(text.slice(0, m.index)) ? oc(x) : sc(x);
    const myP = mine === 'w' ? wp : bp;
    if (m[2].toLowerCase() === 'open' && (wp || bp)) res.push(F(`${f}-file called open but has pawns (w${wp} b${bp})`));
    else if (m[2].toLowerCase() === 'half-open' && myP) res.push(F(`${f}-file called half-open for a side with a pawn on it`));
    else res.push(T(`${f}-file ${m[2]}`));
  }
  return res;
}

/** The board a hypothetical sentence is about: "After A, B, C, …" plays the
 *  moves from the current board; other future phrasings are skipped. */
function hypotheticalBoard(x, b, t) {
  const after = /^After ([^—]+?), (?:your|their|the|you|they)\b/.exec(t);
  if (after) {
    const c = board(b.fen());
    for (const san of after[1].split(/,\s*/)) { try { c.move(san.trim()); } catch { return 'skip'; } }
    return c;
  }
  if (/before you trade|the idea is to|\? (?:That|Then)|would|was the move|if they|if you/i.test(t)) return 'skip';
  return null;
}

function verify(x) {
  const b = board(x.probe);
  const me = sc(x); const them = oc(x);
  const t = x.text;
  const K = `${x.lane}:${x.kind}`;

  // HYPOTHETICAL SENTENCES describe a board that is not on the board yet:
  // "After Bg4, …", "before you trade on d4: …", "Qxa8? That drops…", "the idea
  // is to create a passed pawn on g4". Their piece claims are checked on the
  // board the sentence names, or not at all — never on the current one.
  const hypo = hypotheticalBoard(x, b, t);
  const claimBoards = hypo === 'skip' ? null : [hypo ?? b];
  // Piece-on-square claims: every "<piece> on <sq>" named must stand there.
  if (claimBoards) for (const m of t.matchAll(/\b(your|their|my)?\s*(king|queen|rook|bishop|knight|pawn)s? on ([a-h][1-8])\b/gi)) {
    const cb = claimBoards[0];
    const p = at(cb, m[3]);
    if (!p || p.type !== NAME[m[2].toLowerCase()]) {
      // The backward look talks about the position BEFORE the reply; accept either board.
      const alt = [x.fenBefore, (() => { try { const c = board(x.fenBefore); c.move(x.san); return c.fen(); } catch { return null; } })()].filter(Boolean);
      const okElsewhere = alt.some((fen) => { const q = board(fen).get(m[3]); return q && q.type === NAME[m[2].toLowerCase()]; });
      if (!okElsewhere) return F(`says ${m[2]} on ${m[3]}; board has ${p ? p.type : 'nothing'}`);
    }
  }

  switch (K) {
    case 'behavior:open-file': case 'positional:file': case 'behavior:piece-activity': case 'positional:piece': {
      const r = fileClaims(x, b, t); if (!r.length) return U('no file claim parsed');
      return r.find((y) => y.v === 'FALSE') ?? r[0];
    }
    case 'positional:king': case 'behavior:king-safety': {
      const r = fileClaims(x, b, t.replace(/\b([a-h]) file\b/, '$1-file is open')); // "the d file is open toward"
      if (/castling is one move away/.test(t)) {
        const c = board(withTurn(x.probe, me)); const ok = c.moves({ verbose: true }).some((m) => m.flags.includes('k') || m.flags.includes('q'));
        return ok ? T('castling legal next move') : F('castling not legal next move');
      }
      return r.find((y) => y.v === 'FALSE') ?? r[0] ?? U('king line not parsed');
    }
    case 'behavior:weak-square': {
      const sq = /([a-h][1-8]) is a hole/.exec(t)?.[1]; if (!sq) return U('no square');
      if (!noPawnCanAttack(b, sq, them)) return F(`${sq}: a ${them} pawn can still attack it`);
      const minors = attackers(b, sq, them).filter((s) => ['n', 'b'].includes(at(b, s).type));
      if (minors.length) return F(`${sq}: covered by their ${at(b, minors[0]).type} on ${minors[0]}`);
      return T('hole');
    }
    case 'behavior:pawn-structure': case 'positional:structure': {
      const m = /(backward|isolated) pawn on ([a-h][1-8])/.exec(t);
      if (m) {
        const sq = m[2]; const p = at(b, sq); if (!p || p.type !== 'p') return F(`no pawn on ${sq}`);
        const f = FILES.indexOf(sq[0]); const adj = [f - 1, f + 1].filter((z) => z >= 0 && z < 8).flatMap((z) => pawnsOnFile(b, FILES[z], p.color));
        if (m[1] === 'isolated') return adj.length ? F(`${sq} not isolated (${adj[0]})`) : T('isolated');
        const behind = adj.some((s) => (p.color === 'w' ? Number(s[1]) <= Number(sq[1]) : Number(s[1]) >= Number(sq[1])));
        return behind ? F(`${sq} not backward — a neighbour pawn can defend`) : T('backward');
      }
      const dp = /doubled pawn on ([a-h][1-8])/.exec(t);
      if (dp) { const p = at(b, dp[1]); if (!p || p.type !== 'p') return F(`no pawn on ${dp[1]}`); return pawnsOnFile(b, dp[1][0], p.color).length >= 2 ? T('doubled') : F('not doubled'); }
      const d = /pawns on the ([a-h])-file are doubled/.exec(t);
      if (d) { const col = /Their/.test(t) ? them : me; return pawnsOnFile(b, d[1], col).length >= 2 ? T('doubled') : F('not doubled'); }
      return U('structure line not parsed');
    }
    case 'behavior:prophylaxis': case 'facts:must-defend': {
      const m = /(?:eyeing ([^ ]+) — it would win your (\w+) on ([a-h][1-8]))|(?:threatening (?:to win )?the (\w+) on ([a-h][1-8]))/.exec(t);
      const fk = /They want (\S+), forking (.+) — take the square/.exec(t);
      if (fk) {
        const c = board(withTurn(x.probe, them)); let mv; try { mv = c.move(fk[1].replace(/[+#]$/, '')); } catch { return F(`${fk[1]} is not legal for them`); }
        const targets = [...fk[2].matchAll(/your (\w+) on ([a-h][1-8])/g)].map((z) => z[2]);
        if (!targets.every((sq) => attackers(c, sq, them).includes(mv.to))) return F('forker does not hit every target');
        const cheap = c.moves({ verbose: true }).some((r) => r.to === mv.to && r.captured && VAL[r.piece] <= VAL[mv.piece]);
        return cheap ? F(`the forker on ${mv.to} is simply taken`) : T('real fork');
      }
      if (!m) return U('threat not parsed');
      const sq = m[3] ?? m[5];
      const gain = see(withTurn(x.probe, them), sq, them);
      return gain > 0 ? T(`they net ${gain}`) : F(`no winning capture on ${sq} (SEE ${gain})`);
    }
    case 'behavior:pressure': {
      const w = /win the (\w+) on ([a-h][1-8])/.exec(t);
      if (w) { const g = see(withTurn(x.probe, me), w[2], me); return g > 0 ? T(`nets ${g}`) : F(`${w[2]} can be held (SEE ${g})`); }
      const c = /(\d+) attackers on ([a-h][1-8]) against (\d+) defenders/.exec(t);
      if (c) { const a = attackers(b, c[2], me).length; const d = attackers(b, c[2], them).length; return a === Number(c[1]) && d === Number(c[3]) ? T('counts match') : F(`counts: ${a} vs ${d}`); }
      return U('pressure not parsed');
    }
    case 'behavior:material': return material(x.probe, me) < material(x.probe, them) ? T('down material') : F('not down material');
    case 'facts:convert': {
      const up = material(x.probe, me) - material(x.probe, them);
      const pts = /(\d+) points up/.exec(t); const want = pts ? Number(pts[1]) : /a rook up/.test(t) ? 5 : /a piece up|a knight up|a bishop up/.test(t) ? 3 : /a queen up/.test(t) ? 9 : /a pawn up/.test(t) ? 1 : null;
      if (want === null) return U('convert amount not parsed');
      return up >= want - 1 && up <= want + 2 ? T(`up ${up}`) : F(`says ${want} up, is ${up}`);
    }
    case 'behavior:bishop-pair': {
      const n = (col) => b.board().flat().filter((c) => c && c.color === col && c.type === 'b').length;
      return n(me) >= 2 && n(them) < 2 ? T('pair') : F(`bishops ${n(me)} vs ${n(them)}`);
    }
    case 'behavior:passed-pawn': case 'positional:passer': case 'facts:structure-plan': case 'behavior:rook-behind-passer': {
      const m = /(?:(Their|their) )?passed pawn on ([a-h][1-8])/.exec(t);
      if (m) { const col = m[1] ? them : me; const p = at(b, m[2]); if (!p || p.type !== 'p' || p.color !== col) return F(`no ${col} pawn on ${m[2]}`); return isPassed(b, m[2], col) ? T('passed') : F(`${m[2]} not passed`); }
      const iso = /isolated pawn on ([a-h][1-8])/.exec(t);
      if (iso) { const col = /\bThey have|\btheir isolated|^Their/i.test(t) ? them : me; const f = FILES.indexOf(iso[1][0]); const adj = [f - 1, f + 1].filter((z) => z >= 0 && z < 8).flatMap((z) => pawnsOnFile(b, FILES[z], col)); return adj.length ? F(`${iso[1]} not isolated (${adj[0]})`) : T('isolated'); }
      return U('structure plan not parsed');
    }
    case 'behavior:pawn-break': case 'positional:lever': {
      const sq = /([a-h][1-8]) is (?:the|a) pawn break|pawn break (?:on|available on) ([a-h][1-8])/.exec(t); const s = sq?.[1] ?? sq?.[2];
      if (!s) return U('break not parsed');
      const col = /^They/.test(t) ? them : me;
      const c = board(withTurn(x.probe, col));
      const push = c.moves({ verbose: true }).find((m) => m.piece === 'p' && m.to === s);
      if (!push) return F(`no ${col} pawn can go to ${s} next move`);
      const after = board(withTurn(x.probe, col)); after.move({ from: push.from, to: s });
      const f = FILES.indexOf(s[0]); const dir = col === 'w' ? 1 : -1;
      const hits = [f - 1, f + 1].some((ff) => { if (ff < 0 || ff > 7) return false; const q = at(after, `${FILES[ff]}${Number(s[1]) + dir}`); return q && q.type === 'p' && q.color !== col; });
      return hits ? T('lever makes contact') : F(`${s} contacts no enemy pawn`);
    }
    case 'behavior:rook-lift': {
      const sq = /rook to ([a-h][1-8])/.exec(t)?.[1]; if (!sq) return U('lift not parsed');
      const c = board(withTurn(x.probe, me)); const ok = c.moves({ verbose: true }).some((m) => m.piece === 'r' && m.to === sq);
      const third = me === 'w' ? '3' : '6';
      if (!ok) return F(`no rook reaches ${sq} next move`);
      return sq[1] === third ? T('lift') : F(`${sq} is not the third rank`);
    }
    case 'behavior:king-activity': {
      const sq = /starting with ([a-h][1-8])/.exec(t)?.[1];
      const k = b.board().flat().find((c) => c && c.type === 'k' && c.color === me);
      if (sq && k && k.square === sq) return F(`king already on ${sq}`);
      if (/[qQ]/.test(x.probe.split(' ')[0])) return F('queens still on');
      return T('endgame king walk');
    }
    case 'behavior:development': case 'positional:development': {
      const home = (col) => { const r = col === 'w' ? '1' : '8'; return ['b', 'c', 'f', 'g'].filter((f) => { const p = at(b, `${f}${r}`); return p && p.color === col && (p.type === 'n' || p.type === 'b'); }).length; };
      const m = /(\d) minor pieces? at home/.exec(t);
      const who = /^They/.test(t) ? them : me;
      if (m && Number(m[1]) !== home(who)) return F(`says ${m[1]} at home, board ${home(who)}`);
      if (/^They/.test(t)) return home(them) > home(me) ? T('they lag') : F(`home minors them ${home(them)} vs you ${home(me)}`);
      return home(me) > home(them) ? T('behind') : F(`home minors ${home(me)} vs ${home(them)}`);
    }
    case 'backward:mistake': case 'backward:drawback': {
      const grade = /was (a mistake|a blunder|a little loose)/.exec(t)?.[1];
      const still = /still wins/.test(t);
      if (x.cpLoss !== null && grade) {
        const need = grade === 'a blunder' ? 200 : grade === 'a mistake' ? 100 : 40;
        if (x.cpLoss < need * 0.6) return F(`graded "${grade}" at cpLoss ${Math.round(x.cpLoss)}`);
        if (x.studentEvalAfter !== null && x.studentEvalAfter >= 300) return F(`graded "${grade}" while still +${Math.round(x.studentEvalAfter)}`);
      }
      if (still && x.studentEvalAfter !== null && x.studentEvalAfter < 200) return F(`"still wins" at ${Math.round(x.studentEvalAfter)}`);
      const won = /let them (?:win|take) (?:a |your )?(pawn|knight|bishop|rook|queen)/.exec(t);
      if (won) {
        const before = board(x.fenBefore); before.move(x.san);
        const lines = LINES.get(fkey(before.fen())); const pv = lines?.[0]?.pv ?? [];
        const c = board(before.fen()); const m0 = material(c.fen(), them) - material(c.fen(), me);
        if (lines?.[0]?.mate !== null && lines?.[0]?.mate !== undefined) return U('the engine line is a mate — material does not settle it');
        // SETTLED gain over the WHOLE line: read only after the student has
        // answered each of their moves (so a capture that gets taken back does
        // not count), and keep the most they hold at any such point. A six-ply
        // window cut Rf2 …Qxd5 Qxd5 Nxd5 in half and called a lost rook "-4".
        let gain = -Infinity;
        for (const u of pv.slice(0, 12)) {
          let mv; try { mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
          if (mv.color === me) gain = Math.max(gain, (material(c.fen(), them) - material(c.fen(), me)) - m0);
        }
        if (gain === -Infinity) gain = (material(c.fen(), them) - material(c.fen(), me)) - m0;
        // "win" is a net gain; "take" is a capture that happens in the line.
        const isTake = /let them take/.test(t);
        if (isTake) {
          const c2 = board(before.fen()); let took = false;
          for (const u of pv.slice(0, 6)) { let mv; try { mv = c2.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; } if (mv.color === them && mv.captured === NAME[won[1]]) { took = true; break; } }
          if (!took) return F(`says they take a ${won[1]}; engine line never does`);
        } else if (gain < VAL[NAME[won[1]]] - 1) return F(`says they win a ${won[1]}; engine line nets ${gain}`);
      }
      return grade || still || won ? T('grade/cost consistent') : U('no grade or cost');
    }
    case 'facts:key-moment': {
      const lines = LINES.get(fkey(x.probe)); if (!lines || lines.length < 2) return U('no fan');
      const cps = lines.map((l) => lineCp(l) * seatSign(x));
      const n = /only one move|exactly one move|one move (?:keeps|limits)/.test(t) ? 1 : /two moves/i.test(t) ? 2 : null; if (!n) return U('count not parsed');
      // THE STAKE decides, not a raw gap: "two moves keep the win" is true when
      // both stay winning and the third does not.
      const stake = /the win/.test(t) ? 300 : /on top/.test(t) ? 100 : /your edge/.test(t) ? 50 : /level/.test(t) ? -99 : /in it/.test(t) ? -300 : /damage/.test(t) ? null : 'x';
      if (stake === 'x') return U('stake not parsed');
      if (stake === null) { // "limit the damage": the named count are the best by a clear margin
        if (n === 1) return cps[0] - cps[1] >= 50 ? T('one clearly best') : F(`damage: line 2 within ${cps[0] - cps[1]}`);
        return cps[2] === undefined || cps[1] - cps[2] >= 50 ? T('two clearly best') : F(`damage: line 3 within ${cps[1] - cps[2]}`);
      }
      const keeps = cps.filter((c) => c >= stake - 25).length; const keepsStrict = cps.filter((c) => c >= stake + 25).length;
      if (lines.length < 3 && keeps >= lines.length) return U('fan too narrow to count');
      return n >= keepsStrict && n <= keeps ? T(`${n} keep it (within 25cp)`) : F(`says ${n} keep the stake (≥${stake}); engine: ${keepsStrict}-${keeps} (${cps.join('/')})`);
    }
    case 'behavior:tactics': case 'facts:concept': {
      const tb = hypo && hypo !== 'skip' ? hypo : b;
      const disc = /(\w+) on ([a-h][1-8]) is a discovered attack in waiting — moving it unveils (?:your|their) (\w+) on ([a-h][1-8]) against (?:their|your) (\w+) on ([a-h][1-8])/.exec(t);
      if (disc) { const c = board(tb.fen()); c.remove(disc[2]); const own = at(tb, disc[4]); return own && attackers(c, disc[6], own.color).includes(disc[4]) ? T('discovery geometry') : F('no line once it moves'); }
      const bat = /(\w+) on ([a-h][1-8]) and (?:your|their) (\w+) on ([a-h][1-8]) form a battery on the (file|diagonal|rank)/.exec(t);
      if (bat) { const a = bat[2]; const c2 = bat[4]; const same = bat[5] === 'file' ? a[0] === c2[0] : bat[5] === 'rank' ? a[1] === c2[1] : Math.abs(FILES.indexOf(a[0]) - FILES.indexOf(c2[0])) === Math.abs(+a[1] - +c2[1]); return same ? T('battery geometry') : F('not on one line'); }
      const m1 = /mate in one with your (\w+) on ([a-h][1-8])/.exec(t);
      if (m1) { const c = board(withTurn(tb.fen(), me)); const ok = c.moves({ verbose: true }).some((mv) => mv.from === m1[2] && (() => { const d = board(c.fen()); d.move(mv); return d.isCheckmate(); })()); return ok ? T('mate in one') : F('no mate in one from there'); }
      const pin = /(?:bishop|rook|queen) on ([a-h][1-8]) pins (?:their|your) (\w+) on ([a-h][1-8]) against (?:their|your) (\w+) on ([a-h][1-8])/.exec(t);
      if (pin) {
        const b = tb; const [, a, , p1, , p2] = pin; const fa = FILES.indexOf(a[0]); const ra = +a[1]; const f1 = FILES.indexOf(p1[0]); const r1 = +p1[1]; const f2 = FILES.indexOf(p2[0]); const r2 = +p2[1];
        const df = Math.sign(f1 - fa); const dr = Math.sign(r1 - ra);
        const colinear = (f2 - fa) * dr === (r2 - ra) * df && Math.sign(f2 - f1) === df && Math.sign(r2 - r1) === dr;
        if (!colinear) return F('pin squares not on one line');
        for (let f = fa + df, r = ra + dr; f !== f2 || r !== r2; f += df, r += dr) { const s = `${FILES[f]}${r}`; if (s !== p1 && at(b, s)) return F(`pin line blocked at ${s}`); }
        return T('pin geometry');
      }
      const fork = /(\w+) on ([a-h][1-8]) forks (?:their|your) (\w+) on ([a-h][1-8]) and (?:their|your) (\w+) on ([a-h][1-8])/.exec(t);
      if (fork) { const b = tb; const own = at(b, fork[2]); if (!own) return F('no forker'); const hits = [fork[4], fork[6]].every((s) => attackers(b, s, own.color).includes(fork[2])); return hits ? T('fork geometry') : F('forker does not hit both'); }
      return U('concept not parsed');
    }
    case 'positional:complex': {
      const light = /light squares/.test(t); const col = /^Their/.test(t) ? them : me;
      const bish = b.board().flat().filter((c) => c && c.color === col && c.type === 'b').map((c) => (FILES.indexOf(c.square[0]) + Number(c.square[1])) % 2 === 0); // light = even (a1 is dark)
      return bish.includes(light) ? F(`${col} still has a ${light ? 'light' : 'dark'}-squared bishop`) : T('colour complex');
    }
    case 'behavior:fianchetto': { const sq = /bishop on ([a-h][1-8])/.exec(t)?.[1]; return ['b2', 'g2', 'b7', 'g7'].includes(sq) ? T('fianchetto square') : F(`${sq} not a fianchetto square`); }
    case 'facts:trade': {
      if (/trades pieces while (?:they're|you're) behind/.test(t)) {
        const who = /Their/.test(t) ? them : me;
        const pre = board(x.fenBefore); pre.move(x.san); // the board their capture was played from
        const fen = /Their/.test(t) ? pre.fen() : x.fenBefore;
        return material(fen, who) < material(fen, other(who)) ? T('behind') : F(`not behind (${material(fen, who)} vs ${material(fen, other(who))})`);
      }
      return U('trade quality is judgment');
    }
    case 'facts:method': {
      const sq = /(?:your (\w+) on ([a-h][1-8]))/.exec(t);
      if (sq) { const g = see(withTurn(x.probe, them), sq[2], them); const hit = attackers(b, sq[2], them).length > 0;
        return (/hits your/.test(t) ? hit : g > 0) ? T('the named piece is under fire') : F(`${sq[2]} not threatened (SEE ${g})`); }
      if (/what are they threatening|their threat first/.test(t)) {
        const threatened = b.board().flat().filter((c) => c && c.color === me && c.type !== 'k').some((c) => see(withTurn(x.probe, them), c.square, them) > 0);
        return threatened ? T('a real threat stands') : F('habit prompt with no threat on the board');
      }
      return U('method habit');
    }
    case 'behavior:space': {
      const ctl = (col) => { let n = 0; for (const c of b.board().flat()) { if (!c || c.color !== col || c.type !== 'p') continue; const f = FILES.indexOf(c.square[0]); const r = Number(c.square[1]) + (col === 'w' ? 1 : -1); for (const ff of [f - 1, f + 1]) { if (ff < 0 || ff > 7) continue; if (col === 'w' ? r >= 5 : r <= 4) n += 1; } } return n; };
      // Crude pawn-space count: only a CLEAR deficit is proof of falsehood.
      if (ctl(me) > ctl(them)) return T(`pawn-held squares in their half ${ctl(me)} vs ${ctl(them)}`);
      return ctl(me) + 1 < ctl(them) ? F(`space ${ctl(me)} vs ${ctl(them)}`) : U(`space too close to call by pawns (${ctl(me)} vs ${ctl(them)})`);
    }
    case 'positional:minority': {
      const m = /(\w+) (?:makes contact|is the lever).*weak pawn on ([a-h][1-8])/.exec(t); const lever = /— ([a-h][1-8]) (?:makes contact|is the lever)/.exec(t)?.[1];
      if (!lever || !m) return U('minority not parsed');
      const col = /^They/.test(t) ? them : me;
      const c = board(withTurn(x.probe, col)); const push = c.moves({ verbose: true }).find((mv) => mv.piece === 'p' && mv.to === lever && !mv.captured);
      if (!push) return F(`${lever} cannot be played next move`);
      const wing = FILES.indexOf(lever[0]) >= 4 ? [5, 6, 7] : [0, 1, 2];
      const cnt = (cc) => wing.reduce((n, f) => n + pawnsOnFile(b, FILES[f], cc).length, 0);
      return cnt(col) < cnt(other(col)) ? T('minority on that wing') : F(`not a minority: ${cnt(col)} vs ${cnt(other(col))}`);
    }
    case 'facts:latent-danger': {
      const m = /before you trade on ([a-h][1-8]): that lines your (\w+) on \1 up with your (\w+) on the (file|diagonal)/.exec(t);
      if (m) {
        const c = board(withTurn(x.probe, me)); const cap = c.moves({ verbose: true }).find((mv) => mv.to === m[1] && mv.captured && mv.piece === NAME[m[2]]);
        if (!cap) return F(`no ${m[2]} capture on ${m[1]}`);
        c.move(cap); const q = c.board().flat().find((cc) => cc && cc.color === me && cc.type === NAME[m[3]]);
        if (!q) return F(`no ${m[3]}`);
        const df = Math.sign(FILES.indexOf(q.square[0]) - FILES.indexOf(m[1][0])); const dr = Math.sign(+q.square[1] - +m[1][1]);
        const line = m[4] === 'file' ? q.square[0] === m[1][0] : Math.abs(FILES.indexOf(q.square[0]) - FILES.indexOf(m[1][0])) === Math.abs(+q.square[1] - +m[1][1]);
        if (!line) return F('not on one line');
        for (let f = FILES.indexOf(m[1][0]) + df, r = +m[1][1] + dr; `${FILES[f]}${r}` !== q.square; f += df, r += dr) if (at(c, `${FILES[f]}${r}`)) return F('line blocked');
        return T('pin geometry after the trade');
      }
      if (/king's cover is thin/.test(t)) return U('king cover judgment');
      return U('latent danger not parsed');
    }
    case 'facts:fundamental': {
      // The plan clause is the BEST move's fundamental, read on the board after
      // it (Qxd5+ "takes the open d-file" — open once the pawn is taken).
      const best = LINES.get(fkey(x.probe))?.[0]?.pv?.[0];
      const ab = board(x.probe); if (best) { try { ab.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] }); } catch { /* keep */ } }
      const fl = fileClaims(x, ab, t); if (fl.length) return fl.find((y) => y.v === 'FALSE') ?? fl[0];
      const g = /the pawn to ([a-h][1-8]) guards ([a-h][1-8])/.exec(t);
      if (g) { const c = board(withTurn(x.probe, me)); const mv = c.moves({ verbose: true }).find((z) => z.piece === 'p' && z.to === g[1]); if (!mv) return F(`pawn cannot go to ${g[1]}`); c.move(mv); return attackers(c, g[2], me).includes(g[1]) ? T('guards') : F(`${g[1]} pawn does not guard ${g[2]}`); }
      return U('fundamental is a plan');
    }
    case 'backward:drawback': case 'backward:mistake': break;
    case 'behavior:piece-preservation': return U('judgment: which minor does most');
    case 'behavior:knight-maneuver': {
      const m = /knight from ([a-h][1-8]) to ([a-h][1-8])/.exec(t); if (!m) return U('route not parsed');
      const kn = (a) => { const f = FILES.indexOf(a[0]); const r = +a[1]; return [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].map(([df, dr]) => [f + df, r + dr]).filter(([ff, rr]) => ff >= 0 && ff < 8 && rr >= 1 && rr <= 8).map(([ff, rr]) => `${FILES[ff]}${rr}`); };
      const two = kn(m[1]).some((s1) => kn(s1).includes(m[2])) || kn(m[1]).includes(m[2]);
      if (!two) return F('not reachable in two knight moves');
      return noPawnCanAttack(b, m[2], them) ? T('pawn-proof square') : F(`${m[2]} can be chased by a pawn`);
    }
    case 'facts:stopped': {
      const mate = /stops the mate with (\S+)/.exec(t);
      if (mate) {
        // "The point of Nh3: it stops the mate" is about THEIR reply: the mate
        // was yours on the board after your move, and Nh3 took it away.
        const midFen = (() => { const c = board(x.fenBefore); c.move(x.san); return c.fen(); })();
        const pre = board(withTurn(midFen, me)); let was = false; try { pre.move(mate[1]); was = pre.isCheckmate(); } catch { /* */ }
        const post = board(withTurn(x.probe, me)); let still = false; try { post.move(mate[1]); still = post.isCheckmate(); } catch { /* */ }
        if (was && !still) return T('mate in one stopped');
        const mateLine = LINES.get(fkey(withTurn(midFen, me)))?.[0];
        if (!was && mateLine === undefined) return U('the threat is longer than one move and no engine read of it');
        return F(`was mate ${was}, still mate ${still}`);
      }
      return U('stopped trick not parsed');
    }
    case 'facts:deliberation': {
      const drop = /(\S+)\? That drops the (\w+) on ([a-h][1-8])/.exec(t);
      if (drop) { const c = board(x.probe); try { c.move(drop[1]); } catch { return F(`${drop[1]} illegal`); } return see(c.fen(), drop[3], c.turn()) >= VAL[NAME[drop[2]]] - 1 ? T('drops it') : F(`${drop[3]} not lost (SEE ${see(c.fen(), drop[3], c.turn())})`); }
      const line = /(\S+)\? Then ([^—]+) — they win (?:a |an |two )?(\w+)/.exec(t);
      if (line) {
        const c = board(x.probe); const m0 = material(c.fen(), them) - material(c.fen(), me);
        for (const san of [line[1], ...line[2].replace(/ and /g, ', ').split(/,\s*/)]) { try { c.move(san.trim()); } catch { return F(`line illegal at ${san}`); } }
        const gain = material(c.fen(), them) - material(c.fen(), me) - m0;
        return gain >= 1 ? T(`they net ${gain}`) : F(`line nets them ${gain}`);
      }
      return U('deliberation not parsed');
    }
    case 'behavior:blockade': {
      const m = /(\w+) on ([a-h][1-8]) is the perfect blockader — it sits in front of the passed pawn on ([a-h][1-8])/.exec(t); if (!m) return U('blockade not parsed');
      const pawn = at(b, m[3]); if (!pawn || pawn.type !== 'p' || pawn.color !== them) return F('no enemy pawn there');
      const front = `${m[3][0]}${+m[3][1] + (them === 'w' ? 1 : -1)}`;
      return front === m[2] && isPassed(b, m[3], them) ? T('blockades a passer') : F(`blockader on ${m[2]}, front is ${front}; passed=${isPassed(b, m[3], them)}`);
    }
    case 'behavior:x-ray': {
      const m = /(\w+) on ([a-h][1-8]) x-rays their (\w+) on ([a-h][1-8]) behind your piece on ([a-h][1-8])/.exec(t); if (!m) return U('x-ray not parsed');
      const c = board(b.fen()); c.remove(m[5]);
      return attackers(c, m[4], me).includes(m[2]) ? T('x-ray geometry') : F('no line through the blocker');
    }
    case 'behavior:outpost': { const sq = /on ([a-h][1-8]) sits on an outpost/.exec(t)?.[1]; return sq && noPawnCanAttack(b, sq, them) ? T('outpost') : F(`${sq} can be kicked by a pawn`); }
    case 'facts:bluff': { const m = /hitting your (\w+) on ([a-h][1-8]), but it wins nothing/.exec(t); if (!m) return U('bluff not parsed'); const g = see(withTurn(x.probe, them), m[2], them); return g <= 0 ? T('wins nothing') : F(`it does win material (SEE ${g})`); }
    default: return U('no verifier for this kind yet');
  }
}

const verdicts = harvest.map((x) => ({ ...x, ...(x.kind === 'ERROR' ? F(`computer threw: ${x.text}`) : verify(x)) }));
writeFileSync('audit-reports/claim-check/verdicts.json', JSON.stringify(verdicts, null, 1));

const by = new Map();
for (const v of verdicts) { const k = `${v.lane}:${v.kind}`; if (!by.has(k)) by.set(k, { T: 0, F: 0, U: 0, bad: [] }); const s = by.get(k); s[v.v[0]] += 1; if (v.v === 'FALSE') s.bad.push(v); }
let tt = 0; let ff = 0; let uu = 0;
for (const s of by.values()) { tt += s.T; ff += s.F; uu += s.U; }
// SPOKEN vs CANDIDATE. The facts clauses survived the deciding door and are
// all queued to speak, and the backward look is spoken when it fires; the
// behaviour and positional lanes offer CANDIDATES the page picks one of per
// turn. Both must be true (any candidate can be picked), but the spoken lanes
// are the closest thing to "what the student hears" this instrument can see.
const SPOKEN = new Set(['facts', 'backward']);
for (const [label, pick] of [['SPOKEN lanes (facts + backward look)', (v) => SPOKEN.has(v.lane)], ['CANDIDATE lanes (behaviour + positional)', (v) => !SPOKEN.has(v.lane)]]) {
  const vs = verdicts.filter(pick); const t1 = vs.filter((v) => v.v === 'TRUE').length; const f1 = vs.filter((v) => v.v === 'FALSE').length;
  console.log(`${label}: ${vs.length} claims · accuracy ${(100 * t1 / Math.max(1, t1 + f1)).toFixed(1)}% of checked · ${(100 * (t1 + f1) / Math.max(1, vs.length)).toFixed(0)}% checkable`);
}
console.log(`\nCLAIMS ${verdicts.length}  checked ${tt + ff}  TRUE ${tt}  FALSE ${ff}  unverified ${uu}`);
console.log(`ACCURACY (checked): ${(100 * tt / Math.max(1, tt + ff)).toFixed(1)}%   coverage: ${(100 * (tt + ff) / verdicts.length).toFixed(1)}%\n`);
for (const [k, s] of [...by].sort((a, b) => b[1].F - a[1].F || (b[1].T + b[1].F + b[1].U) - (a[1].T + a[1].F + a[1].U))) {
  const acc = s.T + s.F ? `${(100 * s.T / (s.T + s.F)).toFixed(0)}%` : '  —';
  console.log(`${acc.padStart(5)}  F${String(s.F).padStart(4)} T${String(s.T).padStart(4)} U${String(s.U).padStart(4)}  ${k}`);
  for (const b of s.bad.slice(0, EXAMPLES)) console.log(`        ✗ ${b.game} ply ${b.ply} [${b.why}] "${b.text.slice(0, 110)}"`);
}
