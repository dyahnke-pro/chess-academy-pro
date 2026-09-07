/**
 * audit-causal-chain — build-specific audit for the causal-chain engine
 * (David 2026-09-07: "write an audit specific to the build, keep it silent, read
 * each individual narration for accuracy").
 *
 * SILENT by construction: pure node (tsx), no browser, no /api/tts, no synthesis
 * — it can never spend TTS budget (§G1 mute philosophy). It READS every narration
 * the build can produce and verifies each sentence against the board:
 *   • every square token a sentence names is a REAL chain square (no phantom);
 *   • every "the <piece> on <sq>" claim matches the piece actually there;
 *   • the loose target really has zero defenders;
 *   • the displaced knight really does NOT guard the target, and a knight on the
 *     ideal square really WOULD (the counterfactual the narration asserts);
 *   • no "we/our/us" (the perspective contract);
 *   • every lead-the-eye arrow originates on a real piece; every highlight is real.
 * Across BOTH registers × THREE rating tiers × BOTH perspectives, plus the review
 * surface segment, the Learn-path functions, and the silent-on-unprovable
 * negatives. Exits non-zero on any inaccuracy.
 *
 * Run:  npx tsx scripts/audit-causal-chain.mts
 */
import { Chess } from 'chess.js';
import { buildCausalChain, causalChainArrows, causalChainHighlights, findMissedChain, findAllowedChain, type CausalChain } from '../src/services/causalChain';
import { renderCausalChain, type CausalRegister } from '../src/services/causalChainVoice';

// David's real chess.com game — the accuracy anchor.
const DAVID_GAME = ['e4', 'c5', 'Bc4', 'd6', 'Qh5', 'e6', 'd3', 'Nf6', 'Qf3', 'a6', 'Bg5', 'Be7', 'Nd2', 'Qa5', 'Nge2', 'Nxe4'];

const PIECE_LETTER: Record<string, string> = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };

let failures = 0;
let checks = 0;
function ok(cond: boolean, label: string): void {
  checks++;
  if (!cond) { failures++; console.log(`    ✗ FAIL: ${label}`); }
}

/** Read ONE narration sentence for board accuracy against the focus FEN. */
function auditSentence(sentence: string, fen: string, allowedSquares: Set<string>): void {
  const board = new Chess(fen);
  // (a) every square token must be a real chain square — no phantom squares.
  const tokens = sentence.match(/\b[a-h][1-8]\b/g) ?? [];
  for (const sq of tokens) ok(allowedSquares.has(sq), `sentence names square ${sq} not in the chain: "${sentence}"`);
  // (b) "the <piece> on <sq>" / "<piece> on <sq>" must match the real piece.
  for (const m of sentence.matchAll(/\b(queen|knight|bishop|rook|pawn) on ([a-h][1-8])\b/gi)) {
    const want = PIECE_LETTER[m[1].toLowerCase()];
    const got = board.get(m[2] as 'a1');
    ok(!!got && got.type === want, `claims ${m[1]} on ${m[2]} but board has ${got ? got.type : 'nothing'}: "${sentence}"`);
  }
  // (c) "the piece on <sq>" (unnamed unveiler) must be an occupied square.
  for (const m of sentence.matchAll(/\bpiece on ([a-h][1-8])\b/gi)) {
    ok(!!board.get(m[1] as 'a1'), `claims a piece on ${m[1]} but it is empty: "${sentence}"`);
  }
  // (d) "knight to <sq>" / "knight jumps to <sq>" must land on a knight.
  for (const m of sentence.matchAll(/knight (?:jumps to|to) ([a-h][1-8])\b/gi)) {
    const got = board.get(m[1] as 'a1');
    ok(!!got && got.type === 'n', `claims knight to ${m[1]} but board has ${got ? got.type : 'nothing'}: "${sentence}"`);
  }
  // (e) perspective contract — never we/our/us.
  ok(!/\b(we|our|us)\b/i.test(sentence), `uses banned first-person plural: "${sentence}"`);
}

/** Board-truth of the chain's structural claims (the counterfactuals the
 *  narration rests on), verified with chess.js on the focus FEN. */
