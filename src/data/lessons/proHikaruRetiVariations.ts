import type { LessonScript } from '../../types';
// Pro Hikaru — pro-hikaru-reti per-variation Watch lessons. Each walks his real
// data spine (data/sources/hikaru-deep/) to a middlegame. Board-accurate by
// construction (moves from his games), voice-clean (G9.4). Student = white.

export const PRO_HIKARU_RETI_VARIATION_LESSONS: Record<string, LessonScript> = {
  "pro-hikaru-reti::Réti into the b3 system": {
    "openingId": "pro-hikaru-reti",
    "title": "Hikaru — Réti into the b3 system",
    "minutes": 7,
    "orientation": "white",
    "kind": "variation",
    "sources": [
      "book:chess-fundamentals",
      "https://en.wikipedia.org/wiki/R%C3%A9ti_Opening",
      "https://api.chess.com/pub/player/hikaru/games/archives"
    ],
    "beats": [
      {
        "id": "b0",
        "moves": [
          "Nf3",
          "Nf6",
          "b3",
          "g6",
          "Bb2"
        ],
        "say": "Bb2 — the bishop develops to b2, improving its activity.",
        "sayShort": "Bb2 — develop."
      },
      {
        "id": "b1",
        "moves": [
          "Nf3",
          "Nf6",
          "b3",
          "g6",
          "Bb2",
          "Bg7",
          "d4",
          "O-O",
          "e3"
        ],
        "say": "e3 — the pawn advances to e3, fighting for space in the centre.",
        "sayShort": "e3 — gain space."
      },
      {
        "id": "b2",
        "moves": [
          "Nf3",
          "Nf6",
          "b3",
          "g6",
          "Bb2",
          "Bg7",
          "d4",
          "O-O",
          "e3",
          "d6",
          "Be2",
          "Nbd7",
          "O-O"
        ],
        "say": "O-O — castling to safety — the king tucks away and the rook joins the game.",
        "sayShort": "O-O — king safe."
      },
      {
        "id": "b3",
        "moves": [
          "Nf3",
          "Nf6",
          "b3",
          "g6",
          "Bb2",
          "Bg7",
          "d4",
          "O-O",
          "e3",
          "d6",
          "Be2",
          "Nbd7",
          "O-O",
          "e5",
          "dxe5",
          "Ng4",
          "c4",
          "Ngxe5",
          "Nc3",
          "Re8",
          "Qd2"
        ],
        "say": "Qd2 — the queen develops to d2, improving its activity.",
        "sayShort": "Qd2 — develop."
      }
    ]
  },
  "pro-hikaru-reti::vs ...d5": {
    "openingId": "pro-hikaru-reti",
    "title": "Hikaru — vs ...d5",
    "minutes": 7,
    "orientation": "white",
    "kind": "variation",
    "sources": [
      "book:chess-fundamentals",
      "https://en.wikipedia.org/wiki/R%C3%A9ti_Opening",
      "https://api.chess.com/pub/player/hikaru/games/archives"
    ],
    "beats": [
      {
        "id": "b0",
        "moves": [
          "Nf3",
          "d5",
          "b3",
          "Nf6",
          "Bb2"
        ],
        "say": "Bb2 — the bishop develops to b2, improving its activity.",
        "sayShort": "Bb2 — develop."
      },
      {
        "id": "b1",
        "moves": [
          "Nf3",
          "d5",
          "b3",
          "Nf6",
          "Bb2",
          "e6",
          "e3",
          "Be7",
          "d4"
        ],
        "say": "d4 — the pawn advances to d4, fighting for space in the centre.",
        "sayShort": "d4 — gain space."
      },
      {
        "id": "b2",
        "moves": [
          "Nf3",
          "d5",
          "b3",
          "Nf6",
          "Bb2",
          "e6",
          "e3",
          "Be7",
          "d4",
          "O-O",
          "Bd3",
          "b6",
          "O-O"
        ],
        "say": "O-O — castling to safety — the king tucks away and the rook joins the game.",
        "sayShort": "O-O — king safe."
      },
      {
        "id": "b3",
        "moves": [
          "Nf3",
          "d5",
          "b3",
          "Nf6",
          "Bb2",
          "e6",
          "e3",
          "Be7",
          "d4",
          "O-O",
          "Bd3",
          "b6",
          "O-O",
          "Bb7",
          "Nbd2"
        ],
        "say": "Nbd2 — the knight develops to d2, improving its activity.",
        "sayShort": "Nbd2 — develop."
      }
    ]
  },
  "pro-hikaru-reti::vs ...c5": {
    "openingId": "pro-hikaru-reti",
    "title": "Hikaru — vs ...c5",
    "minutes": 7,
    "orientation": "white",
    "kind": "variation",
    "sources": [
      "book:chess-fundamentals",
      "https://en.wikipedia.org/wiki/R%C3%A9ti_Opening",
      "https://api.chess.com/pub/player/hikaru/games/archives"
    ],
    "beats": [
      {
        "id": "b0",
        "moves": [
          "Nf3",
          "c5",
          "b3",
          "Nc6",
          "Bb2"
        ],
        "say": "Bb2 — the bishop develops to b2, improving its activity.",
        "sayShort": "Bb2 — develop."
      },
      {
        "id": "b1",
        "moves": [
          "Nf3",
          "c5",
          "b3",
          "Nc6",
          "Bb2",
          "d5",
          "e3",
          "a6",
          "d4"
        ],
        "say": "d4 — the pawn advances to d4, fighting for space in the centre.",
        "sayShort": "d4 — gain space."
      },
      {
        "id": "b2",
        "moves": [
          "Nf3",
          "c5",
          "b3",
          "Nc6",
          "Bb2",
          "d5",
          "e3",
          "a6",
          "d4",
          "cxd4",
          "Nxd4",
          "Nf6",
          "Nxc6"
        ],
        "say": "Nxc6 — Knight takes on c6, opening lines and shifting the material balance.",
        "sayShort": "Nxc6 — open lines."
      },
      {
        "id": "b3",
        "moves": [
          "Nf3",
          "c5",
          "b3",
          "Nc6",
          "Bb2",
          "d5",
          "e3",
          "a6",
          "d4",
          "cxd4",
          "Nxd4",
          "Nf6",
          "Nxc6",
          "bxc6",
          "Nd2"
        ],
        "say": "Nd2 — the knight develops to d2, improving its activity.",
        "sayShort": "Nd2 — develop."
      }
    ]
  }
};
