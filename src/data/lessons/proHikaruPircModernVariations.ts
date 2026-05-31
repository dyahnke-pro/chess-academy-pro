import type { LessonScript } from '../../types';
// Pro Hikaru — pro-hikaru-pirc-modern per-variation Watch lessons. Each walks his real
// data spine (data/sources/hikaru-deep/) to a middlegame. Board-accurate by
// construction (moves from his games), voice-clean (G9.4). Student = black.

export const PRO_HIKARU_PIRC_MODERN_VARIATION_LESSONS: Record<string, LessonScript> = {
  "pro-hikaru-pirc-modern::vs Be3 + Qd2": {
    "openingId": "pro-hikaru-pirc-modern",
    "title": "Hikaru — vs Be3 + Qd2",
    "minutes": 7,
    "orientation": "black",
    "kind": "variation",
    "sources": [
      "book:chess-fundamentals",
      "https://en.wikipedia.org/wiki/Modern_Defense",
      "https://api.chess.com/pub/player/hikaru/games/archives"
    ],
    "beats": [
      {
        "id": "b0",
        "moves": [
          "e4",
          "g6",
          "d4",
          "Bg7",
          "Nc3"
        ],
        "say": "Nc3 — the knight develops to c3, improving its activity.",
        "sayShort": "Nc3 — develop."
      },
      {
        "id": "b1",
        "moves": [
          "e4",
          "g6",
          "d4",
          "Bg7",
          "Nc3",
          "a6",
          "Be3",
          "b5",
          "Qd2"
        ],
        "say": "Qd2 — the queen develops to d2, improving its activity.",
        "sayShort": "Qd2 — develop."
      },
      {
        "id": "b2",
        "moves": [
          "e4",
          "g6",
          "d4",
          "Bg7",
          "Nc3",
          "a6",
          "Be3",
          "b5",
          "Qd2",
          "Bb7",
          "f3",
          "d6",
          "h4"
        ],
        "say": "h4 — the pawn advances to h4, fighting for space in the centre.",
        "sayShort": "h4 — gain space."
      },
      {
        "id": "b3",
        "moves": [
          "e4",
          "g6",
          "d4",
          "Bg7",
          "Nc3",
          "a6",
          "Be3",
          "b5",
          "Qd2",
          "Bb7",
          "f3",
          "d6",
          "h4",
          "h5",
          "Nh3",
          "e6",
          "Ng5",
          "Nd7"
        ],
        "say": "…Nd7 — the knight develops to d7, improving its activity.",
        "sayShort": "…Nd7 — develop."
      }
    ]
  },
  "pro-hikaru-pirc-modern::vs Nf3 Classical": {
    "openingId": "pro-hikaru-pirc-modern",
    "title": "Hikaru — vs Nf3 Classical",
    "minutes": 7,
    "orientation": "black",
    "kind": "variation",
    "sources": [
      "book:chess-fundamentals",
      "https://en.wikipedia.org/wiki/Modern_Defense",
      "https://api.chess.com/pub/player/hikaru/games/archives"
    ],
    "beats": [
      {
        "id": "b0",
        "moves": [
          "e4",
          "g6",
          "d4",
          "Bg7",
          "Nf3"
        ],
        "say": "Nf3 — the knight develops to f3, improving its activity.",
        "sayShort": "Nf3 — develop."
      },
      {
        "id": "b1",
        "moves": [
          "e4",
          "g6",
          "d4",
          "Bg7",
          "Nf3",
          "c6",
          "Nc3",
          "d5",
          "h3"
        ],
        "say": "h3 — the pawn advances to h3, fighting for space in the centre.",
        "sayShort": "h3 — gain space."
      },
      {
        "id": "b2",
        "moves": [
          "e4",
          "g6",
          "d4",
          "Bg7",
          "Nf3",
          "c6",
          "Nc3",
          "d5",
          "h3",
          "dxe4",
          "Nxe4",
          "Nf6",
          "Nxf6+"
        ],
        "say": "Nxf6+ — Knight takes on f6, opening lines and shifting the material balance.",
        "sayShort": "Nxf6+ — open lines."
      },
      {
        "id": "b3",
        "moves": [
          "e4",
          "g6",
          "d4",
          "Bg7",
          "Nf3",
          "c6",
          "Nc3",
          "d5",
          "h3",
          "dxe4",
          "Nxe4",
          "Nf6",
          "Nxf6+",
          "exf6",
          "Bc4",
          "O-O",
          "O-O",
          "Nd7",
          "Re1",
          "b5",
          "Bb3",
          "Nb6",
          "a4",
          "a5"
        ],
        "say": "…a5 — the pawn advances to a5, fighting for space in the centre.",
        "sayShort": "…a5 — gain space."
      }
    ]
  },
  "pro-hikaru-pirc-modern::...c6 setup": {
    "openingId": "pro-hikaru-pirc-modern",
    "title": "Hikaru — ...c6 setup",
    "minutes": 7,
    "orientation": "black",
    "kind": "variation",
    "sources": [
      "book:chess-fundamentals",
      "https://en.wikipedia.org/wiki/Modern_Defense",
      "https://api.chess.com/pub/player/hikaru/games/archives"
    ],
    "beats": [
      {
        "id": "b0",
        "moves": [
          "e4",
          "g6",
          "d4",
          "Bg7",
          "Nc3"
        ],
        "say": "Nc3 — the knight develops to c3, improving its activity.",
        "sayShort": "Nc3 — develop."
      },
      {
        "id": "b1",
        "moves": [
          "e4",
          "g6",
          "d4",
          "Bg7",
          "Nc3",
          "c6",
          "Nf3",
          "d5",
          "h3"
        ],
        "say": "h3 — the pawn advances to h3, fighting for space in the centre.",
        "sayShort": "h3 — gain space."
      },
      {
        "id": "b2",
        "moves": [
          "e4",
          "g6",
          "d4",
          "Bg7",
          "Nc3",
          "c6",
          "Nf3",
          "d5",
          "h3",
          "dxe4",
          "Nxe4",
          "Nf6",
          "Nxf6+"
        ],
        "say": "Nxf6+ — Knight takes on f6, opening lines and shifting the material balance.",
        "sayShort": "Nxf6+ — open lines."
      },
      {
        "id": "b3",
        "moves": [
          "e4",
          "g6",
          "d4",
          "Bg7",
          "Nc3",
          "c6",
          "Nf3",
          "d5",
          "h3",
          "dxe4",
          "Nxe4",
          "Nf6",
          "Nxf6+",
          "exf6",
          "Bc4",
          "O-O",
          "O-O",
          "Nd7",
          "c3",
          "b5",
          "Bb3",
          "Nb6",
          "Re1",
          "a5"
        ],
        "say": "…a5 — the pawn advances to a5, fighting for space in the centre.",
        "sayShort": "…a5 — gain space."
      }
    ]
  },
  "pro-hikaru-pirc-modern::vs Austrian f4": {
    "openingId": "pro-hikaru-pirc-modern",
    "title": "Hikaru — vs Austrian f4",
    "minutes": 7,
    "orientation": "black",
    "kind": "variation",
    "sources": [
      "book:chess-fundamentals",
      "https://en.wikipedia.org/wiki/Modern_Defense",
      "https://api.chess.com/pub/player/hikaru/games/archives"
    ],
    "beats": [
      {
        "id": "b0",
        "moves": [
          "e4",
          "g6",
          "d4",
          "Bg7",
          "Nc3"
        ],
        "say": "Nc3 — the knight develops to c3, improving its activity.",
        "sayShort": "Nc3 — develop."
      },
      {
        "id": "b1",
        "moves": [
          "e4",
          "g6",
          "d4",
          "Bg7",
          "Nc3",
          "a6",
          "f4",
          "c6",
          "Nf3"
        ],
        "say": "Nf3 — the knight develops to f3, improving its activity.",
        "sayShort": "Nf3 — develop."
      },
      {
        "id": "b2",
        "moves": [
          "e4",
          "g6",
          "d4",
          "Bg7",
          "Nc3",
          "a6",
          "f4",
          "c6",
          "Nf3",
          "d5",
          "e5",
          "Bg4",
          "h3"
        ],
        "say": "h3 — the pawn advances to h3, fighting for space in the centre.",
        "sayShort": "h3 — gain space."
      },
      {
        "id": "b3",
        "moves": [
          "e4",
          "g6",
          "d4",
          "Bg7",
          "Nc3",
          "a6",
          "f4",
          "c6",
          "Nf3",
          "d5",
          "e5",
          "Bg4",
          "h3",
          "Bxf3",
          "Qxf3",
          "e6",
          "Be3",
          "h5",
          "g3",
          "Nd7",
          "O-O-O",
          "Rc8",
          "g4",
          "Ne7",
          "Bd3",
          "c5"
        ],
        "say": "…c5 — the pawn advances to c5, fighting for space in the centre.",
        "sayShort": "…c5 — gain space."
      }
    ]
  }
};