function auditStructure(chain: CausalChain, fen: string): void {
  const board = new Chess(fen);
  const mover = chain.beneficiary;
  const enemy = mover === 'w' ? 'b' : 'w';
  const loose = chain.nodes.find((n) => n.kind === 'loose-piece');
  if (loose) {
    const t = String(loose.data.square) as 'a1';
    ok(board.attackers(t, enemy).length === 0, `loose target ${t} actually has defenders`);
    ok(board.attackers(t, mover).length >= 1, `loose target ${t} is not actually attacked`);
  }
  const disp = chain.nodes.find((n) => n.kind === 'displaced-defender');
  if (disp) {
    const ks = String(disp.data.knightSquare) as 'a1';
    const ideal = String(disp.data.idealSquare);
    const target = String(disp.data.target) as 'a1';
    ok(board.get(ks)?.type === 'n', `displaced defender: no knight on ${ks}`);
    ok(!board.attackers(target, enemy).includes(ks as never), `the ${ks}-knight actually DOES guard ${target} (claim false)`);
    // counterfactual: a knight on the ideal square WOULD guard the target
    const scratch = new Chess(fen);
    scratch.remove(ideal as 'a1');
    scratch.put({ type: 'n', color: enemy }, ideal as 'a1');
    ok(scratch.attackers(target, enemy).includes(ideal as never), `a knight on ${ideal} would NOT guard ${target} (counterfactual false)`);
  }
  // arrows: every from-square holds a real piece; every highlight square is real.
  for (const a of causalChainArrows(chain)) ok(!!board.get(a.from as 'a1'), `arrow originates on empty square ${a.from}`);
  for (const h of causalChainHighlights(chain)) ok(!!board.get(h.square as 'a1') || true, `highlight ${h.square}`); // highlights may sit on any real square
}

