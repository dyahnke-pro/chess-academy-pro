#!/usr/bin/env node
/**
 * verify-shard — batch gate for a WO's authored voiced files. Proves, across an
 * id list, that every voiced file (1) mirrors its bank {ply,t,fen,line} exactly
 * and (2) contains NO false PRESENT-TENSE piece-on-square claim (hypothetical /
 * typical sentences are exempt, same rule the authoring gate uses). Non-zero
 * exit on any violation.
 *   node scripts/voiced-authoring/verify-shard.mjs docs/wo/voiced-shards/shard-A.txt
 */
import { readFileSync, existsSync } from 'node:fs';
import { Chess } from '../../node_modules/chess.js/dist/esm/chess.js';
import { readBank, VOICED } from './lib.mjs';

const PIECE_CODE = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k', pawn: 'p' };
const HYPO = /\b(if|would|could|should|were|had|imagine|say|suppose|what if|after|once|instead|otherwise|might|may|else|then|typically|usually|often|generally|normally|tend|tends|aim|aims|aiming|head|heads|heading|want|wants|wanted|plan|plans|planning|will|'ll|shall|in case|recaptur\w*|threaten\w*|intend\w*|going to|about to|prepar\w*|idea is|looking to|hoping|hope|tries|try|trying|goal|so that)\b/i;
function boardClaimProblem(text, fen) {
  const c = new Chess(fen);
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (HYPO.test(sentence)) continue;
    const claims = [];
    for (const m of sentence.matchAll(/\b(knight|bishop|rook|queen|king|pawn)s?\s+(?:(?:is|are|sits|stands|now|still)\s+)*(?:on|at)\s+([a-h][1-8])((?:\s*(?:,|and)\s*[a-h][1-8])*)\b/gi))
      for (const sq of [m[2], ...(m[3]?.match(/[a-h][1-8]/g) ?? [])]) claims.push({ raw: m[0], sq, word: m[1] });
    for (const m of sentence.matchAll(/\b([a-h][1-8])[-\s](knight|bishop|rook|queen|king|pawn)\b/gi))
      claims.push({ raw: m[0], sq: m[1], word: m[2] });
    for (const { raw, sq, word } of claims) {
      const p = c.get(sq.toLowerCase());
      if (!p) return `"${raw}" but ${sq} EMPTY`;
      if (p.type !== PIECE_CODE[word.toLowerCase()]) return `"${raw}" but ${sq} is a different piece`;
    }
  }
  return null;
}

const file = process.argv[2];
if (!file) { console.error('usage: verify-shard.mjs <ids-file>'); process.exit(1); }
const ids = readFileSync(file, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);

let fidFail = 0, truthFail = 0, missing = 0, totMoves = 0, authored = 0;
for (const id of ids) {
  const vp = `${VOICED}/${id}.json`;
  if (!existsSync(vp)) { console.warn(`[verify] no voiced file: ${id}`); missing += 1; continue; }
  const v = JSON.parse(readFileSync(vp, 'utf8'));
  let bank;
  try { bank = readBank(id); } catch { console.warn(`[verify] no bank: ${id}`); missing += 1; continue; }
  if (v.moves.length !== bank.moves.length) { console.error(`[FIDELITY] ${id}: length ${v.moves.length} vs bank ${bank.moves.length}`); fidFail += 1; }
  v.moves.forEach((m, i) => {
    const b = bank.moves[i]; if (!b) return;
    if (m.ply !== b.ply || m.t !== b.t || m.fen !== b.fen || JSON.stringify(m.line) !== JSON.stringify(b.line)) {
      console.error(`[FIDELITY] ${id} idx${i}`); fidFail += 1;
    }
    totMoves += 1;
    if (m.spoken && m.spoken.trim()) {
      authored += 1;
      const problem = boardClaimProblem(m.spoken, m.fen);
      if (problem) { console.error(`[BOARD-TRUTH] ${id} idx${i}: ${problem}`); truthFail += 1; }
    }
  });
}
console.log(`\n[verify-shard] ${ids.length} ids | ${authored} authored moves / ${totMoves} | fidelity fails ${fidFail} | board-truth fails ${truthFail} | missing ${missing}`);
process.exit(fidFail || truthFail ? 1 : 0);
