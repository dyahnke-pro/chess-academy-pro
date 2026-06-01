#!/usr/bin/env node
// Comprehensive per-opening data extractor for the G9.1 PRO-REP DEEP
// BUILD DOCTRINE. For one opening + one named variation:
//   - Opening spine with per-ply game counts + ALL choices at every
//     position (his and opponent's), with frequency + win-rate
//   - Middlegame pattern extraction from the games that reach the
//     opening terminus (most-played continuations in moves
//     [opening-end → end-of-data])
//   - Endgame structure classification across the same game set
//   - Top model games (decisive + highest opponent + deepest)
//   - Full PGNs for the model games (to be walked move-by-move)
//
// Usage:
//   node scripts/pro-repertoire/deep-build-data.mjs danielnaroditsky caro-kann <variation-key>
//
// variation-key is one of the keys defined per-opening below.

import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const PLAYER = process.argv[2] || 'danielnaroditsky';
const OPENING_ID = process.argv[3] || 'caro-kann';
const VARIATION_KEY = process.argv[4] || null;

const SRC_DIR = path.join('data', 'sources', `${PLAYER}-chesscom`);
const OUT_DIR = path.join('data', 'sources', `${PLAYER}-deep`);
fs.mkdirSync(OUT_DIR, { recursive: true });