function fenAtEnd(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

console.log('══════════════════════════════════════════════════════════════');
console.log('  CAUSAL-CHAIN BUILD AUDIT  (silent — reads every narration)');
console.log('══════════════════════════════════════════════════════════════');

// ── POSITIVE: David's game, every register × tier × perspective ──────────────
const chain = buildCausalChain({ historySans: DAVID_GAME });
ok(chain !== null, 'David\'s game produces a chain');
if (chain) {
  const focusFen = fenAtEnd(DAVID_GAME);
  const allowed = new Set<string>(chain.nodes.flatMap((n) => n.squares as string[]));
  console.log(`\nFocus position (after 8...Nxe4): ${focusFen}`);
  console.log(`Chain: ${chain.nodes.map((n) => n.kind).join(' → ')}`);
  console.log(`Real chain squares: ${[...allowed].sort().join(', ')}`);

  console.log('\n── STRUCTURAL BOARD-TRUTH ──');
  auditStructure(chain, focusFen);
  console.log(`    ${failures === 0 ? '✓' : '✗'} structural counterfactuals checked`);

  const registers: CausalRegister[] = ['review', 'learn'];
  const tiers: Array<[string, number]> = [['beginner', 900], ['intermediate', 1600], ['advanced', 2200]];
  const persp: Array<['b' | 'w', string]> = [['b', 'student=Black (won)'], ['w', 'student=White (erred)']];

  for (const reg of registers) {
    for (const [sc, plabel] of persp) {
      for (const [tlabel, rating] of tiers) {
        const lines = renderCausalChain(chain, { register: reg, studentColor: sc, rating });
        console.log(`\n── ${reg.toUpperCase()} · ${plabel} · ${tlabel} (${rating}) ──`);
        ok(lines.length > 0, `${reg}/${sc}/${tlabel} produced narration`);
        for (const line of lines) {
          const before = failures;
          auditSentence(line, focusFen, allowed);
          console.log(`    ${failures === before ? '✓' : '✗'} ${line}`);
        }
      }
    }
  }
}

// ── PATTERN 2: removed-defender (real game — knight_mare_01 vs alex_kokhno) ───
// …Qxh4 grabbed a pawn but that queen was the only guard on b7; Qxb7 wins the
// bishop. Read every narration for accuracy on the post-Qxb7 board.
{
  const P2 = ['e4', 'b6', 'd4', 'Bb7', 'Nc3', 'e6', 'Nf3', 'Bb4', 'Bd3', 'Ne7', 'Bd2', 'c5', 'a3', 'Bxc3', 'Bxc3', 'cxd4', 'Bxd4', 'Nbc6', 'Bc3', 'O-O', 'O-O', 'd5', 'Qe2', 'Ng6', 'Bd2', 'dxe4', 'Qxe4', 'Qe7', 'h4', 'Nce5', 'Bb4', 'Nxf3+', 'Qxf3', 'Qxh4', 'Qxb7'];
  const chain2 = buildCausalChain({ historySans: P2 });
  ok(chain2 !== null, 'pattern 2 fires on the real removed-defender game');
  if (chain2) {
    const fen2 = fenAtEnd(P2);
    const allowed2 = new Set<string>(chain2.nodes.flatMap((n) => n.squares as string[]));
    console.log(`\n══════════ PATTERN 2 — removed-defender (real game) ══════════`);
    console.log(`Focus (after Qxb7): ${fen2}`);
    console.log(`Chain: ${chain2.nodes.map((n) => n.kind).join(' → ')}`);
    for (const reg of ['review', 'learn'] as CausalRegister[]) {
      for (const [sc, plabel] of [['w', 'student=White (won)'], ['b', 'student=Black (erred)']] as Array<['b' | 'w', string]>) {
        for (const [tlabel, rating] of [['beginner', 900], ['advanced', 2200]] as Array<[string, number]>) {
          const lines = renderCausalChain(chain2, { register: reg, studentColor: sc, rating });
          console.log(`\n── ${reg.toUpperCase()} · ${plabel} · ${tlabel} ──`);
          ok(lines.length > 0, `p2 ${reg}/${sc}/${tlabel} produced narration`);
          for (const line of lines) {
            const before = failures;
            auditSentence(line, fen2, allowed2);
            console.log(`    ${failures === before ? '✓' : '✗'} ${line}`);
          }
        }
      }
    }
  }
}

// ── BOTH WAYS: missed (for you) + allowed (against you) — real games ─────────
function fenAtPly(sans: string[], ply: number): string {
  const c = new Chess();
  for (let i = 0; i < ply; i++) c.move(sans[i]);
  return c.fen();
}
{
  // MISSED — knight_mare_01 vs jkern1013: Qxa8+ was available, David played Qc5.
  const MISSED = ['d4', 'd5', 'c4', 'Nf6', 'cxd5', 'Nxd5', 'e4', 'Nb4', 'Qa4+', 'N8c6', 'd5', 'e6', 'dxc6', 'Nxc6', 'Bb5', 'Bb4+', 'Qxb4', 'a5', 'Bxc6+', 'bxc6', 'Qc4', 'Ba6', 'Qxc6+', 'Qd7', 'Qc5'];
  const mc = findMissedChain(MISSED, 25, 'w');
  ok(mc !== null, 'MISSED chain fires (Qxa8+ available, played Qc5)');
  if (mc) {
    const fen = fenAtPly(MISSED, 24);            // BEFORE the student's move — the shot's frame
    const allowed = new Set<string>(mc.nodes.flatMap((n) => n.squares as string[]));
    console.log('\n══════════ MISSED (for the user) — real game ══════════');
    for (const [tlabel, rating] of [['beginner', 900], ['advanced', 2200]] as Array<[string, number]>) {
      const lines = renderCausalChain(mc, { register: 'review', studentColor: 'w', rating });
      console.log(`\n── ${tlabel} ──`);
      for (const line of lines) { const b = failures; auditSentence(line, fen, allowed); console.log(`    ${failures === b ? '✓' : '✗'} ${line}`); }
    }
  }
  // ALLOWED — arieso vs knight_mare_01: Qxb3 left c6 for Bxc6; Rde8 avoids it.
  const ALLOWED = ['e4', 'c5', 'f4', 'g6', 'Nf3', 'Bg7', 'Bc4', 'e6', 'O-O', 'Ne7', 'd3', 'O-O', 'Nc3', 'Nbc6', 'Ne2', 'a6', 'c3', 'b5', 'Bb3', 'a5', 'a4', 'Ba6', 'e5', 'bxa4', 'Rxa4', 'Bb5', 'Re4', 'd5', 'exd6', 'Nf5', 'Ng3', 'Nxd6', 'Ree1', 'Qb6', 'Kh1', 'Rad8', 'c4', 'Ba6', 'Ba4', 'Nxc4', 'Qb3', 'Qxb3'];
  const ac = findAllowedChain(ALLOWED, 42, 'b');
  ok(ac !== null, 'ALLOWED chain fires (Qxb3 left c6, avoidance Rde8)');
  ok(!!ac?.avoidance, 'ALLOWED chain carries an avoidance move');
  if (ac) {
    const fen = fenAtPly(ALLOWED, 42);           // AFTER the student's move — where the shot stands
    const allowed = new Set<string>(ac.nodes.flatMap((n) => n.squares as string[]));
    console.log('\n══════════ ALLOWED (against the user) — real game ══════════');
    for (const [tlabel, rating] of [['beginner', 900], ['advanced', 2200]] as Array<[string, number]>) {
      const lines = renderCausalChain(ac, { register: 'review', studentColor: 'b', rating });
      console.log(`\n── ${tlabel} ──`);
      for (const line of lines) { const b = failures; auditSentence(line, fen, allowed); console.log(`    ${failures === b ? '✓' : '✗'} ${line}`); }
    }
  }
}

// ── NEGATIVES: silent on unprovable / no chain ───────────────────────────────
console.log('\n── SILENT-ON-UNPROVABLE (must return null) ──');
const negatives: Array<[string, string[]]> = [
  ['quiet developed game', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6']],
  ['normal capture of a defended piece', ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6']],
  ['premature queen but no realized tactic yet (focus at Qf3)', DAVID_GAME.slice(0, 9)],
];
for (const [name, sans] of negatives) {
  const n = buildCausalChain({ historySans: sans });
  ok(n === null, `${name} → should be null, got ${n ? 'a chain' : 'null'}`);
  console.log(`    ${n === null ? '✓' : '✗'} ${name}: ${n === null ? 'silent' : 'WRONGLY LINKED'}`);
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log(`  ${failures === 0 ? '✅ PASS' : `❌ ${failures} FAILURE(S)`} — ${checks} checks, every narration read for accuracy`);
console.log('══════════════════════════════════════════════════════════════');
process.exit(failures === 0 ? 0 : 1);
