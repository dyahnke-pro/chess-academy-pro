# quarantine — tracked, but the board is not what the video played

A build lands here when the tracker followed a legal sequence that is not the
game on screen. **Nothing in this directory may be written from.** It is kept
rather than deleted because the track is the evidence for what went wrong, and
because re-tracking needs to know what the bad read looked like.

The failure is specific and worth recognising: every move is legal, the line is
internally consistent, and it resolves to a real named opening — so chess.js
passes it and the opening index names it confidently. chess.js catches an
*impossible* read, never a systematically wrong one. The tell is always a
comparison against something outside the track: the transcript, or the pawn
count at a known stage.

| build | claimed | actually played | how it was caught |
|---|---|---|---|
| `srNXYAsaX7I` | QGD Semi-Tarrasch, Main Line (113 plies) | an Alapin Sicilian from Black's side | transcript says "we are facing an Alapin"; at the same stage the Alapin has 12 pawns and the track records 14, carrying a Black c5 and a White e3 the game never had |

To rescue one: re-download, read the board geometry off a frame **per section**
(a lesson's board size changes between play, review and example games), re-scan,
and compare the result against the transcript before returning it to the bank.
