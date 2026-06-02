import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Ponziani Opening, WHITE side. The principled
// main line (3.c3, 4.d4, the e5/Qb3 build) into a middlegame where White has the
// big centre and Black's queenside pawns get doubled. Opening reaches a
// middlegame by move 8 (G9.3 Gate B). Student = WHITE. Board-accurate.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_PONZIANI_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-ponziani',
  title: "This repertoire's Ponziani — the c3-d4 Centre and Qb3 Bind",
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: [
    'book:chess-fundamentals',
    'https://www.chess.com/openings/Ponziani-Opening',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/Ponziani_Opening',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'e4 e5 Nf3 Nc6 c3',
      highlights: [{ square: 'c3', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "The Ponziani — e4 e5 Nf3 Nc6 c3. A 200-year-old surprise weapon. The little c3-move has one job: to support d4 next, so we can build the big centre most opponents never prepare against. This repertoire beats grandmasters with this precisely because nobody studies it.",
      sayShort: 'c3 — preparing d4.',
    }),
    b({
      id: 'd4',
      moves: 'e4 e5 Nf3 Nc6 c3 Nf6 d4 exd4 e5',
      arrows: [{ from: 'e5', to: 'f6', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'f6', color: SOFT }],
      say:
        "Black develops Nf6; we strike with d4. After …exd4 we don't recapture yet — we push e5 first, kicking the f6-knight with tempo. Win the tempo before you win the pawn back: that's the Ponziani's bite.",
      sayShort: 'e5 — kick the knight first.',
    }),
    b({
      id: 'nd5-qb3',
      moves: 'e4 e5 Nf3 Nc6 c3 Nf6 d4 exd4 e5 Nd5 Qb3',
      arrows: [{ from: 'b3', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'b7', color: SOFT }],
      say:
        "The knight jumps to d5; we hit it with Qb3 — the queen attacks the d5-knight along the diagonal and leans on b7 at the same time. Double pressure, and Black has to spend time defending instead of developing.",
      sayShort: 'Qb3 — hit d5 and b7.',
    }),
    b({
      id: 'cxd4',
      moves: 'e4 e5 Nf3 Nc6 c3 Nf6 d4 exd4 e5 Nd5 Qb3 Nb6 cxd4',
      highlights: [{ square: 'd4', color: KEY }, { square: 'e5', color: KEY }],
      say:
        "Black retreats the knight to b6; now we recapture, cxd4, and there it is — the big e5-and-d4 pawn duo, a commanding centre. The knight on b6 is offside, our queen is active on b3, and we have all the space.",
      sayShort: 'cxd4 — the big centre.',
    }),
    b({
      id: 'bb5',
      moves: 'e4 e5 Nf3 Nc6 c3 Nf6 d4 exd4 e5 Nd5 Qb3 Nb6 cxd4 d6 Bb5',
      arrows: [{ from: 'b5', to: 'c6', color: VIS }],
      highlights: [{ square: 'c6', color: KEY }],
      say:
        "Black hits our centre with d6; we develop with Bb5, pinning the c6-knight against the king. The knight is the only thing holding Black's position together — so we tie it down and prepare to trade it off.",
      sayShort: 'Bb5 — pin the c6-knight.',
    }),
    b({
      id: 'mg-trade',
      moves: 'e4 e5 Nf3 Nc6 c3 Nf6 d4 exd4 e5 Nd5 Qb3 Nb6 cxd4 d6 Bb5 Be6 Bxc6+ bxc6',
      highlights: [{ square: 'c6', color: KEY }, { square: 'c7', color: SOFT }],
      say:
        "Black develops Be6, kicking the queen; we take on c6 with check, and after …bxc6 Black's queenside pawns are doubled and weak. We've reached the middlegame with a clear, lasting edge: the big centre and a permanent target on the c6- and c7-pawns.",
      sayShort: 'Bxc6+ — double the pawns.',
    }),
    b({
      id: 'mg-summary',
      moves: 'e4 e5 Nf3 Nc6 c3 Nf6 d4 exd4 e5 Nd5 Qb3 Nb6 cxd4 d6 Bb5 Be6 Bxc6+ bxc6',
      arrows: [{ from: 'b3', to: 'c4', color: VIS }],
      highlights: [{ square: 'c6', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "Here's the plan from this middlegame. We have the e5/d4 centre cramping Black and the doubled c-pawns to chew on. Castle, bring the rooks to the c- and d-files, reroute the queen toward the weak pawns, and keep the bind. Black has no counterplay and a long, grim defence. The Ponziani is offbeat — but the resulting middlegame is pure, clean pressure.",
      sayShort: 'press the doubled pawns and the centre.',
    }),
  ],
};
