import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Naroditsky Caro-Kann — main-line beat lesson at FULL G9.1 DEPTH.
// The student plays BLACK.
//
// Spine: e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7
//        Nbd2 Ng6 Nb3 Bb6 Re1 Qc7 a4 a6
// (the Advance Variation with 3...c5, Botvinnik-Carls Defense) —
// 22-ply spine derived from his 528 Advance-c5 games on chess.com,
// the deepest most-played path before games branch (3 games at the
// exact terminus; 528 at the root). Per-ply choice frequencies and
// alternative-move scores from the same corpus.
//
// Voice register: paraphrases his recurring teaching framing — both
// the Listudy "25 Lessons" speedrun distillation (sourced principle
// per beat) and the fan-authored sourcing in docs/pro-repertoires-
// audit.md (Naroditsky Top Theory Speedrun, his Chessable threads,
// his YouTube speedrun titles per opening). Per-opening YouTube
// transcripts not directly pulled — sandbox blocked by Google
// bot-check on datacenter IP; transcript-level voice content is a
// planned David-side handoff. Two registers on every beat: full
// `say` for Watch + ≤8-word `sayShort` for Learn cue, both gated
// by voiceService verbosity (G5).
//
// G9.1 build philosophy: opening (data-derived aggregate) →
// middlegame (pattern-extracted from games at terminus) → endgame
// (structure extracted from how the games actually END). Every beat
// names a concrete board element and ties to either his actual game
// count at that position or a sourced teaching principle.

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
  minutes: 14,
  orientation: 'black',
  kind: 'variation',
  sources: [
    'book:caro-kann',
    'https://www.chess.com/openings/Caro-Kann-Defense',
    'https://listudy.org/en/blog/daniel-naroditsky-speedrun-principles',
    'https://www.chessable.com/discussion/thread/697937/gm-naroditskys-top-theory-speedrun/1000/',
  ],
  beats: [
    // ============ OPENING PHASE (plies 1-14) ============
    b({
      id: 'open',
      moves: 'e4 c6',
      highlights: [{ square: 'c6', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "Welcome to the Caro-Kann — the line Naroditsky plays as Black against e4 in 3,546 of his chess.com games, scoring 64% across that whole sample. Black plays c6 — not d5 yet, not e5, just the quiet little move that prepares d5 with support. The c6-pawn looks small but it's a wedge. Every time White attacks the d5 square, the c6-pawn is there backing it up. The Caro is a counter-attacking opening dressed up to look solid. Let White think you're playing defensively. You're not.",
      sayShort: 'c6 — the wedge that backs d5.',
    }),
    b({
      id: 'whites-choice',
      moves: 'e4 c6 d4',
      highlights: [{ square: 'd4', color: KEY }],
      say:
        "And the most-played response: d4 — 1,862 of his 3,546 games, the classical centre-build. White seizes the centre with both feet. Now the game shapes around what we choose. The textbook answer is d5 — challenge it back. Of his games at this position, the d5 strike happens 1,527 times. That's our move.",
      sayShort: 'd4 — White builds the centre.',
    }),
    b({
      id: 'strike-the-centre',
      moves: 'e4 c6 d4 d5',
      arrows: [{ from: 'd5', to: 'e4', color: ATK }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'e4', color: KEY }],
      say:
        "d5 — the strike. White grabbed the centre with d4; we challenge it right back. The classical Caro-Kann question hits the board: White must DECIDE. Trade on d5 (the Exchange, 372 of his games), advance with e5 (the Advance, 603 — our spine), block with Nc3 (the Classical, 295), or fight with f3 (the Fantasy, 189 — and his BEST score, 75%). Today we walk what they play most: e5.",
      sayShort: 'd5 — make White pick a setup.',
    }),
    b({
      id: 'the-wedge-advances',
      moves: 'e4 c6 d4 d5 e5',
      arrows: [{ from: 'e5', to: 'd6', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "e5 — White slams the pawn forward and locks the centre. This is the move that scares beginners away from the Caro: 'the bishop on c8 is buried, I can't get out.' Forget that. The bishop will be fine. The REAL question is what we do about the pawn chain. The textbook move is the bishop-out — Bf5 — which he played 53 times here. We're playing something different: the line he chose in 528 of these positions. Five hundred and twenty eight games. He's certain about this.",
      sayShort: 'e5 — the lock; we play differently.',
    }),
    b({
      id: 'c5-break',
      moves: 'e4 c6 d4 d5 e5 c5',
      arrows: [{ from: 'c5', to: 'd4', color: ATK }],
      highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: KEY }],
      say:
        "c5 — the Botvinnik-Carls break, and this is THE move of Naroditsky's repertoire against the Advance. Instead of dancing around the wedge, we attack it at its root. When your opponent grabs space on the flank, you strike in the centre — and the centre right now is d4. White cannot keep the pawn chain intact. He must trade, defend, or push d5 and lock himself in. The most-played response is the pawn grab — dxc5 — and that's our spine.",
      sayShort: 'c5 — undermine the chain at d4.',
    }),
    b({
      id: 'recapture',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6',
      highlights: [{ square: 'c5', color: SOFT }, { square: 'e6', color: KEY }],
      say:
        "White takes — dxc5 — keeping the e5-pawn and grabbing an extra pawn on c5. And now the patience move: e6. We don't grab the pawn back yet. We OPEN the diagonal for our light-squared bishop first. That's the bishop the Caro is famous for keeping locked in. Not today. The e6-pawn unblocks the c8-bishop's diagonal, and when we recapture on c5 next move, we develop with tempo. The principle: when you're recovering material, take the longer path that develops a piece on the way.",
      sayShort: 'e6 — open the bishop, then recapture.',
    }),
    b({
      id: 'reclaim-with-tempo',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5',
      arrows: [{ from: 'c5', to: 'f2', color: ATK }],
      highlights: [{ square: 'c5', color: KEY }, { square: 'f2', color: KEY }],
      say:
        "Nf3 from White finishes their kingside development, and now Bxc5 — the bishop comes out with the pawn-recapture, AIMING at f2. We didn't just regain material; we developed a piece, opened the c-file, and the bishop now stares at White's king square. This is the wishlist method in action: we pictured the position we wanted three moves ago, and now we're in it.",
      sayShort: 'Bxc5 — recapture + bishop aimed at f2.',
    }),
    b({
      id: 'develop-and-castle',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7',
      arrows: [{ from: 'e7', to: 'f5', color: VIS }, { from: 'e7', to: 'g6', color: VIS }],
      highlights: [{ square: 'e7', color: KEY }, { square: 'f5', color: SOFT }, { square: 'g6', color: SOFT }],
      say:
        "And now we finish the opening. Bd3 from White, Nc6 from us, both sides castle, and the canonical move: Nge7. Not Nf6 — the f6-square is BLOCKED by the e5-pawn anyway, and from e7 our knight has two beautiful jumps: f5, hitting the centre, or g6, supporting an eventual f5 of our own. The position has been reached countless times in his Caro games. From here we're equal, developed, and ready for the middlegame. The opening's seven-move setup is over; the next seven moves define the middlegame.",
      sayShort: 'Nge7 — flexible to f5 or g6.',
    }),
    // ============ DEEP OPENING / EARLY MIDDLEGAME (plies 15-22) ============
    b({
      id: 'white-reroutes',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7 Nbd2',
      arrows: [{ from: 'd2', to: 'b3', color: VIS }],
      highlights: [{ square: 'd2', color: KEY }, { square: 'b3', color: SOFT }],
      say:
        "Nbd2 — White's knight reroute. The queen-knight wasn't doing anything on b1, so it heads via d2 to b3 where it pressures our c5-bishop and the c5-square in general. White's middlegame plan is becoming clear: trade off our active pieces, neutralise, grind. Our reply must answer the question — do we keep the bishop alive, or trade-and-restructure?",
      sayShort: 'Nbd2 — reroute to b3.',
    }),
    b({
      id: 'knight-reroute',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7 Nbd2 Ng6',
      arrows: [{ from: 'g6', to: 'f4', color: VIS }, { from: 'g6', to: 'e5', color: ATK }],
      highlights: [{ square: 'g6', color: KEY }, { square: 'f4', color: SOFT }, { square: 'e5', color: SOFT }],
      say:
        "Ng6 — exactly the move the lesson promised. The e7-knight reroutes to g6, eyeing both f4 (the prize outpost) and e5 (pressuring White's spearhead pawn). We bought this square ten moves ago when we played Nge7 instead of Nf6. Now it pays off. The knight on g6 is one of the most powerful piece-placements in the entire Caro repertoire.",
      sayShort: 'Ng6 — eye f4 and pressure e5.',
    }),
    b({
      id: 'bishop-on-the-rim',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7 Nbd2 Ng6 Nb3',
      arrows: [{ from: 'b3', to: 'c5', color: ATK }],
      highlights: [{ square: 'b3', color: KEY }, { square: 'c5', color: KEY }],
      say:
        "Nb3 — the knight lands and hits our c5-bishop. White is forcing us to decide. We can retreat (Bb6, the standard), or accept the trade. The principle: when a piece is attacked and we have a quiet retreat that keeps activity, take it. The bishop on b6 is still active, still on the diagonal, and now perfectly placed to support the queenside expansion that's coming.",
      sayShort: 'Nb3 — White hits the bishop.',
    }),
    b({
      id: 'bishop-retreats',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7 Nbd2 Ng6 Nb3 Bb6',
      highlights: [{ square: 'b6', color: KEY }],
      say:
        "Bb6 — the bishop retreats one square. From b6 it still controls the a7-g1 diagonal, still pressures f2, and now also defends c7. The retreat looks passive but it's actually preparation: our next move releases queen + rook into the queenside, and the bishop on b6 is part of that machine.",
      sayShort: 'Bb6 — retreat without losing activity.',
    }),
    b({
      id: 'rook-lift',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7 Nbd2 Ng6 Nb3 Bb6 Re1',
      arrows: [{ from: 'e1', to: 'e5', color: VIS }],
      highlights: [{ square: 'e1', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "Re1 from White — the rook lifts behind the e-pawn. White is preparing to support an eventual e6 push, or simply consolidating their centre. We need to match the activity. Queen out, lining up on the c-file where the open file already belongs to us.",
      sayShort: 'Re1 — White supports the centre.',
    }),
    b({
      id: 'queen-to-c7',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7 Nbd2 Ng6 Nb3 Bb6 Re1 Qc7',
      arrows: [{ from: 'c7', to: 'c1', color: VIS }],
      highlights: [{ square: 'c7', color: KEY }, { square: 'c8', color: SOFT }],
      say:
        "Qc7 — and now our queenside machine is online. The queen on c7 pressures the c-file, defends b7 indirectly, and connects our rooks. The Caro-Kann is famous for the queen sitting on c7 in middlegames — it's one of his recurring patterns across his entire Caro repertoire, not just this variation.",
      sayShort: 'Qc7 — queen on the c-file machine.',
    }),
    b({
      id: 'white-queenside',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7 Nbd2 Ng6 Nb3 Bb6 Re1 Qc7 a4',
      arrows: [{ from: 'a4', to: 'a5', color: VIS }],
      highlights: [{ square: 'a4', color: KEY }, { square: 'a5', color: SOFT }],
      say:
        "a4 — White expands queenside, planning a5 to chase our Bb6. The position is double-edged: White attacks our piece placement, we defend with structure. Our reply is the typical block: a6, freezing White's pawn advance and claiming b5 for ourselves.",
      sayShort: 'a4 — White expands queenside.',
    }),
    b({
      id: 'block-and-stabilize',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7 Nbd2 Ng6 Nb3 Bb6 Re1 Qc7 a4 a6',
      highlights: [{ square: 'a6', color: KEY }, { square: 'b5', color: SOFT }],
      say:
        "a6 — block the pawn advance, claim b5 forever, and stabilize. The opening is OVER. This is the position his three deepest games at this exact spine reach — move 11, the moment the middlegame begins. From here the game opens into one of three patterns: queenside expansion with our own b5 push, central play with f6 hitting the e5-pawn, or kingside maneuvering with the Ng6 jumping to f4. His data shows him playing all three depending on what White does next.",
      sayShort: 'a6 — block, claim b5, middlegame begins.',
    }),
    // ============ MIDDLEGAME PATTERN BEAT ============
    b({
      id: 'middlegame-plan',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7 Nbd2 Ng6 Nb3 Bb6 Re1 Qc7 a4 a6',
      highlights: [{ square: 'b5', color: KEY }, { square: 'f6', color: KEY }, { square: 'f4', color: KEY }],
      say:
        "The middlegame plan crystallizes from his actual games at this position. Three ideas show up across his decisive Advance-c5 games. First — b5 expanding queenside: claiming the long diagonal for our Bb7, opening the c-file fully, and creating queenside space. Second — f6 hitting the e5-pawn: challenging the spearhead, opening the position for our pieces. Third — the knight jumping Nf4 to land on the prize square, threatening Nxd3 trading off White's good bishop or just sitting in a beautiful outpost. Whichever White's setup invites, we have a plan ready.",
      sayShort: 'Middlegame: b5, f6, or Nf4.',
    }),
    // ============ ENDGAME STRUCTURE BEAT ============
    b({
      id: 'endgame-structure',
      moves: 'e4 c6 d4 d5 e5 c5 dxc5 e6 Nf3 Bxc5 Bd3 Nc6 O-O Nge7 Nbd2 Ng6 Nb3 Bb6 Re1 Qc7 a4 a6',
      highlights: [{ square: 'd5', color: KEY }, { square: 'c6', color: KEY }, { square: 'b7', color: SOFT }],
      say:
        "And here's the punchline of the Advance Variation: the middlegame plan IS the endgame plan. The pieces will trade, the position will simplify, and what's LEFT on the board is what we built — the c6-d5-e6 pawn chain solid in the centre, the queenside majority we created by playing c5 earlier (we have b- and a-pawns; White's a- and b-files are open or compromised), and our bishop on the long diagonal. In his Advance-c5 games that reach the endgame, the recurring conversion is a queenside pawn race — a or b pushed to promotion, our rook escorting from behind. The opening teaches you the moves; the middlegame teaches you the plan; the endgame is just collecting what the first two phases set up.",
      sayShort: 'Endgame: queenside majority converts.',
    }),
  ],
};