// Per-opening variation paths. Each variation has a label + the
// SAN prefix that defines reaching its position. The "color" field
// tells us which side the player is on (white/black).
const OPENINGS = {
  'pirc': {
    color: 'black',
    studentUsername: 'GothamChess',
    variations: {
      'austrian-f4':  { label: 'Austrian Attack (f4)', prefix: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'f4'] },
      'classical-nf3': { label: 'Classical (Nf3)', prefix: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'Nf3'] },
      '150-attack':   { label: '150 Attack (Be3+f3)', prefix: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'Be3'] },
    },
  },
  'french': {
    color: 'black',
    studentUsername: 'GothamChess',
    variations: {
      'rubinstein-nc3': { label: 'Rubinstein vs Nc3', prefix: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'dxe4'] },
      'tarrasch-nd2':   { label: 'vs Tarrasch Nd2', prefix: ['e4', 'e6', 'd4', 'd5', 'Nd2', 'dxe4'] },
      'advance-e5':     { label: 'vs Advance e5', prefix: ['e4', 'e6', 'd4', 'd5', 'e5'] },
      'exchange':       { label: 'vs Exchange', prefix: ['e4', 'e6', 'd4', 'd5', 'exd5', 'exd5'] },
    },
  },
  'qgd': {
    color: 'black',
    studentUsername: 'GothamChess',
    variations: {
      'bf4-classical': { label: 'Classical Bf4', prefix: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'a6', 'cxd5', 'exd5', 'Bf4'] },
      'nf3-bg5':       { label: 'Nf3 + Bg5', prefix: ['d4', 'd5', 'c4', 'e6', 'Nf3'] },
      'exchange':      { label: 'Exchange', prefix: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'a6', 'cxd5', 'exd5'] },
    },
  },
  'scandinavian': {
    color: 'black',
    studentUsername: 'GothamChess',
    variations: {
      'qa5-main':  { label: 'Main 2…Qxd5 3…Qa5', prefix: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5'] },
      'nf6-bg4':   { label: 'Modern 2…Nf6 + …Bg4', prefix: ['e4', 'd5', 'exd5', 'Nf6', 'd4', 'Bg4'] },
      'nf6-nc3':   { label: '2…Nf6 vs Nc3', prefix: ['e4', 'd5', 'exd5', 'Nf6', 'Nc3'] },
      'bb5-line':  { label: 'vs Bb5+', prefix: ['e4', 'd5', 'exd5', 'Nf6', 'Bb5+'] },
    },
  },
  'closed-sicilian': {
    color: 'white',
    studentUsername: 'GothamChess',
    variations: {
      'd6-attack': { label: 'vs …d6 (opposite-castle attack)', prefix: ['e4', 'c5', 'Nc3', 'd6'] },
      'e6-line':   { label: 'vs …e6', prefix: ['e4', 'c5', 'Nc3', 'e6'] },
      'g6-line':   { label: 'vs …g6', prefix: ['e4', 'c5', 'Nc3', 'g6'] },
      'bb5-nd4':   { label: 'Bb5 vs …Nc6 (Nd4)', prefix: ['e4', 'c5', 'Nc3', 'Nc6', 'Bb5'] },
    },
  },
  'caro-advance-white': {
    color: 'white',
    studentUsername: 'GothamChess',
    variations: {
      'bf5-h4':   { label: 'Main vs …Bf5 (h4)', prefix: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'h4'] },
      'c5-break': { label: 'vs …c5', prefix: ['e4', 'c6', 'd4', 'd5', 'e5', 'c5'] },
      'h6-g4':    { label: 'vs …h6 (g4)', prefix: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'h4', 'h6'] },
      'qxd4-grab': { label: '…Qxd4 grab', prefix: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'h4', 'h5', 'Bg5', 'Qb6', 'Bd3', 'Bxd3', 'Qxd3', 'Qxd4'] },
    },
  },
  'fantasy-caro': {
    color: 'white',
    studentUsername: 'GothamChess',
    variations: {
      'dxe4-main': { label: 'Main 3…dxe4', prefix: ['e4', 'c6', 'd4', 'd5', 'f3', 'dxe4'] },
      'e6-solid':  { label: 'Solid 3…e6', prefix: ['e4', 'c6', 'd4', 'd5', 'f3', 'e6'] },
      'g6-aggr':   { label: 'Aggressive 3…g6', prefix: ['e4', 'c6', 'd4', 'd5', 'f3', 'g6'] },
      'qb6-line':  { label: '3…Qb6', prefix: ['e4', 'c6', 'd4', 'd5', 'f3', 'Qb6'] },
    },
  },
  'ponziani': {
    color: 'white',
    studentUsername: 'GothamChess',
    variations: {
      'main-d4':  { label: 'Main 3…Nf6 4.d4', prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'c3', 'Nf6', 'd4'] },
      'd5-counter': { label: '3…d5 counter', prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'c3', 'd5'] },
      'nxe4-line': { label: '4…Nxe4 line', prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'c3', 'Nf6', 'd4', 'Nxe4'] },
    },
  },
  'london': {
    color: 'white',
    studentUsername: 'GothamChess',
    variations: {
      'standard-d5': { label: 'Standard vs …d5', prefix: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5'] },
      'jobava':      { label: 'Jobava-London (Nc3)', prefix: ['d4', 'd5', 'Bf4', 'Nf6', 'Nc3'] },
      'c6-slav':     { label: 'vs …c6 Slav setup', prefix: ['d4', 'd5', 'Bf4', 'c6'] },
      'e6-setup':    { label: 'vs …e6', prefix: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6'] },
      'kid-g6':      { label: 'vs KID …g6', prefix: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'g6'] },
    },
  },
  'italian': {
    color: 'white',
    studentUsername: 'GothamChess',
    variations: {
      'giuoco-d4':  { label: 'Giuoco Piano d4 main', prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd4'] },
      'slow-d3':    { label: 'Slow Italian d3',       prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3'] },
      'evans':      { label: 'Evans Gambit',          prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4'] },
      'two-knights': { label: 'Two Knights (…Nf6)',   prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'] },
    },
  },
  'vienna': {
    color: 'white',
    studentUsername: 'GothamChess',
    variations: {
      'gambit-main': { label: 'Vienna Gambit main (f4 d5)', prefix: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5'] },
      'gambit-f5':   { label: 'Gambit with …f5',            prefix: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Qf3', 'f5'] },
      'gambit-nc6':  { label: 'Gambit with …Nc6',           prefix: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Qf3', 'Nc6'] },
      'quiet-bc4':   { label: 'Quiet Bc4 + d3 system',      prefix: ['e4', 'e5', 'Nc3', 'Nc6', 'Bc4'] },
      'gambit-accepted': { label: 'Gambit accepted …exf4',  prefix: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'exf4'] },
    },
  },
  'english': {
    color: 'white',
    studentUsername: 'GothamChess',
    variations: {
      'e5-symmetric': { label: 'Symmetric (…e5) Four Knights', prefix: ['c4', 'e5', 'Nc3', 'Nf6'] },
      'e6-antifrench': { label: 'Anti-French (…e6)',           prefix: ['c4', 'e6', 'Nc3'] },
      'c5-symmetric': { label: 'Symmetric (…c5)',              prefix: ['c4', 'c5', 'Nc3'] },
      'c6-slav':      { label: '…c6 Slav-like',                prefix: ['c4', 'c6', 'Nc3'] },
      'g6-kid':       { label: '…g6 KID / Botvinnik',          prefix: ['c4', 'g6', 'Nc3'] },
    },
  },
  'trompowsky': {
    color: 'white',
    studentUsername: 'GothamChess',
    variations: {
      'vaganian':      { label: 'Vaganian Attack (…Ne4)', prefix: ['d4', 'Nf6', 'Bg5', 'Ne4'] },
      'd5-system':     { label: '…d5 system',             prefix: ['d4', 'Nf6', 'Bg5', 'd5'] },
      'g6-fianchetto': { label: '…g6 fianchetto',         prefix: ['d4', 'Nf6', 'Bg5', 'g6'] },
      'c5-counter':    { label: '…c5 counter',            prefix: ['d4', 'Nf6', 'Bg5', 'c5'] },
      'e6-main':       { label: 'Main line vs …e6',       prefix: ['d4', 'Nf6', 'Bg5', 'e6'] },
    },
  },
  'caro-kann': {
    color: 'black',
    studentUsername: 'DanielNaroditsky',
    variations: {
      'advance-c5':       { label: 'Advance Variation 3...c5 (Botvinnik-Carls)', prefix: ['e4','c6','d4','d5','e5','c5'] },
      'advance-bf5':      { label: 'Advance Variation 3...Bf5 (textbook)',       prefix: ['e4','c6','d4','d5','e5','Bf5'] },
      'two-knights':      { label: 'Two Knights Variation (2.Nc3)',              prefix: ['e4','c6','Nc3'] },
      'kia-reti':         { label: "KIA / Réti setup (2.Nf3)",                   prefix: ['e4','c6','Nf3'] },
      'exchange':         { label: 'Exchange Variation (3.exd5)',                prefix: ['e4','c6','d4','d5','exd5','cxd5'] },
      'panov':            { label: 'Panov-Botvinnik (4.c4)',                     prefix: ['e4','c6','d4','d5','exd5','cxd5','c4'] },
      'classical':        { label: 'Classical (3.Nc3) — Tartakower main',        prefix: ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nf6'] },
      'fantasy':          { label: 'Fantasy Variation (3.f3)',                   prefix: ['e4','c6','d4','d5','f3'] },
      'modern-transposition': { label: 'Modern transposition (2.d4 g6)',         prefix: ['e4','c6','d4','g6'] },
      'd3-sideline':      { label: 'd3 sideline (2.d3)',                         prefix: ['e4','c6','d3'] },
    },
  },
  'kid': {
    color: 'black',
    studentUsername: 'DanielNaroditsky',
    variations: {
      'classical-mainline': { label: 'Classical Mar del Plata (Be2 mainline)', prefix: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2'] },
      'fianchetto':         { label: 'Fianchetto Variation (g3)',              prefix: ['d4','Nf6','c4','g6','g3'] },
      'anti-kid-nf3':       { label: 'Anti-KID with Nf3 first',                prefix: ['d4','Nf6','c4','g6','Nf3'] },
      'makogonov':          { label: 'Makogonov Variation (h3)',               prefix: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','h3'] },
      'saemisch':           { label: 'Sämisch Variation (f3)',                 prefix: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f3'] },
      'petrosian-nge2':     { label: 'Petrosian/Nge2 Setup',                   prefix: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nge2'] },
      'early-oo':           { label: 'Early O-O Variation',                    prefix: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O'] },
      'four-pawns':         { label: 'Four Pawns Attack',                      prefix: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f4'] },
    },
  },
  'kia': {
    color: 'white',
    studentUsername: 'DanielNaroditsky',
    variations: {
      'd5-reti':       { label: "vs ...d5 Reti structure (4,382 games)",  prefix: ['Nf3','d5','g3'] },
      'g6-mirror':     { label: "vs ...g6 mirror fianchetto (2,652 games)", prefix: ['Nf3','g6','g3'] },
      'd6-pirc':       { label: "vs ...d6 Pirc setup (1,155 games)",       prefix: ['Nf3','d6','g3'] },
      'c5-sicilian':   { label: "vs ...c5 Sicilian (818 games)",           prefix: ['Nf3','c5','g3'] },
      'e5-reti-open':  { label: "vs ...e5 Open (582 games)",               prefix: ['Nf3','e5'] },
      'c6-slav':       { label: "vs ...c6 Slav-like (555 games)",          prefix: ['Nf3','c6','g3'] },
      'b6-owen':       { label: "vs ...b6 Owen setup (530 games)",         prefix: ['Nf3','b6','g3'] },
      'e6-french':     { label: "vs ...e6 French-Reti (451 games)",        prefix: ['Nf3','e6','g3'] },
    },
  },
  'stafford': {
    color: 'black',
    studentUsername: 'imrosen',
    variations: {
      // 3.Nxe5 Nc6 4.Nxc6 dxc6 — the Stafford structure. 5.d3 main spine.
      'accepted-d3':     { label: 'Accepted, 5.d3 Bc5 (main)',     prefix: ['e4','e5','Nf3','Nf6','Nxe5','Nc6','Nxc6','dxc6','d3'] },
      'accepted-nc3':    { label: 'Accepted, 5.Nc3',               prefix: ['e4','e5','Nf3','Nf6','Nxe5','Nc6','Nxc6','dxc6','Nc3'] },
      'accepted-e5':     { label: 'Accepted, 5.e5 space grab',     prefix: ['e4','e5','Nf3','Nf6','Nxe5','Nc6','Nxc6','dxc6','e5'] },
      'nf3-retreat':     { label: '4.Nf3 (declines 2nd knight)',   prefix: ['e4','e5','Nf3','Nf6','Nxe5','Nc6','Nf3'] },
      'four-knights':    { label: '3.Nc3 Four Knights (decline)',  prefix: ['e4','e5','Nf3','Nf6','Nc3'] },
      'd4-push':         { label: '3.d4 push',                     prefix: ['e4','e5','Nf3','Nf6','d4'] },
      'bc4-line':        { label: '3.Bc4 bishop out',              prefix: ['e4','e5','Nf3','Nf6','Bc4'] },
      'd3-quiet':        { label: '3.d3 quiet',                    prefix: ['e4','e5','Nf3','Nf6','d3'] },
    },
  },
  'alapin-sicilian': {
    color: 'white',
    studentUsername: 'DanielNaroditsky',
    variations: {
      // Black 2nd-move alternatives (all rooted at e4 c5 c3 ?)
      'nf6-spine':    { label: '2...Nf6 main line spine (1,105 games)',           prefix: ['e4','c5','c3','Nf6','e5','Nd5','Nf3'] },
      'd5-open':      { label: '2...d5 Open Variation (783 games)',               prefix: ['e4','c5','c3','d5','exd5','Qxd5'] },
      'e6-french':    { label: '2...e6 French-style (344 games)',                 prefix: ['e4','c5','c3','e6','d4'] },
      'd6-mainline':  { label: '2...d6 main line (173 games)',                    prefix: ['e4','c5','c3','d6','d4'] },
      'g6-dragon':    { label: '2...g6 Hyper-Dragon (125 games)',                 prefix: ['e4','c5','c3','g6'] },
      'nc6-line':     { label: '2...Nc6 line (116 games)',                        prefix: ['e4','c5','c3','Nc6'] },
      // Sub-branches inside the Nf6 spine after 4.Nf3
      'nf6-d6-sub':   { label: '2...Nf6 spine, Black\'s 4...d6 (394 games)',      prefix: ['e4','c5','c3','Nf6','e5','Nd5','Nf3','d6'] },
      'nf6-e6-sub':   { label: '2...Nf6 spine, Black\'s 4...e6 (185 games)',      prefix: ['e4','c5','c3','Nf6','e5','Nd5','Nf3','e6'] },
    },
  },
  // ── Hikaru Nimzo-Larsen (1.b3) — 7,481 games, 87.3%, data-discovered tabs ──
  'nimzo-larsen': {
    color: 'white',
    studentUsername: 'Hikaru',
    variations: {
      'e5-main':  { label: '1...e5 (main)',          prefix: ['b3','e5','Bb2','Nc6','e3'] },
      'd5':       { label: '1...d5 (1848 games)',    prefix: ['b3','d5','Bb2'] },
      'nf6':      { label: '1...Nf6 (1709 games)',   prefix: ['b3','Nf6','Bb2'] },
      'c5':       { label: '1...c5 (415 games)',     prefix: ['b3','c5','Bb2'] },
      'b6':       { label: '1...b6 symmetric (392 games)', prefix: ['b3','b6','Bb2'] },
      'g6':       { label: '1...g6 (300 games)',     prefix: ['b3','g6','Bb2'] },
      'e6':       { label: '1...e6 (287 games)',     prefix: ['b3','e6','Bb2'] },
      'd6':       { label: '1...d6 (196 games)',     prefix: ['b3','d6','Bb2'] },
    },
  },
  'pirc-modern': {
    color: 'black',
    studentUsername: 'Hikaru',
    variations: {
      'main-be3':   { label: 'vs Be3 + Qd2 (150-style)', prefix: ['e4','g6','d4','Bg7','Nc3','a6','Be3'] },
      'nf3':        { label: 'vs Nf3 Classical',         prefix: ['e4','g6','d4','Bg7','Nf3'] },
      'nc3-c6':     { label: '...c6 setup',              prefix: ['e4','g6','d4','Bg7','Nc3','c6'] },
      'austrian-f4': { label: 'vs Austrian f4',          prefix: ['e4','g6','d4','Bg7','Nc3','a6','f4'] },
    },
  },
  'hikaru-reti': {
    color: 'white',
    studentUsername: 'Hikaru',
    variations: {
      'kia-d4':   { label: 'Réti into d4/b3 system', prefix: ['Nf3','Nf6','b3','g6','Bb2'] },
      'vs-d5':    { label: 'vs ...d5',               prefix: ['Nf3','d5','b3'] },
      'vs-c5':    { label: 'vs ...c5',               prefix: ['Nf3','c5','b3'] },
    },
  },
  'hikaru-closed-sicilian': {
    color: 'white',
    studentUsername: 'Hikaru',
    variations: {
      'grand-prix-f4': { label: 'Grand Prix f4 + f5', prefix: ['e4','c5','Nc3','Nc6','f4'] },
      'g6-line':       { label: 'vs ...g6',            prefix: ['e4','c5','Nc3','Nc6','f4','g6'] },
      'e6-line':       { label: 'vs ...e6',            prefix: ['e4','c5','Nc3','Nc6','f4','e6'] },
    },
  },
  'hikaru-caro-kann': {
    color: 'black',
    studentUsername: 'Hikaru',
    variations: {
      'advance-bf5': { label: 'vs Advance 3.e5 Bf5', prefix: ['e4','c6','d4','d5','e5','Bf5'] },
      'exchange':    { label: 'vs Exchange/Panov',    prefix: ['e4','c6','d4','d5','exd5'] },
      'two-knights': { label: 'vs Two Knights',       prefix: ['e4','c6','Nc3'] },
    },
  },
  // ===== Aman Hambleton (chessbrah) — 2026-06-01 build =====
  'aman-sicilian-kan': {
    color: 'black',
    studentUsername: 'chessbrah',
    variations: {
      'open-main':    { label: 'Open Kan (Nc3 Qc7 Bd3 f4)', prefix: ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'a6', 'Nc3', 'Qc7', 'Bd3'] },
      'bd3-early':    { label: 'Bd3 early (4…a6 5.Bd3)', prefix: ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'a6', 'Bd3'] },
      'taimanov-nc6': { label: 'Taimanov (…Nc6)', prefix: ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nc6'] },
      'maroczy-c4':   { label: 'Maróczy Bind (c4)', prefix: ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'a6', 'c4'] },
      'alapin-c3':    { label: 'vs Alapin (2.c3)', prefix: ['e4', 'c5', 'c3'] },
      'kia-g3':       { label: 'vs KIA (g3)', prefix: ['e4', 'c5', 'Nf3', 'e6', 'g3'] },
      'nc3-2':        { label: 'vs 2.Nc3', prefix: ['e4', 'c5', 'Nc3'] },
    },
  },
  'aman-nimzo-indian': {
    color: 'black',
    studentUsername: 'chessbrah',
    variations: {
      'rubinstein-e3': { label: 'Rubinstein (e3)', prefix: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3'] },
      'bogo-nf3':      { label: 'Bogo-Indian (3.Nf3 Bb4+)', prefix: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'Bb4+'] },
      'classical-qc2': { label: 'Classical (4.Qc2)', prefix: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2'] },
      'catalan-g3':    { label: 'vs Catalan/g3', prefix: ['d4', 'Nf6', 'c4', 'e6', 'g3'] },
      'samisch-f3':    { label: 'vs Sämisch (f3)', prefix: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'f3'] },
    },
  },
  'aman-caro-kann': {
    color: 'black',
    studentUsername: 'chessbrah',
    variations: {
      'advance-bf5':  { label: 'Advance (…Bf5)', prefix: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5'] },
      'two-knights':  { label: 'vs Two Knights (2.Nf3)', prefix: ['e4', 'c6', 'Nf3'] },
      'nc3-2':        { label: 'vs 2.Nc3', prefix: ['e4', 'c6', 'Nc3'] },
      'exchange':     { label: 'vs Exchange (3.exd5)', prefix: ['e4', 'c6', 'd4', 'd5', 'exd5'] },
    },
  },
  'aman-reti': {
    color: 'white',
    studentUsername: 'chessbrah',
    variations: {
      'vs-d5-qgd':    { label: 'vs …d5 (QGD/Slav structures)', prefix: ['Nf3', 'd5'] },
      'vs-g6-kia':    { label: 'vs …g6 (KIA/e4)', prefix: ['Nf3', 'g6'] },
      'double-fianch': { label: 'Double Fianchetto (g3)', prefix: ['Nf3', 'Nf6', 'g3'] },
      'vs-c5-rossolimo': { label: 'vs …c5 (e4 → Rossolimo)', prefix: ['Nf3', 'c5'] },
      'vs-e5':        { label: 'vs …e5', prefix: ['Nf3', 'e5'] },
    },
  },
  'aman-ruy-lopez': {
    color: 'white',
    studentUsername: 'chessbrah',
    variations: {
      'morphy-a6':   { label: 'Morphy (…a6)', prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'] },
      'berlin':      { label: 'Berlin (…Nf6)', prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'] },
      'classical-bc5': { label: 'Classical (…Bc5)', prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Bc5'] },
      'exchange-a6': { label: 'Exchange (Bxc6)', prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6'] },
    },
  },
  'aman-open-sicilian': {
    color: 'white',
    studentUsername: 'chessbrah',
    variations: {
      'najdorf-a6':   { label: 'vs Najdorf (…a6)', prefix: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'] },
      'scheveningen-e6': { label: 'vs Scheveningen (…e6)', prefix: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e6'] },
      'classical-nc6': { label: 'vs Classical (…Nc6)', prefix: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'Nc6'] },
      'dragon-g6':    { label: 'vs Dragon (…g6)', prefix: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'] },
    },
  },
  'aman-rossolimo': {
    color: 'white',
    studentUsername: 'chessbrah',
    variations: {
      'g6-fianch':  { label: 'vs …g6 (Bxc6)', prefix: ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'g6'] },
      'e6-line':    { label: 'vs …e6', prefix: ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'e6'] },
      'd6-moscow':  { label: 'Moscow vs …d6', prefix: ['e4', 'c5', 'Nf3', 'd6', 'Bb5+'] },
    },
  },
  'aman-french-white': {
    color: 'white',
    studentUsername: 'chessbrah',
    variations: {
      'winawer-bb4': { label: 'Winawer (…Bb4)', prefix: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4'] },
      'classical-nf6': { label: 'Classical (…Nf6)', prefix: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'] },
      'rubinstein-dxe4': { label: 'Rubinstein (…dxe4)', prefix: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'dxe4'] },
    },
  },
  'aman-anti-caro': {
    color: 'white',
    studentUsername: 'chessbrah',
    variations: {
      'two-knights-bg4': { label: 'Two Knights (…Bg4)', prefix: ['e4', 'c6', 'Nc3', 'd5', 'Nf3', 'Bg4'] },
      'two-knights-dxe4': { label: 'Two Knights (…dxe4)', prefix: ['e4', 'c6', 'Nc3', 'd5', 'Nf3', 'dxe4'] },
      'g6-line':     { label: 'vs …g6', prefix: ['e4', 'c6', 'Nc3', 'd5', 'Nf3', 'g6'] },
    },
  },
};

const opening = OPENINGS[OPENING_ID];
if (!opening) { console.error(`unknown opening: ${OPENING_ID}`); process.exit(1); }
const variation = VARIATION_KEY ? opening.variations[VARIATION_KEY] : null;
if (VARIATION_KEY && !variation) { console.error(`unknown variation: ${VARIATION_KEY}; available: ${Object.keys(opening.variations).join(', ')}`); process.exit(1); }

// Fast PGN extractor
const PGN_HEADER_END = /\n\n/;
function pgnToSan(pgnText) {
  const i = pgnText.search(PGN_HEADER_END);
  if (i < 0) return null;
  let b = pgnText.slice(i).replace(/\{[^}]*\}/g, '');
  let prev; do { prev = b; b = b.replace(/\([^()]*\)/g, ''); } while (b !== prev);
  b = b.replace(/\b\d+\.+\s*/g, '').replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim();
  return b ? b.split(/\s+/).filter(Boolean) : null;
}

function matchesPrefix(moves, prefix) {
  if (moves.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) if (moves[i] !== prefix[i]) return false;
  return true;
}

const RESULT_TO = { win:'win', checkmated:'loss', resigned:'loss', timeout:'loss', abandoned:'loss', agreed:'draw', stalemate:'draw', insufficient:'draw', '50move':'draw', repetition:'draw', timevsinsufficient:'draw' };
function outcomeFor(game, studentIsWhite) {
  const me = studentIsWhite ? game.white : game.black;
  const mine = RESULT_TO[me.result] || me.result;
  if (mine === 'win') return 'win';
  if (mine === 'draw') return 'draw';
  return 'loss';
}

function classifyEndgame(board) {
  let wp=0,bp=0,wn=0,bn=0,wb=0,bb=0,wr=0,br=0,wq=0,bq=0;
  for (const row of board) for (const sq of row) {
    if (!sq) continue;
    const k = (sq.color === 'w' ? 'w' : 'b') + sq.type;
    if (k === 'wp') wp++; else if (k==='bp') bp++;
    else if (k === 'wn') wn++; else if (k==='bn') bn++;
    else if (k === 'wb') wb++; else if (k==='bb') bb++;
    else if (k === 'wr') wr++; else if (k==='br') br++;
    else if (k === 'wq') wq++; else if (k==='bq') bq++;
  }
  const minors = wn+bn+wb+bb;
  const majors = wr+br;
  const queens = wq+bq;
  let type;
  if (queens === 0 && majors === 0 && minors === 0) type = 'K+P';
  else if (queens === 0 && majors === 0 && minors > 0) type = 'minor pieces + P';
  else if (queens === 0 && minors === 0 && majors > 0) type = 'R+P';
  else if (queens === 0 && minors > 0 && majors > 0) type = 'R + minor + P';
  else if (queens > 0 && majors === 0 && minors === 0) type = 'Q+P';
  else if (queens > 0) type = 'middlegame (Q + pieces)';
  else type = 'unclassified';
  return { type, material: { wp, bp, wn, bn, wb, bb, wr, br, wq, bq } };
}

function* iterGames() {
  const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.jsonl')).sort();
  for (const f of files) {
    const lines = fs.readFileSync(path.join(SRC_DIR, f), 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      try { yield JSON.parse(line); } catch {}
    }
  }
}

// Derive the student from the PLAYER arg so one opening config serves
// every player (the per-opening studentUsername field is now a fallback).
const dnLc = (PLAYER || opening.studentUsername).toLowerCase();
const playerColor = opening.color;
const prefix = variation ? variation.prefix : [];

// Find all games matching the prefix
const matched = [];
for (const game of iterGames()) {
  if (!game.pgn) continue;
  const isWhite = (game.white?.username || '').toLowerCase() === dnLc;
  const isBlack = (game.black?.username || '').toLowerCase() === dnLc;
  if (playerColor === 'white' && !isWhite) continue;
  if (playerColor === 'black' && !isBlack) continue;
  if (!isWhite && !isBlack) continue;

  const moves = pgnToSan(game.pgn);
  if (!moves) continue;
  if (prefix.length > 0 && !matchesPrefix(moves, prefix)) continue;

  const outcome = outcomeFor(game, isWhite);
  matched.push({
    url: game.url,
    pgn: game.pgn,
    opponent: isWhite ? game.black?.username : game.white?.username,
    opponentRating: isWhite ? game.black?.rating : game.white?.rating,
    studentRating: isWhite ? game.white?.rating : game.black?.rating,
    timeClass: game.time_class,
    date: game.end_time ? new Date(game.end_time * 1000).toISOString().slice(0, 10) : null,
    moves,
    outcome,
  });
}

console.log(`\n=== ${OPENING_ID} / ${VARIATION_KEY || '(all games)'} ===`);
console.log(`Games matched: ${matched.length}`);
console.log(`Score: ${matched.filter(g => g.outcome === 'win').length}W / ${matched.filter(g => g.outcome === 'draw').length}D / ${matched.filter(g => g.outcome === 'loss').length}L (${(matched.filter(g => g.outcome === 'win' || g.outcome === 'draw').reduce((a, g) => a + (g.outcome === 'win' ? 1 : 0.5), 0) / matched.length * 100).toFixed(1)}%)`);

// === 1. Opening spine — walk most-played, show ALL choices at each ply
console.log(`\n--- 1. Opening spine (aggregate) with per-ply choices ---`);
const spineMoves = [...prefix];
let openingDepth = prefix.length;
while (openingDepth < 60) {
  const moveCounts = {};
  const moveResults = {};
  for (const g of matched) {
    if (g.moves.length <= openingDepth) continue;
    let stillOnSpine = true;
    for (let i = 0; i < openingDepth; i++) {
      if (g.moves[i] !== spineMoves[i]) { stillOnSpine = false; break; }
    }
    if (!stillOnSpine) continue;
    const m = g.moves[openingDepth];
    moveCounts[m] = (moveCounts[m] || 0) + 1;
    if (!moveResults[m]) moveResults[m] = { win: 0, draw: 0, loss: 0 };
    moveResults[m][g.outcome]++;
  }
  if (Object.keys(moveCounts).length === 0) break;
  const sorted = Object.entries(moveCounts).sort((a, b) => b[1] - a[1]);
  const [top, topGames] = sorted[0];
  if (topGames < 3) break;
  const score = (((moveResults[top].win + moveResults[top].draw / 2) / topGames) * 100).toFixed(0);
  const sideName = (openingDepth % 2 === 0) ? 'White' : 'Black';
  const alts = sorted.slice(1).filter(([, n]) => n >= 3).map(([m, n]) => `${m}(${n}, ${((moveResults[m].win + moveResults[m].draw/2) / n * 100).toFixed(0)}%)`).join(', ');
  console.log(`  ply ${(openingDepth + 1).toString().padStart(2)} (${sideName}): ${top.padEnd(10)} ${topGames.toString().padStart(4)}g ${score}% | alts: ${alts || '(none ≥3)'}`);
  spineMoves.push(top);
  openingDepth++;
}
console.log(`  Opening terminus: ply ${openingDepth}, move ${Math.ceil(openingDepth / 2)}`);

// === 2. Middlegame pattern extraction from games at terminus
console.log(`\n--- 2. Middlegame patterns (moves ${Math.ceil(openingDepth / 2)}–25) from games at terminus ---`);
const atTerminus = matched.filter(g => {
  if (g.moves.length <= openingDepth + 2) return false;
  for (let i = 0; i < openingDepth; i++) if (g.moves[i] !== spineMoves[i]) return false;
  return true;
});
console.log(`  Games reaching terminus: ${atTerminus.length}`);
const MAX_MIDGAME = Math.min(openingDepth + 25, 65);
for (let p = openingDepth; p < MAX_MIDGAME; p++) {
  const moveCounts = {};
  for (const g of atTerminus) {
    if (g.moves[p]) moveCounts[g.moves[p]] = (moveCounts[g.moves[p]] || 0) + 1;
  }
  const sorted = Object.entries(moveCounts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) break;
  const sideName = (p % 2 === 0) ? 'White' : 'Black';
  const top5 = sorted.slice(0, 5).map(([m, n]) => `${m}(${n})`).join(', ');
  console.log(`  ply ${(p + 1).toString().padStart(2)} (${sideName}): ${top5}`);
}

// === 3. Endgame structure classification
console.log(`\n--- 3. Endgame structures across ${atTerminus.length} games ---`);
const endTypes = {};
for (const g of atTerminus) {
  if (g.moves.length < 30) continue;  // skip games that didn't reach endgame
  const c = new Chess();
  for (const m of g.moves) { try { c.move(m); } catch { break; } }
  const cls = classifyEndgame(c.board());
  endTypes[cls.type] = (endTypes[cls.type] || 0) + 1;
}
for (const [t, n] of Object.entries(endTypes).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${n.toString().padStart(2)} games — ${t}`);
}

// === 4. Top model games
console.log(`\n--- 4. Top representative games (decisive + high opponent + deep) ---`);
const decisive = atTerminus.filter(g => g.outcome === 'win' || g.outcome === 'loss');
const ranked = decisive.sort((a, b) => {
  const aScore = (a.opponentRating || 0) + a.moves.length * 0.3 + (a.outcome === 'win' ? 200 : 0);
  const bScore = (b.opponentRating || 0) + b.moves.length * 0.3 + (b.outcome === 'win' ? 200 : 0);
  return bScore - aScore;
}).slice(0, 5);
for (const g of ranked) {
  console.log(`  [${g.opponentRating}] vs ${g.opponent.padEnd(20)} ${g.date} ${g.timeClass.padEnd(7)} ${g.moves.length}p ${g.outcome.padEnd(4)} ${g.url}`);
}

// === 5. Write summary file
const out = {
  player: PLAYER,
  openingId: OPENING_ID,
  variationKey: VARIATION_KEY,
  variation,
  generatedAt: new Date().toISOString(),
  totalGames: matched.length,
  wins: matched.filter(g => g.outcome === 'win').length,
  draws: matched.filter(g => g.outcome === 'draw').length,
  losses: matched.filter(g => g.outcome === 'loss').length,
  openingTerminusPly: openingDepth,
  openingTerminusMove: Math.ceil(openingDepth / 2),
  spineMoves,
  gamesAtTerminus: atTerminus.length,
  endgameTypeBreakdown: endTypes,
  topModelGames: ranked.map(g => ({
    url: g.url, opponent: g.opponent, opponentRating: g.opponentRating,
    studentRating: g.studentRating, date: g.date, timeClass: g.timeClass,
    outcome: g.outcome, plyCount: g.moves.length, pgn: g.pgn,
  })),
};
const outPath = path.join(OUT_DIR, `${OPENING_ID}-${VARIATION_KEY || 'all'}.json`);
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`\nWritten to ${outPath}`);
