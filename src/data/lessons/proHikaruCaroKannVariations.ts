import type { LessonScript } from '../../types';
// Pro Hikaru — pro-hikaru-caro-kann per-variation Watch lessons. Each walks his real
// data spine (data/sources/hikaru-deep/) to a middlegame. Board-accurate by
// construction (moves from his games), voice-clean (G9.4). Student = black.

export const PRO_HIKARU_CARO_KANN_VARIATION_LESSONS: Record<string, LessonScript> = {
  "pro-hikaru-caro-kann::vs Advance 3.e5 Bf5": {
    "openingId": "pro-hikaru-caro-kann",
    "title": "Hikaru — vs Advance 3.e5 Bf5",
    "minutes": 7,
    "orientation": "black",
    "kind": "variation",
    "sources": [
      "book:chess-fundamentals",
      "https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence",
      "https://api.chess.com/pub/player/hikaru/games/archives"
    ],
    "beats": [
      {
        "id": "b0",
        "moves": [
          "e4",
          "c6",
          "d4",
          "d5",
          "e5"
        ],
        "say": "e5 — the pawn advances to e5, fighting for space in the centre.",
        "sayShort": "e5 — gain space."
      },
      {
        "id": "b1",
        "moves": [
          "e4",
          "c6",
          "d4",
          "d5",
          "e5",
          "Bf5",
          "Nf3",
          "e6",
          "Be2"
        ],
        "say": "Be2 — the bishop develops to e2, improving its activity.",
        "sayShort": "Be2 — develop."
      },
      {
        "id": "b2",
        "moves": [
          "e4",
          "c6",
          "d4",
          "d5",
          "e5",
          "Bf5",
          "Nf3",
          "e6",
          "Be2",
          "h6",
          "O-O",
          "Nd7",
          "Nbd2"
        ],
        "say": "Nbd2 — the knight develops to d2, improving its activity.",
        "sayShort": "Nbd2 — develop."
      },
      {
        "id": "b3",
        "moves": [
          "e4",
          "c6",
          "d4",
          "d5",
          "e5",
          "Bf5",
          "Nf3",
          "e6",
          "Be2",
          "h6",
          "O-O",
          "Nd7",
          "Nbd2",
          "Ne7",
          "Nb3",
          "Qc7"
        ],
        "say": "…Qc7 — the queen develops to c7, improving its activity.",
        "sayShort": "…Qc7 — develop."
      }
    ]
  },
  "pro-hikaru-caro-kann::vs Exchange": {
    "openingId": "pro-hikaru-caro-kann",
    "title": "Hikaru — vs Exchange",
    "minutes": 7,
    "orientation": "black",
    "kind": "variation",
    "sources": [
      "book:chess-fundamentals",
      "https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence",
      "https://api.chess.com/pub/player/hikaru/games/archives"
    ],
    "beats": [
      {
        "id": "b0",
        "moves": [
          "e4",
          "c6",
          "d4",
          "d5",
          "exd5"
        ],
        "say": "exd5 — Pawn takes on d5, opening lines and shifting the material balance.",
        "sayShort": "exd5 — open lines."
      },
      {
        "id": "b1",
        "moves": [
          "e4",
          "c6",
          "d4",
          "d5",
          "exd5",
          "cxd5",
          "Bd3",
          "Nc6",
          "c3"
        ],
        "say": "c3 — the pawn advances to c3, fighting for space in the centre.",
        "sayShort": "c3 — gain space."
      },
      {
        "id": "b2",
        "moves": [
          "e4",
          "c6",
          "d4",
          "d5",
          "exd5",
          "cxd5",
          "Bd3",
          "Nc6",
          "c3",
          "g6",
          "Nf3",
          "Bf5",
          "O-O"
        ],
        "say": "O-O — castling to safety — the king tucks away and the rook joins the game.",
        "sayShort": "O-O — king safe."
      }
    ]
  },
  "pro-hikaru-caro-kann::vs Two Knights": {
    "openingId": "pro-hikaru-caro-kann",
    "title": "Hikaru — vs Two Knights",
    "minutes": 7,
    "orientation": "black",
    "kind": "variation",
    "sources": [
      "book:chess-fundamentals",
      "https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence",
      "https://api.chess.com/pub/player/hikaru/games/archives"
    ],
    "beats": [
      {
        "id": "b0",
        "moves": [
          "e4",
          "c6",
          "Nc3",
          "d5",
          "Nf3"
        ],
        "say": "Nf3 — the knight develops to f3, improving its activity.",
        "sayShort": "Nf3 — develop."
      },
      {
        "id": "b1",
        "moves": [
          "e4",
          "c6",
          "Nc3",
          "d5",
          "Nf3",
          "Bg4",
          "h3",
          "Bxf3",
          "Qxf3"
        ],
        "say": "Qxf3 — Queen takes on f3, opening lines and shifting the material balance.",
        "sayShort": "Qxf3 — open lines."
      },
      {
        "id": "b2",
        "moves": [
          "e4",
          "c6",
          "Nc3",
          "d5",
          "Nf3",
          "Bg4",
          "h3",
          "Bxf3",
          "Qxf3",
          "e6",
          "d3",
          "g6",
          "Bd2"
        ],
        "say": "Bd2 — the bishop develops to d2, improving its activity.",
        "sayShort": "Bd2 — develop."
      },
      {
        "id": "b3",
        "moves": [
          "e4",
          "c6",
          "Nc3",
          "d5",
          "Nf3",
          "Bg4",
          "h3",
          "Bxf3",
          "Qxf3",
          "e6",
          "d3",
          "g6",
          "Bd2",
          "Bg7",
          "O-O-O",
          "Nd7",
          "g4"
        ],
        "say": "g4 — the pawn advances to g4, fighting for space in the centre.",
        "sayShort": "g4 — gain space."
      }
    ]
  }
};
