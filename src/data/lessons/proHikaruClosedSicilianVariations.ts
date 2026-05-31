import type { LessonScript } from '../../types';
// Pro Hikaru — pro-hikaru-closed-sicilian per-variation Watch lessons. Each walks his real
// data spine (data/sources/hikaru-deep/) to a middlegame. Board-accurate by
// construction (moves from his games), voice-clean (G9.4). Student = white.

export const PRO_HIKARU_CLOSED_SICILIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  "pro-hikaru-closed-sicilian::Grand Prix f4 + f5": {
    "openingId": "pro-hikaru-closed-sicilian",
    "title": "Hikaru — Grand Prix f4 + f5",
    "minutes": 7,
    "orientation": "white",
    "kind": "variation",
    "sources": [
      "book:chess-fundamentals",
      "https://en.wikipedia.org/wiki/Grand_Prix_Attack",
      "https://api.chess.com/pub/player/hikaru/games/archives"
    ],
    "beats": [
      {
        "id": "b0",
        "moves": [
          "e4",
          "c5",
          "Nc3",
          "Nc6",
          "f4"
        ],
        "say": "f4 — the pawn advances to f4, fighting for space in the centre.",
        "sayShort": "f4 — gain space."
      },
      {
        "id": "b1",
        "moves": [
          "e4",
          "c5",
          "Nc3",
          "Nc6",
          "f4",
          "g6",
          "Nf3",
          "Bg7",
          "Bc4"
        ],
        "say": "Bc4 — the bishop develops to c4, improving its activity.",
        "sayShort": "Bc4 — develop."
      },
      {
        "id": "b2",
        "moves": [
          "e4",
          "c5",
          "Nc3",
          "Nc6",
          "f4",
          "g6",
          "Nf3",
          "Bg7",
          "Bc4",
          "e6",
          "f5",
          "Nge7",
          "fxe6"
        ],
        "say": "fxe6 — Pawn takes on e6, opening lines and shifting the material balance.",
        "sayShort": "fxe6 — open lines."
      },
      {
        "id": "b3",
        "moves": [
          "e4",
          "c5",
          "Nc3",
          "Nc6",
          "f4",
          "g6",
          "Nf3",
          "Bg7",
          "Bc4",
          "e6",
          "f5",
          "Nge7",
          "fxe6",
          "dxe6",
          "O-O",
          "O-O",
          "d3",
          "a6",
          "a4",
          "Nd4",
          "Nxd4"
        ],
        "say": "Nxd4 — Knight takes on d4, opening lines and shifting the material balance.",
        "sayShort": "Nxd4 — open lines."
      }
    ]
  },
  "pro-hikaru-closed-sicilian::vs ...g6": {
    "openingId": "pro-hikaru-closed-sicilian",
    "title": "Hikaru — vs ...g6",
    "minutes": 7,
    "orientation": "white",
    "kind": "variation",
    "sources": [
      "book:chess-fundamentals",
      "https://en.wikipedia.org/wiki/Grand_Prix_Attack",
      "https://api.chess.com/pub/player/hikaru/games/archives"
    ],
    "beats": [
      {
        "id": "b0",
        "moves": [
          "e4",
          "c5",
          "Nc3",
          "Nc6",
          "f4"
        ],
        "say": "f4 — the pawn advances to f4, fighting for space in the centre.",
        "sayShort": "f4 — gain space."
      },
      {
        "id": "b1",
        "moves": [
          "e4",
          "c5",
          "Nc3",
          "Nc6",
          "f4",
          "g6",
          "Nf3",
          "Bg7",
          "Bc4"
        ],
        "say": "Bc4 — the bishop develops to c4, improving its activity.",
        "sayShort": "Bc4 — develop."
      },
      {
        "id": "b2",
        "moves": [
          "e4",
          "c5",
          "Nc3",
          "Nc6",
          "f4",
          "g6",
          "Nf3",
          "Bg7",
          "Bc4",
          "e6",
          "f5",
          "Nge7",
          "fxe6"
        ],
        "say": "fxe6 — Pawn takes on e6, opening lines and shifting the material balance.",
        "sayShort": "fxe6 — open lines."
      },
      {
        "id": "b3",
        "moves": [
          "e4",
          "c5",
          "Nc3",
          "Nc6",
          "f4",
          "g6",
          "Nf3",
          "Bg7",
          "Bc4",
          "e6",
          "f5",
          "Nge7",
          "fxe6",
          "dxe6",
          "O-O",
          "O-O",
          "d3",
          "a6",
          "a4",
          "Nd4",
          "Nxd4"
        ],
        "say": "Nxd4 — Knight takes on d4, opening lines and shifting the material balance.",
        "sayShort": "Nxd4 — open lines."
      }
    ]
  },
  "pro-hikaru-closed-sicilian::vs ...e6": {
    "openingId": "pro-hikaru-closed-sicilian",
    "title": "Hikaru — vs ...e6",
    "minutes": 7,
    "orientation": "white",
    "kind": "variation",
    "sources": [
      "book:chess-fundamentals",
      "https://en.wikipedia.org/wiki/Grand_Prix_Attack",
      "https://api.chess.com/pub/player/hikaru/games/archives"
    ],
    "beats": [
      {
        "id": "b0",
        "moves": [
          "e4",
          "c5",
          "Nc3",
          "Nc6",
          "f4"
        ],
        "say": "f4 — the pawn advances to f4, fighting for space in the centre.",
        "sayShort": "f4 — gain space."
      },
      {
        "id": "b1",
        "moves": [
          "e4",
          "c5",
          "Nc3",
          "Nc6",
          "f4",
          "e6",
          "Nf3",
          "d5",
          "Bb5"
        ],
        "say": "Bb5 — the bishop develops to b5, improving its activity.",
        "sayShort": "Bb5 — develop."
      },
      {
        "id": "b2",
        "moves": [
          "e4",
          "c5",
          "Nc3",
          "Nc6",
          "f4",
          "e6",
          "Nf3",
          "d5",
          "Bb5",
          "Ne7",
          "exd5",
          "exd5",
          "Qe2"
        ],
        "say": "Qe2 — the queen develops to e2, improving its activity.",
        "sayShort": "Qe2 — develop."
      },
      {
        "id": "b3",
        "moves": [
          "e4",
          "c5",
          "Nc3",
          "Nc6",
          "f4",
          "e6",
          "Nf3",
          "d5",
          "Bb5",
          "Ne7",
          "exd5",
          "exd5",
          "Qe2",
          "f6",
          "Bxc6+",
          "bxc6",
          "O-O",
          "Kf7",
          "b3",
          "Nf5",
          "Na4"
        ],
        "say": "Na4 — the knight develops to a4, improving its activity.",
        "sayShort": "Na4 — develop."
      }
    ]
  }
};
