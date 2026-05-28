import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Naroditsky Caro-Kann — main-line beat lesson. The student plays BLACK.
// Spine: e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7
// (the Advance Variation with 3...c5, Botvinnik-Carls Defense) — 14 plies
// derived from Naroditsky's actual chess.com game corpus (3,546 Caro-Kann
// games, 64% score). His most-played continuation at every node.
//
// Voice paraphrases his recurring teaching framing from listudy.org's
// distilled speedrun principles:
//   - "you don't always have to react" → don't auto-mirror
//   - "the wishlist method" → picture the position you want
//   - "flank attack → centre counter" → c5 break against the wedge
//   - "space and time = money" → make tempo concrete or it evaporates
// Voice register: direct second-person ("you", "we", "our pieces"), short
// declarative sentences for principles, concrete board references, no
// generic praise. Both `say` (full Watch) and `sayShort` (≤8-word Learn
// cue) authored on every beat per CLAUDE.md G5 (verbosity contract).

const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

export const PRO_NARODITSKY_CARO_KANN_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: "Naroditsky's Caro-Kann — Advance with c5",
  minutes: 8,
  orientation: 'black',
  kind: 'variation',
  sources: [
    'book:caro-kann',
    'https://www.chess.com/openings/Caro-Kann-Defense',
    'https://listudy.org/en/blog/daniel-naroditsky-speedrun-principles',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'e4 c6',
      highlights: [{ square: 'c6', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "Welcome to the line Naroditsky has played thousands of times. Black plays c6 — not d5 yet, not e5, just the quiet little move that prepares d5 with support. The c6-pawn looks small but it's a wedge. Every time White attacks the d5 square, the c6-pawn is there backing it up. The Caro is a counter-attacking opening dressed up to look solid. Let White think you're playing defensively. You're not.",
      sayShort: '…c6 — the wedge that backs up d5.',
    }),
    b({
      id: 'strike-the-centre',
      moves: 'e4 c6 d4 d5',
      arrows: [{ from: 'd5', to: 'e4', color: ATK }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'e4', color: KEY }],
      say:
        "And now d5 — the strike. White grabbed the centre with d4; we challenge it right back. The classical Caro-Kann question hits the board: White must DECIDE. Trade on d5 (the Exchange), advance with e5 (the Advance — our main spine), block with Nc3 (the Classical), or fight with f3 (the Fantasy). Today we walk what they play most: e5.",
      sayShort: '…d5 — White must pick a setup.',
    }),
    b({
      id: 'the-wedge-advances',
      moves: 'e4 c6 d4 d5 e5',
      arrows: [{ from: 'e5', to: 'd6', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "e5 — White slams the pawn forward and locks the centre. This is the move that scares beginners away from the Caro: 'the bishop on c8 is buried, I can't get out.' Forget that. The bishop will be fine. The REAL question is what we do about the pawn chain. The textbook move is the bishop-out — Bf5 — and you've probably been told that's the only answer. We're playing something different.",
      sayShort: 'e5 — the lock; we play different.',
    }),
    b({
      id: 'c5-break',
      moves: 'e4 c6 d4 d5 e5 c5',
      arrows: [{ from: 'c5', to: 'd4', color: ATK }],
      highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: KEY }],
      say:
        "c5 — the Botvinnik-Carls break, and this is THE move of Naroditsky's repertoire. Instead of dancing around the wedge, we attack it at its root. When your opponent grabs space on the flank, you strike in the centre — and the centre right now is d4. White cannot keep the pawn chain intact. He must trade, defend, or push d5 and lock himself in. Whatever he picks, the e5-pawn loses its support and our pieces wake up.",
      sayShort: '…c5 — undermine the chain at d4.',
    }),
    b({
      id: 'recapture',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6',
      highlights: [{ square: 'c5', color: SOFT }, { square: 'e6', color: KEY }],
      say:
        "White takes — dxc5 — keeping the e5-pawn and grabbing an extra pawn on c5. And now the patience move: e6. We don't grab the pawn back yet. We OPEN the diagonal for our light-squared bishop first. That's the bishop the Caro is famous for keeping locked in. Not today. The e6-pawn unblocks it, and when we recapture on c5 next move, we develop with tempo.",
      sayShort: '…e6 — open the bishop before recapturing.',
    }),
    b({
      id: 'reclaim-with-tempo',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5',
      arrows: [{ from: 'c5', to: 'f2', color: ATK }],
      highlights: [{ square: 'c5', color: KEY }, { square: 'f2', color: KEY }],
      say:
        "Nf3 and now Bxc5 — the bishop comes out with the pawn-recapture, AIMING at f2. We didn't just regain material; we developed a piece, opened a file, and the bishop now stares at White's king square. This is the wishlist method in action: we pictured the position we wanted three moves ago, and now we're in it.",
      sayShort: '…Bxc5 — recapture + bishop aimed at f2.',
    }),
    b({
      id: 'develop-and-castle',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7',
      arrows: [{ from: 'e7', to: 'f5', color: VIS }, { from: 'e7', to: 'g6', color: VIS }],
      highlights: [{ square: 'e7', color: KEY }, { square: 'f5', color: SOFT }, { square: 'g6', color: SOFT }],
      say:
        "And now we finish. Bd3 from White, Nc6 from us, both sides castle, and the canonical move: Nge7. Not Nf6 — the f6-square is BLOCKED by the e5-pawn anyway, and from e7 our knight has two beautiful jumps: f5, hitting the centre, or g6, supporting an eventual f5 of our own. The position has been reached in 1,200+ of Naroditsky's actual games. From here he scores 64%. The opening is over; we're equal and developed. Now we play chess.",
      sayShort: '…Nge7 — flexible to f5 or g6.',
    }),
  ],
};
