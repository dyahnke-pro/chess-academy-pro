# LLM-Claims Audit — birds-opening

Generated: 2026-04-29T03:06:14.619Z
Model: deepseek-chat (via claude --print)
Elapsed: 1076.4s
Estimated cost: $1.7988

## Method

1. chess.js replays each move and produces a ground-truth packet
   (piece, from, to, captured, check, mate, castled, …).
2. Haiku extracts every concrete chess claim from the narration
   into structured JSON. **The LLM does not judge accuracy.**
3. A deterministic verifier compares each claim to the ground
   truth. Contradictions are findings.

The board is the only source of truth. The LLM only does language
parsing — turning prose into structured tokens.

## Counts

| | Count |
|---|---:|
| Records audited | 78 |
| Claims extracted | 176 |
| Verified | 162 |
| **Contradicted** | **14** |
| Unverifiable (out of verifier scope) | 0 |
| Extraction errors | 0 |

## Findings

### subline "Bird's: Leningrad Formation", move 5 O-O

**Board says:** king → g1 (O-O)

**Narration:** "White castles kingside, securing the king's safety while connecting the rooks and completing the essential development phase. This move also brings the f1 rook into play, potentially supporting f4 or preparing central operations. With the king safely tucked away, White can now focus on central expansion and piece activity without worrying about king safety."

**Contradicted claim:** `{"type":"piece_from_square","piece":"rook","square":"f1","color":"white"}`

**Reason:** narration says rook left f1, board says king left e1

### subline "Bird's: From's Gambit", move 1 f4

**Board says:** pawn → f4 (f4)

**Narration:** "The Bird's: From's Gambit is an important variation of the Bird's Opening. From's Gambit is Black's most aggressive response. After fxe5 d6, Black sacrifices a pawn for rapid development and attacking chances. White must play precisely to hold the extra material. Let's walk through the key ideas."

**Contradicted claim:** `{"type":"capture","capturer_piece":"pawn","square":"e5"}`

**Reason:** narration claims a capture, no capture occurred

### subline "Bird's: From's Gambit", move 1 f4

**Board says:** pawn → f4 (f4)

**Narration:** "The Bird's: From's Gambit is an important variation of the Bird's Opening. From's Gambit is Black's most aggressive response. After fxe5 d6, Black sacrifices a pawn for rapid development and attacking chances. White must play precisely to hold the extra material. Let's walk through the key ideas."

**Contradicted claim:** `{"type":"piece_to_square","piece":"pawn","square":"e5"}`

**Reason:** narration says destination e5, board says f4

### subline "Bird's: From's Gambit", move 1 f4

**Board says:** pawn → f4 (f4)

**Narration:** "The Bird's: From's Gambit is an important variation of the Bird's Opening. From's Gambit is Black's most aggressive response. After fxe5 d6, Black sacrifices a pawn for rapid development and attacking chances. White must play precisely to hold the extra material. Let's walk through the key ideas."

**Contradicted claim:** `{"type":"piece_to_square","piece":"pawn","square":"d6","color":"black"}`

**Reason:** narration says destination d6, board says f4

### subline "Bird's: Stonewall Formation", move 1 f4

**Board says:** pawn → f4 (f4)

**Narration:** "The Bird's: Stonewall Formation is an important variation of the Bird's Opening. The Stonewall setup with d4, e3, f4 creates a wall of pawns. White gets a solid center and prepares a kingside attack. The weakness on e4 is compensated by attacking chances. Let's walk through the key ideas."

**Contradicted claim:** `{"type":"piece_on_square","piece":"pawn","square":"d4","color":"white"}`

**Reason:** narration claims pawn on d4, square is empty

### subline "Bird's: Stonewall Formation", move 1 f4

**Board says:** pawn → f4 (f4)

**Narration:** "The Bird's: Stonewall Formation is an important variation of the Bird's Opening. The Stonewall setup with d4, e3, f4 creates a wall of pawns. White gets a solid center and prepares a kingside attack. The weakness on e4 is compensated by attacking chances. Let's walk through the key ideas."

**Contradicted claim:** `{"type":"piece_on_square","piece":"pawn","square":"e3","color":"white"}`

**Reason:** narration claims pawn on e3, square is empty

### subline "Bird's: Swiss Gambit", move 1 f4

**Board says:** pawn → f4 (f4)

