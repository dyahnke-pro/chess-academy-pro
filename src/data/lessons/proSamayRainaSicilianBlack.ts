import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — Sicilian Defense (Black). DATA-REBUILT 2026-06-01: his
// real most-played Open-Sicilian line is the …Nc6/…e5 Kalashnikov (697 games),
// NOT the Najdorf the old lesson taught (≈2 games). Spine from his chess.com
// corpus via samay-modal-line.mjs. Two registers; no move-number prefixes.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-space', 'concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Kalashnikov-Variation', 'https://api.chess.com/pub/player/samayraina/games/archives'];

export const PRO_SAMAYRAINA_SICILIAN_BLACK_LESSON: LessonScript = {
  openingId: 'pro-samayraina-sicilian-black', title: "This repertoire's Sicilian — the …e5 Kalashnikov", minutes: 8,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'c5', moves: 'e4 c5',
      highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "The Sicilian — This repertoire's main weapon as Black and the most combative answer to e4. From the very first move Black plays for the full point, not just to equalise.",
      sayShort: '…c5 — fight for the win.' }),
    b({ id: 'nc6-e5', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e5',
      arrows: [], highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "Nc6 and then the thematic e5 — the heart of this repertoire's system. Rather than the slow Najdorf, he hits the d4-knight at once and grabs central space. The knight must retreat or trade, and Black already dictates the centre.",
      sayShort: '…e5 — kick the d4-knight.' }),
    b({ id: 'bxc6', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e5 Nxc6 bxc6',
      highlights: [{ square: 'c6', color: KEY }, { square: 'e5', color: SOFT }],
      say: "White usually trades with Nxc6 and we recapture toward the centre with bxc6. Look at what Black gets: a broad pawn front on c6 and e5, the two bishops, and a half-open b-file pointing straight at White's queenside.",
      sayShort: '…bxc6 — build the big centre.' }),
    b({ id: 'nf6', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e5 Nxc6 bxc6 Nc3 Nf6',
      arrows: [A('f6', 'e4')], highlights: [{ square: 'f6', color: KEY }, { square: 'e4', color: KEY }],
      say: "We develop with Nf6, attacking the e4-pawn immediately and forcing White to spend energy defending it. Every Black move asks a question.",
      sayShort: '…Nf6 — hit the e4-pawn.' }),
    b({ id: 'bb4', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e5 Nxc6 bxc6 Nc3 Nf6 Bg5 Bb4',
      arrows: [A('b4', 'c3')], highlights: [{ square: 'b4', color: KEY }, { square: 'c3', color: KEY }],
      say: "White pins with Bg5; we answer with Bb4, pinning the c3-knight — the defender of e4. Now the pressure on e4 is real, and the bishop pair gives Black the long-term trumps in an open position.",
      sayShort: '…Bb4 — pin the e4-defender.' }),
    b({ id: 'plan', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e5 Nxc6 bxc6 Nc3 Nf6 Bg5 Bb4',
      arrows: [A('c8', 'a6')], highlights: [{ square: 'd5', color: SOFT }, { square: 'e4', color: KEY }],
      say: "The plan is clear: keep piling on e4, break with d5 when the moment is right, and put the bishop pair and the open b- and c-files to work. This is the Sicilian this repertoire plays — initiative over comfort, the full point over a draw.",
      sayShort: 'Plan: pressure e4, break with …d5.' }),
  ],
};
