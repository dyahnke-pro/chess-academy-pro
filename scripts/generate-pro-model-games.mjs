#!/usr/bin/env node
/**
 * Generates model-game entries for each pro repertoire using Haiku
 * 4.5 with chess.js validation as the safety net.
 *
 * Per opening (~82 pro openings), asks Haiku for 2 famous games the
 * named pro actually played in this line. Every PGN is replayed
 * through chess.js — illegal moves OR rejection = discard the entry.
 *
 * For lesser-known pros or speculative attributions, Haiku is
 * instructed to refuse rather than fabricate.
 *
 * Output: docs/audit-runs/2026-05-19-pro-games-gen/raw.json (raw Haiku
 * output) + a validated subset committed to src/data/model-games.json
 * after David approves the sample.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Chess } from 'chess.js';

const PRO_FILE = 'src/data/pro-repertoires.json';
const OUT_DIR = 'docs/audit-runs/2026-05-19-pro-games-gen';
const OUT_RAW = join(OUT_DIR, 'raw.json');
const OUT_VALIDATED = join(OUT_DIR, 'validated.json');
const MODEL = 'claude-haiku-4-5-20251001';

const SAMPLE_ONLY = process.env.SAMPLE_ONLY === '1';
const SAMPLE_IDS = [
  'pro-carlsen-catalan',
  'pro-hikaru-najdorf',
  'pro-caruana-ruy-lopez',
  'pro-firouzja-vienna',
  'pro-naroditsky-scotch',
];

const SYSTEM_PROMPT = `You are a chess historian. The user will name a specific GM/IM/streamer and an opening line. Your task: name 2 REAL games that player has played in that line, and produce a model-game entry for each.

CRITICAL: only return games you are CONFIDENT the player actually played. If you cannot recall verified games for a player in this line, return an empty "games" array and an "uncertainty" string explaining why. Inventing a plausible-sounding game = unacceptable.

For each game, output the following JSON shape:
{
  "white": "FullName",
  "black": "FullName",
  "whiteElo": <number|null>,
  "blackElo": <number|null>,
  "result": "1-0" | "0-1" | "1/2-1/2",
  "year": <number>,
  "event": "Event Name",
  "pgn": "<space-separated SAN moves, no move numbers, no annotations, no PGN headers — just the moves>",
  "overview": "<2-3 sentences on what this game teaches about the named opening>",
  "criticalMoments": [
    { "moveNumber": <int>, "color": "white"|"black", "fen": "<fen after the move>", "annotation": "<1-2 sentences>", "concept": "<short tag e.g. 'Bishop pair pressure'>" }
  ],
  "middlegameTheme": "<short tag>",
  "lessonSummary": "<1 sentence — what the student takes away>"
}

Wrap in:
{ "games": [...], "uncertainty": "<string|null>" }

PGN format MUST be raw SAN moves separated by single spaces. No "1.", "2.", no move numbers, no "{...}" annotations, no checks/mates with markers (chess.js will add those). Examples of valid PGN: "e4 e5 Nf3 Nc6 Bb5". Invalid: "1.e4 e5 2.Nf3 Nc6".

Include 1-2 critical moments per game, with FENs you are confident match the position after that move.`;

const key = process.env.ANTHROPIC_KEY;
if (!key) { console.error('ANTHROPIC_KEY required'); process.exit(1); }
const client = new Anthropic({ apiKey: key });

async function callHaiku(player, openingName, openingPgn) {
  const userMsg = `Player: ${player}\nOpening: ${openingName}\nLine (first ~12 plies of the canonical PGN): ${openingPgn.split(' ').slice(0, 12).join(' ')}\n\nReturn the JSON.`;
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  });
  const text = res.content?.[0]?.text ?? '';
  let parsed = null;
  try {
    const s = text.indexOf('{');
    const e = text.lastIndexOf('}');
    if (s !== -1 && e !== -1) parsed = JSON.parse(text.slice(s, e + 1));
  } catch (err) {
    return { parsed: null, usage: res.usage, error: err.message };
  }
  return { parsed, usage: res.usage };
}

function validateGameViaChessJs(game) {
  const errors = [];
  if (!game.pgn || typeof game.pgn !== 'string') { errors.push('no pgn string'); return { ok: false, errors }; }
  const chess = new Chess();
  const tokens = game.pgn.trim().split(/\s+/).filter(t => !/^\d+\.+$/.test(t));
  for (let i = 0; i < tokens.length; i++) {
    try { chess.move(tokens[i]); }
    catch (e) { errors.push(`illegal move ${i+1} '${tokens[i]}': ${e.message}`); return { ok: false, errors, validMoves: i }; }
  }
  // Verify critical moment FENs (if any)
  for (const cm of game.criticalMoments || []) {
    if (!cm.fen) continue;
    // We can't easily verify each FEN matches the position at that moveNumber
    // without replay. Just check it's a syntactically valid FEN.
    const parts = cm.fen.split(/\s+/);
    if (parts.length < 4) { errors.push(`bad fen on ply ${cm.moveNumber}: '${cm.fen}'`); }
    try { new Chess(cm.fen); } catch (e) { errors.push(`fen rejected: ${e.message}`); }
  }
  return { ok: errors.length === 0, errors, validMoves: tokens.length };
}

function playerForOpening(opening) {
  // pro IDs are 'pro-<player>-<line>'. Map slug to display name.
  const map = {
    'naroditsky': 'Daniel Naroditsky',
    'hikaru': 'Hikaru Nakamura',
    'carlsen': 'Magnus Carlsen',
    'caruana': 'Fabiano Caruana',
    'firouzja': 'Alireza Firouzja',
    'gothamchess': 'Levy Rozman (GothamChess)',
    'praggnanandhaa': 'Rameshbabu Praggnanandhaa',
    'niemann': 'Hans Niemann',
    'dubov': 'Daniil Dubov',
    'annacramling': 'Anna Cramling',
  };
  const m = opening.id.match(/^pro-([a-z]+)-/);
  if (!m) return null;
  return map[m[1]] ?? m[1];
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const doc = JSON.parse(await readFile(PRO_FILE, 'utf-8'));
  const openings = doc.openings ?? [];
  const queue = SAMPLE_ONLY ? openings.filter(o => SAMPLE_IDS.includes(o.id)) : openings;
  console.log(`[gen] generating model games for ${queue.length} pro openings (sample=${SAMPLE_ONLY})`);

  const raw = [];
  const validated = [];
  const rejected = [];
  let totalSpend = 0;

  for (let i = 0; i < queue.length; i++) {
    const opening = queue[i];
    const player = playerForOpening(opening);
    if (!player) { console.warn(`  [${i+1}] ${opening.id}: cannot parse player from id`); continue; }
    console.log(`  [${i+1}/${queue.length}] ${opening.id} — ${player}`);
    let parsed = null;
    let usage = null;
    let error = null;
    try {
      const r = await callHaiku(player, opening.name, opening.pgn);
      parsed = r.parsed; usage = r.usage; error = r.error;
    } catch (e) { error = e.message; }

    if (usage) {
      const cost = (usage.input_tokens || 0) / 1e6 * 1 + (usage.output_tokens || 0) / 1e6 * 5;
      totalSpend += cost;
    }
    raw.push({ openingId: opening.id, player, openingName: opening.name, parsed, usage, error });

    if (parsed?.games?.length) {
      for (let gi = 0; gi < parsed.games.length; gi++) {
        const g = parsed.games[gi];
        const v = validateGameViaChessJs(g);
        if (v.ok) {
          validated.push({
            ...g,
            id: `mg-${opening.id}-${gi}-haiku`,
            openingId: opening.id,
          });
          console.log(`     ✓ game ${gi+1}: ${g.white} vs ${g.black} (${g.year}) — ${v.validMoves} moves valid`);
        } else {
          rejected.push({ openingId: opening.id, gi, game: g, errors: v.errors });
          console.log(`     ✗ game ${gi+1}: ${v.errors.slice(0,2).join('; ')}`);
        }
      }
    } else if (parsed?.uncertainty) {
      console.log(`     — Haiku declined: ${parsed.uncertainty.slice(0, 120)}`);
    } else if (error) {
      console.log(`     ! parse error: ${error}`);
    }

    if (i % 5 === 0) {
      await writeFile(OUT_RAW, JSON.stringify({ generatedAt: new Date().toISOString(), totalSpend, raw }, null, 2));
      await writeFile(OUT_VALIDATED, JSON.stringify({ generatedAt: new Date().toISOString(), validatedCount: validated.length, rejectedCount: rejected.length, games: validated, rejected }, null, 2));
    }
  }

  await writeFile(OUT_RAW, JSON.stringify({ generatedAt: new Date().toISOString(), totalSpend, raw }, null, 2));
  await writeFile(OUT_VALIDATED, JSON.stringify({ generatedAt: new Date().toISOString(), validatedCount: validated.length, rejectedCount: rejected.length, games: validated, rejected }, null, 2));

  console.log('');
  console.log(`[gen] DONE — spend $${totalSpend.toFixed(4)}`);
  console.log(`[gen] validated games: ${validated.length}`);
  console.log(`[gen] chess.js rejected: ${rejected.length}`);
  console.log(`[gen] raw output: ${OUT_RAW}`);
  console.log(`[gen] validated subset: ${OUT_VALIDATED}`);
}

main().catch((e) => { console.error('fatal:', e); process.exit(1); });