**Narration:** "The Bird's: Swiss Gambit is an important variation of the Bird's Opening. An aggressive gambit where White sacrifices a pawn for rapid development and open lines. The bishop on d3 and pawn on f3 create immediate threats against Black's king. Let's walk through the key ideas."

**Contradicted claim:** `{"type":"piece_on_square","piece":"bishop","square":"d3"}`

**Reason:** narration claims bishop on d3, square is empty

### subline "Bird's: Swiss Gambit", move 1 f4

**Board says:** pawn → f4 (f4)

**Narration:** "The Bird's: Swiss Gambit is an important variation of the Bird's Opening. An aggressive gambit where White sacrifices a pawn for rapid development and open lines. The bishop on d3 and pawn on f3 create immediate threats against Black's king. Let's walk through the key ideas."

**Contradicted claim:** `{"type":"piece_on_square","piece":"pawn","square":"f3"}`

**Reason:** narration claims pawn on f3, square is empty

### subline "Qg3 Kingside Pressure", move 1 f4

**Board says:** pawn → f4 (f4)

**Narration:** "In the Bird's Opening, the Qg3 Kingside Pressure is a tactical pattern you should know. The Qe1-g3 maneuver creates immediate pressure on g7 and the kingside. If Black plays ...Nh5 to chase the queen, Qf2 maintains the pressure while the knight has moved away from the center. Let's walk through how it works."

**Contradicted claim:** `{"type":"piece_to_square","piece":"queen","from":"e1","square":"g3"}`

**Reason:** narration says queen, board says pawn moved

### subline "Qg3 Kingside Pressure", move 1 f4

**Board says:** pawn → f4 (f4)

**Narration:** "In the Bird's Opening, the Qg3 Kingside Pressure is a tactical pattern you should know. The Qe1-g3 maneuver creates immediate pressure on g7 and the kingside. If Black plays ...Nh5 to chase the queen, Qf2 maintains the pressure while the knight has moved away from the center. Let's walk through how it works."

**Contradicted claim:** `{"type":"piece_to_square","piece":"knight","square":"h5","color":"black"}`

**Reason:** narration says knight, board says pawn moved

### subline "Qg3 Kingside Pressure", move 1 f4

**Board says:** pawn → f4 (f4)

**Narration:** "In the Bird's Opening, the Qg3 Kingside Pressure is a tactical pattern you should know. The Qe1-g3 maneuver creates immediate pressure on g7 and the kingside. If Black plays ...Nh5 to chase the queen, Qf2 maintains the pressure while the knight has moved away from the center. Let's walk through how it works."

**Contradicted claim:** `{"type":"piece_to_square","piece":"queen","square":"f2"}`

**Reason:** narration says queen, board says pawn moved

### subline "From's Gambit Refutation", move 1 f4

**Board says:** pawn → f4 (f4)

**Narration:** "In the Bird's Opening, the From's Gambit Refutation is a tactical pattern you should know. After taking the From's Gambit pawn, precise play with d4 and Bg5 neutralizes Black's initiative. White emerges with a healthy extra pawn if Black doesn't find the best moves. Let's walk through how it works."

**Contradicted claim:** `{"type":"capture","captured_piece":"pawn"}`

**Reason:** narration claims a capture, no capture occurred

### subline "From's Gambit Refutation", move 1 f4

**Board says:** pawn → f4 (f4)

**Narration:** "In the Bird's Opening, the From's Gambit Refutation is a tactical pattern you should know. After taking the From's Gambit pawn, precise play with d4 and Bg5 neutralizes Black's initiative. White emerges with a healthy extra pawn if Black doesn't find the best moves. Let's walk through how it works."

**Contradicted claim:** `{"type":"piece_to_square","piece":"pawn","square":"d4","color":"white"}`

**Reason:** narration says destination d4, board says f4

### subline "From's Gambit Refutation", move 1 f4

**Board says:** pawn → f4 (f4)

**Narration:** "In the Bird's Opening, the From's Gambit Refutation is a tactical pattern you should know. After taking the From's Gambit pawn, precise play with d4 and Bg5 neutralizes Black's initiative. White emerges with a healthy extra pawn if Black doesn't find the best moves. Let's walk through how it works."

**Contradicted claim:** `{"type":"piece_to_square","piece":"bishop","square":"g5","color":"white"}`

**Reason:** narration says bishop, board says pawn moved
