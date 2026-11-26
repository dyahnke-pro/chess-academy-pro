# Known methods: opposition, key squares, building the bridge

## Principle
Endgames are won and held by known methods: take the opposition, keep the king on the key squares, cut the king off with the rook, build the bridge (Lucena), check from behind (Philidor). Breaking the method throws the result.

## When it applies / exceptions
Endgame only.

## Deterministic check
- technique-broken: a tablebase/engine flip (won→drawn, drawn→lost) on a move in a known class: K+P (opposition lost: kings on one file one apart, the student moved out), R+P (rook in front of its own passer, king left the queening square), Lucena/Philidor geometry tests.

## Phrasings
1. Take the opposition, and their king has to give way.
2. Your king left the key square, and the win went with it.
3. Put the rook behind the pawn, not in front of it.
4. In the rook ending, cut their king off first.
5. With the extra pawn, build the bridge to shield your king.

## Sources
- concept:end-opposition (Capablanca)
- concept:end-lucena (Bird)
- https://en.wikipedia.org/wiki/Philidor_position
- https://en.wikipedia.org/wiki/Opposition_(chess)
- https://en.wikipedia.org/wiki/Tarrasch_rule

## Used by
technique-broken, pictureVerdict phase endgame, T KNOW(king ending)
