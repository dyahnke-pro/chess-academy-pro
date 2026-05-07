/**
 * Vienna Game (ECO C25–C29) — opening walkthrough tree.
 *
 * Voice/style: this is the coach speaking. Plain language, real
 * teaching content, no length cap, no template. Each `idea` should
 * read like how a strong coach actually explains the move to a
 * 1200-1600 player who said "teach me the Vienna." Names squares,
 * names ideas, calls out what to watch for.
 *
 * Tree shape:
 *   start → 1.e4 → 1...e5 → 2.Nc3 → FORK on Black's response
 *     ├── 2...Nf6 → FORK on White's third
 *     │   ├── 3.f4 (Vienna Gambit, sharp) → 3...d5 / 3...exf4 paths
 *     │   └── 3.Bc4 (Italian-style, quieter) → center fork trick
 *     ├── 2...Nc6 (most common amateur)
 *     └── 2...Bc5 (Italian-style as Black)
 *
 * FENs are computed at runtime by walking chess.js through the SANs
 * — see useTeachWalkthrough. So this file declares moves only.
 */
import type { WalkthroughTree } from '../../types/walkthroughTree';

export const VIENNA_GAME: WalkthroughTree = {
  openingName: 'Vienna Game',
  eco: 'C25',
  intro:
    "The Vienna Game. It's the King's Pawn opening's quieter, sharper cousin — quieter because we develop a knight before the bishop, sharper because we keep the f-pawn free for an attack. Most beginners learn the Italian or the Spanish; the Vienna is what you play when you want the same classical pressure but with a tactical engine humming under the hood. Let me walk you through it.",
  outro:
    "That's a typical position you'd see in this branch. Want to back up to the last decision and see the other line? Or take this position into a real game against me?",
  leafOutros: {
    // Vienna Gambit accepted, main line — the position is wild and
    // uncomfortable for both sides. The takeaway here is "you've got
    // an attack, find it" rather than "memorize one more move."
    'e4 e5 Nc3 Nf6 f4 exf4 Nf3 g5':
      "Pawn on f4 is hanging, and Black just locked it down with g5. This is where the Vienna Gambit gets uncomfortable for both sides — White has the open f-file and a lead in development; Black has the pawn but a brittle kingside. Strong players go h4 here to crack the g5 pawn, but you don't need to memorize that today. The point is: in this opening, you're playing for piece activity, not perfect structure. Want me to set this up as a real game so you can feel it?",
    // Center fork trick line — equal material but Black has the
    // bishop pair. Worth naming explicitly.
    'e4 e5 Nc3 Nf6 Bc4 Nxe4 Nxe4 d5 Bxd5 Qxd5':
      "Material is even — you traded the bishop for the pawn, then Black recovered the knight with the d-pawn fork. But Black walked out of it with the bishop pair, which is a small long-term advantage. This is exactly why most Vienna players prefer 4.d3 instead of 4.Nf3 in the 2...Nc6 line — to avoid this trick. Now you know the trap. Back up and try 3.Bc4 against 2...Nc6 instead, or play this position out against me?",
    // Italian-Vienna middlegame — both kings castled, doubled
    // e-pawns the cost of opening the f-file, dark-square bishop
    // gone on both sides. This is a position you should know cold:
    // the textbook Vienna setup with a clear plan.
    'e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 Be3 Bxe3 fxe3 d6 Nf3 O-O O-O Bg4 h3':
      "And there it is — the Vienna middlegame in its purest form. Both kings castled, dark-square bishops traded off (which suits us — we have the open f-file as compensation for the doubled e-pawns), the c4-bishop still pointing at f7. From here Black has to decide whether to trade on f3 (giving us the queen on f3 hitting f7 and ready to swing) or retreat to h5 (and we play g4 to chase it further). Either way, our middlegame plan is set: double the rooks on the f-file, push d4 to break the center when ready, swing the queen to h5 or g3. This is the position to know cold. Want to play it out from here as a real game?",
  },
  root: {
    san: null,
    movedBy: null,
    idea: '',
    children: [
      {
        node: {
          san: 'e4',
          movedBy: 'white',
          idea:
            "1.e4 — King's pawn forward, claiming the center and opening lines for the bishop on f1 and the queen on d1. Standard fundamentals. The Vienna won't show its colors until move 2, so for now this just looks like every other 1.e4 game.",
          children: [
            {
              node: {
                san: 'e5',
                movedBy: 'black',
                idea:
                  "Black mirrors with 1...e5, contesting the center directly. This is the most principled response — Black says 'I'm not letting you set up shop in the center without a fight.' Other Black moves (the Sicilian, the French, the Caro-Kann) are for a different lesson.",
                children: [
                  {
                    node: {
                      san: 'Nc3',
                      movedBy: 'white',
                      idea:
                        "2.Nc3 — and here's where the Vienna actually starts. The natural move at this point is Nf3 (the Italian and the Spanish both go there), but we play Nc3 instead. Why? Three reasons. One: it develops a piece. Two: it defends e4 in case Black later threatens it. Three — and this is the big one — it leaves the f-pawn FREE. In the Italian, after Nf3, the f-pawn is locked behind the knight forever; you can never push f4 without first moving the knight. In the Vienna, f4 is on the table from move three onward. That's the whole opening: a kingside pawn storm waiting to happen.",
                      narration: [
                        {
                          text: "2.Nc3 — and here's where the Vienna actually starts. The natural move at this point is Nf3 — the Italian and the Spanish both go there.",
                          arrows: [{ from: 'g1', to: 'f3', color: 'red' }],
                        },
                        {
                          text: "But we play Nc3 instead. Why? Three reasons. One — it develops a piece.",
                          arrows: [{ from: 'b1', to: 'c3', color: 'green' }],
                        },
                        {
                          text: "Two — it defends e4 in case Black later threatens it.",
                          arrows: [{ from: 'c3', to: 'e4', color: 'blue' }],
                        },
                        {
                          text: "Three, and this is the big one — it leaves the f-pawn free. In the Italian, after Nf3, the f-pawn is locked behind the knight forever. You can never push f4 without first moving the knight back.",
                          highlights: [{ square: 'f2', color: 'yellow' }],
                        },
                        {
                          text: "In the Vienna, f4 is on the table from move three onward. That's the whole opening — a kingside pawn storm waiting to happen.",
                          arrows: [{ from: 'f2', to: 'f4', color: 'green' }],
                        },
                      ],
                      children: [
                        // ─── FORK 1: Black's response to 2.Nc3 ───
                        {
                          label: '2…Nf6',
                          forkSubtitle:
                            "Hits e4 — invites the gambit",
                          node: {
                            san: 'Nf6',
                            movedBy: 'black',
                            idea:
                              "2...Nf6 — Black develops a knight AND attacks our e4 pawn at the same time. This is the most theoretically critical response. Black is daring you to either defend e4 or play the gambit. Both choices are real, and they lead to very different games. Pick your appetite.",
                            children: [
                              // ─── FORK 2: White's third move ───
                              {
                                label: '3.f4 — Vienna Gambit',
                                forkSubtitle:
                                  "Sacrifice the f-pawn for a kingside attack",
                                node: {
                                  san: 'f4',
                                  movedBy: 'white',
                                  idea:
                                    "3.f4 — the Vienna Gambit. Right out of the gate, we're offering the f-pawn. The point: if Black takes with exf4, the e-file opens up, my queen can swing to e2 or h5, my dark-squared bishop comes alive, and I get a serious lead in development for the price of one pawn. If Black declines with d5 (the principled refutation attempt), the position gets sharp in a different way. Either way, you're playing for an attack from move three — there's no quiet middlegame in this line.",
                                  narration: [
                                    {
                                      text: "3.f4 — the Vienna Gambit. Right out of the gate, we're offering the f-pawn.",
                                      arrows: [{ from: 'f2', to: 'f4', color: 'green' }],
                                    },
                                    {
                                      text: "The point — if Black takes with exf4, the e-file opens up.",
                                      arrows: [
                                        { from: 'e5', to: 'f4', color: 'red' },
                                        { from: 'e1', to: 'e8', color: 'blue' },
                                      ],
                                    },
                                    {
                                      text: "My queen can swing to e2 or h5.",
                                      arrows: [
                                        { from: 'd1', to: 'e2', color: 'green' },
                                        { from: 'd1', to: 'h5', color: 'green' },
                                      ],
                                    },
                                    {
                                      text: "My dark-squared bishop comes alive on the long diagonal.",
                                      arrows: [{ from: 'c1', to: 'h6', color: 'green' }],
                                    },
                                    {
                                      text: "I get a serious lead in development for the price of one pawn. If Black declines with d5, the principled refutation, the position gets sharp in a different way. Either way, you're playing for an attack from move three — there's no quiet middlegame in this line.",
                                    },
                                  ],
                                  children: [
                                    // ─── FORK 3: Black accepts or declines ───
                                    {
                                      label: '3…d5 — counter-gambit',
                                      forkSubtitle:
                                        "Theoretical refutation: hit back in the center",
                                      node: {
                                        san: 'd5',
                                        movedBy: 'black',
                                        idea:
                                          "3...d5 — the classical refutation attempt. Black ignores my pawn offer and counters in the center. The reasoning: my e4 pawn is defended once (by the knight on c3), but it's now attacked twice (by the f6-knight and the d5-pawn). Something has to give. This is the Falkbeer-style response, and it's Black's most respected try.",
                                        children: [
                                          {
                                            node: {
                                              san: 'fxe5',
                                              movedBy: 'white',
                                              idea:
                                                "4.fxe5 — I take the e-pawn first. The reason I don't play 4.exd5 is simple: after 4.exd5 Nxd5, Black's knight lands on a strong central square hitting my c3-knight, and I'm playing for nothing. Taking with the f-pawn keeps the tension and forces Black to figure out what to do about the knight that's now attacked.",
                                              children: [
                                                {
                                                  node: {
                                                    san: 'Nxe4',
                                                    movedBy: 'black',
                                                    idea:
                                                      "4...Nxe4 — Black grabs my e4 pawn with the knight. This is the only move; anything else loses material. We're now in the main line of the Vienna Gambit Falkbeer Variation, and theory has been worked out for over a century.",
                                                    children: [
                                                      {
                                                        node: {
                                                          san: 'Nf3',
                                                          movedBy: 'white',
                                                          idea:
                                                            "5.Nf3 — calm development. I bring the second knight out and prepare to castle. The pawn on e5 is poisoned; if Black plays 5...Nxc3 6.bxc3, my dark-squared bishop has a clear diagonal to a3 and my pawn structure points right at Black's king. The position is roughly equal but it's MY kind of position — every piece of mine has a job, and Black has to find precise moves to hold.",
                                                          children: [
                                                            {
                                                              node: {
                                                                san: 'g5',
                                                                movedBy: 'black',
                                                                idea:
                                                                  "5...g5 — Black tries to lock down the f4 square and protect the pawn. This is one of Black's main attempts and it's the position where I want to stop the lesson. Now you've seen the Vienna Gambit's main artery: I sac, Black takes, I get fast development, the pawn on f4 is the touchstone of the whole game.",
                                                                children: [],
                                                              },
                                                            },
                                                          ],
                                                        },
                                                      },
                                                    ],
                                                  },
                                                },
                                              ],
                                            },
                                          },
                                        ],
                                      },
                                    },
                                    {
                                      label: '3…exf4 — gambit accepted',
                                      forkSubtitle:
                                        "Take the pawn, hold tight, ride the storm",
                                      node: {
                                        san: 'exf4',
                                        movedBy: 'black',
                                        idea:
                                          "3...exf4 — Black takes the bait. Now I'm down a pawn but my plan writes itself: push e5 right now to kick the f6-knight, develop fast with tempo, deal with the Qh4+ threat that's lurking on the open e1-h4 diagonal, and build pressure on the kingside. Black has to spend moves figuring out where to put the knight and how to give back the pawn safely.",
                                        narration: [
                                          {
                                            text: '3...exf4 — Black takes the bait.',
                                            arrows: [{ from: 'e5', to: 'f4', color: 'red' }],
                                          },
                                          {
                                            text: "I'm down a pawn but my plan writes itself.",
                                          },
                                          {
                                            text: "And there's something serious to see: with my f-pawn gone, the diagonal from e1 to h4 is wide open. Black is one move from Qh4+ check, and that would split my king from castling rights for the rest of the game.",
                                            arrows: [{ from: 'd8', to: 'h4', color: 'red' }],
                                            highlights: [
                                              { square: 'h4', color: 'red' },
                                              { square: 'e1', color: 'red' },
                                            ],
                                          },
                                          {
                                            text: 'So I need to do TWO things in the next couple of moves: push e5 to kick the f6-knight, and get a knight to f3 to neutralize the Qh4+ check. Order matters. Push first.',
                                            arrows: [
                                              { from: 'e4', to: 'e5', color: 'green' },
                                              { from: 'g1', to: 'f3', color: 'blue' },
                                            ],
                                          },
                                        ],
                                        children: [
                                          {
                                            node: {
                                              san: 'e5',
                                              movedBy: 'white',
                                              idea:
                                                "4.e5 — push first to kick the knight. Pawn from e4 to e5 attacks the f6-knight, forcing it to move. The knight has only awkward squares: Ng8 (back home, lost a tempo for nothing), Nh5 (sidelined), Nd5 (gets traded by Nxd5), or Ng4 (the active try, eyeing f2 and supporting a future Qh4+). At club level you'll see Ng4 most often. Note that Qh4+ is still threatened on the next move because the e1-h4 diagonal is still open — that's our problem to solve next.",
                                              narration: [
                                                {
                                                  text: '4.e5 — push first to kick the knight.',
                                                  arrows: [{ from: 'e4', to: 'e5', color: 'green' }],
                                                },
                                                {
                                                  text: 'Pawn from e4 to e5 attacks the f6-knight, forcing it to move.',
                                                  arrows: [{ from: 'e5', to: 'f6', color: 'red' }],
                                                  highlights: [{ square: 'f6', color: 'red' }],
                                                },
                                                {
                                                  text: "The knight has only awkward squares. Ng8 — back home, lost a tempo for nothing. Nh5 — sidelined. Nd5 — gets traded. Ng4 — the active try, eyeing f2 and supporting a future Qh4+. At club level you will see Ng4 most often.",
                                                  arrows: [{ from: 'f6', to: 'g4', color: 'yellow' }],
                                                },
                                                {
                                                  text: 'Important: Qh4+ is still threatened on the next move because the e1-h4 diagonal is still open. That is our problem to solve next.',
                                                  arrows: [{ from: 'd8', to: 'h4', color: 'red' }],
                                                },
                                              ],
                                              children: [
                                                {
                                                  node: {
                                                    san: 'Ng4',
                                                    movedBy: 'black',
                                                    idea:
                                                      "4...Ng4 — Black plays the active retreat. Knight from f6 to g4. This is the critical line: the knight eyes f2 (the weak square) and supports the looming Qh4+. Now I have to neutralize Qh4+ this very move, or else.",
                                                    narration: [
                                                      {
                                                        text: '4...Ng4 — Black plays the active retreat.',
                                                        arrows: [{ from: 'f6', to: 'g4', color: 'green' }],
                                                      },
                                                      {
                                                        text: 'Knight from f6 to g4. This is the critical line — the knight eyes f2,',
                                                        arrows: [{ from: 'g4', to: 'f2', color: 'red' }],
                                                        highlights: [{ square: 'f2', color: 'red' }],
                                                      },
                                                      {
                                                        text: 'and supports the looming Qh4+. I have to neutralize that check this move, or else.',
                                                        arrows: [{ from: 'd8', to: 'h4', color: 'red' }],
                                                      },
                                                    ],
                                                    children: [
                                                      {
                                                        node: {
                                                          san: 'Nf3',
                                                          movedBy: 'white',
                                                          idea:
                                                            "5.Nf3 — and now the knight comes out. Knight from g1 to f3 — develops a piece AND controls h4, which kills the Qh4+ threat dead. Notice the move order: I HAD to push e5 first to kick the f6-knight (otherwise Black plays Qh4+ instantly and the wheels come off). Now that the knight on f6 has been forced to g4, I can develop normally and the diagonal is shut. This is the foundational lesson of the Vienna Gambit move order: push first, develop second.",
                                                          narration: [
                                                            {
                                                              text: '5.Nf3 — and now the knight comes out.',
                                                              arrows: [{ from: 'g1', to: 'f3', color: 'green' }],
                                                            },
                                                            {
                                                              text: 'Knight from g1 to f3 — develops a piece and controls h4, which kills the Qh4+ threat dead.',
                                                              arrows: [{ from: 'f3', to: 'h4', color: 'blue' }],
                                                              highlights: [{ square: 'h4', color: 'blue' }],
                                                            },
                                                            {
                                                              text: 'Notice the move order. I HAD to push e5 first to kick the f6-knight, otherwise Black plays Qh4+ instantly and the wheels come off. Now that the knight has been forced to g4, I develop and the diagonal is shut.',
                                                            },
                                                            {
                                                              text: 'This is the foundational lesson of the Vienna Gambit move order. Push first, develop second.',
                                                            },
                                                          ],
                                                          children: [],
                                                        },
                                                      },
                                                    ],
                                                  },
                                                },
                                              ],
                                            },
                                          },
                                        ],
                                      },
                                    },
                                  ],
                                },
                              },
                              {
                                label: '3.Bc4 — quiet Italian-style',
                                forkSubtitle:
                                  "Develop calmly — but watch for the center fork trick",
                                node: {
                                  san: 'Bc4',
                                  movedBy: 'white',
                                  idea:
                                    "3.Bc4 — Italian-style development. The bishop eyes f7, the weakest square in Black's camp. This is the safer, calmer Vienna — but there's a famous trap here, and you need to know it. Watch what Black plays next.",
                                  narration: [
                                    {
                                      text: "3.Bc4 — Italian-style development.",
                                      arrows: [{ from: 'f1', to: 'c4', color: 'green' }],
                                    },
                                    {
                                      text: "The bishop eyes f7, the weakest square in Black's camp.",
                                      arrows: [{ from: 'c4', to: 'f7', color: 'blue' }],
                                      highlights: [{ square: 'f7', color: 'red' }],
                                    },
                                    {
                                      text: "This is the safer, calmer Vienna — but there's a famous trap here, and you need to know it. Watch what Black plays next.",
                                    },
                                  ],
                                  children: [
                                    {
                                      node: {
                                        san: 'Nxe4',
                                        movedBy: 'black',
                                        idea:
                                          "3...Nxe4 — and there it is. The center fork trick. Black sacrifices the knight for the e-pawn, and the moment I recapture, Black plays d5 forking my bishop and my recaptured knight. It looks devastating. It's actually equal — but it forces a precise sequence from me, and if I don't know it, I lose material. This is exactly why most Vienna players prefer 3.d3 in this position; it kills the trick before it starts.",
                                        children: [
                                          {
                                            node: {
                                              san: 'Nxe4',
                                              movedBy: 'white',
                                              idea:
                                                "4.Nxe4 — I have to recapture. Letting Black just have the pawn is worse. Now Black plays the punchline.",
                                              children: [
                                                {
                                                  node: {
                                                    san: 'd5',
                                                    movedBy: 'black',
                                                    idea:
                                                      "4...d5 — the fork. The pawn attacks my bishop on c4 AND my knight on e4. Both are hit, only one can move. If I move the bishop, Black takes the knight; if I move the knight, Black takes the bishop. So what do I do?",
                                                    children: [
                                                      {
                                                        node: {
                                                          san: 'Bxd5',
                                                          movedBy: 'white',
                                                          idea:
                                                            "5.Bxd5 — I trade. The bishop takes the pawn; Black recovers the piece by taking the bishop with the queen. After 5...Qxd5, I'm even on material — I lost a pawn early, then traded bishop for pawn, then bishop for bishop's worth via the knight trade. Net: equal. But Black walked out of it with the bishop pair, which is a small long-term advantage.",
                                                          children: [
                                                            {
                                                              node: {
                                                                san: 'Qxd5',
                                                                movedBy: 'black',
                                                                idea:
                                                                  "5...Qxd5 — Black recaptures. The queen comes out early, which is normally a mistake, but here it can't be hit easily. The position is balanced. Now you've seen the trick — and you also see why most Vienna players steer to 4.d3 instead of 4.Nf3 against the 2...Nc6 line. We'll get there.",
                                                                children: [],
                                                              },
                                                            },
                                                          ],
                                                        },
                                                      },
                                                    ],
                                                  },
                                                },
                                              ],
                                            },
                                          },
                                        ],
                                      },
                                    },
                                  ],
                                },
                              },
                            ],
                          },
                        },
                        {
                          label: '2…Nc6',
                          forkSubtitle:
                            "Most common amateur response — leads to quieter Italian-like positions",
                          node: {
                            san: 'Nc6',
                            movedBy: 'black',
                            idea:
                              "2...Nc6 — the most common move you'll face at amateur level. Black develops naturally and defends e5. The position is calmer than after 2...Nf6 — there's no immediate threat, no gambit on offer. We'll set up Italian-style and choose between a slow positional game or push f4 later.",
                            children: [
                              {
                                node: {
                                  san: 'Bc4',
                                  movedBy: 'white',
                                  idea:
                                    "3.Bc4 — Italian setup. The bishop slides to its best diagonal, eyeing f7. We're playing a Vienna-Italian hybrid — same bishop placement as the Italian, but with the knight on c3 (not f3) so f4 is still on the table. We're keeping our options open.",
                                  children: [
                                    {
                                      node: {
                                        san: 'Nf6',
                                        movedBy: 'black',
                                        idea:
                                          "3...Nf6 — Black develops the second knight and threatens our e4 pawn. Now we hit the critical Vienna decision against the 2...Nc6 line: do we play 4.d3 (kill the center fork trick before it starts) or 4.Nf3 (allow the trick and accept equality)? Strong players play d3.",
                                        children: [
                                          {
                                            node: {
                                              san: 'd3',
                                              movedBy: 'white',
                                              idea:
                                                "4.d3 — the move. Defends e4 with a pawn, kills the center fork trick (no Nxe4 because the pawn has it covered), and prepares to push f4 in a few moves once we've castled. The position is quiet but White is comfortable. From here it's classical Italian-style chess — get the king safe, play f4 when the timing's right, point everything at the kingside.",
                                              narration: [
                                                {
                                                  text: '4.d3 — the move. Defends e4 with a pawn,',
                                                  arrows: [{ from: 'd2', to: 'd3', color: 'green' }],
                                                  highlights: [{ square: 'e4', color: 'blue' }],
                                                },
                                                {
                                                  text: 'kills the center fork trick — Black can no longer take e4 with the knight because this pawn has it covered.',
                                                  highlights: [
                                                    { square: 'e4', color: 'blue' },
                                                    { square: 'd3', color: 'green' },
                                                  ],
                                                },
                                                {
                                                  text: 'And it prepares to push f4 once we have castled.',
                                                  arrows: [{ from: 'f2', to: 'f4', color: 'yellow' }],
                                                },
                                                {
                                                  text: "The position is quiet, White is comfortable. From here it's classical Italian-style chess — get the king safe, play f4 when the timing's right, point everything at the kingside.",
                                                  arrows: [
                                                    { from: 'e1', to: 'g1', color: 'blue' },
                                                    { from: 'f2', to: 'f4', color: 'green' },
                                                  ],
                                                },
                                              ],
                                              children: [
                                                {
                                                  node: {
                                                    san: 'Bc5',
                                                    movedBy: 'black',
                                                    idea:
                                                      "4...Bc5 — Black mirrors our Italian setup. Bishop to c5 hits f2 (the same target our bishop on c4 has on f7) and Black is set up to castle short. Very textbook. But this bishop is also doing something dangerous — it's on the long a7-g1 diagonal, and right now g1 is occupied by our knight and f2 is empty after the d3 push hasn't happened... wait, f2 IS still occupied by our pawn. Good. As long as we don't push f4 with this bishop alive on c5, we're fine. Pushing f4 here would lose to Bxg1 — Black just takes our knight. The fix: trade the bishop FIRST.",
                                                    narration: [
                                                      {
                                                        text: '4...Bc5 — Black mirrors our Italian setup.',
                                                        arrows: [{ from: 'f8', to: 'c5', color: 'green' }],
                                                      },
                                                      {
                                                        text: 'Bishop to c5 hits f2 — the same target our bishop on c4 has on f7.',
                                                        arrows: [
                                                          { from: 'c5', to: 'f2', color: 'red' },
                                                          { from: 'c4', to: 'f7', color: 'red' },
                                                        ],
                                                        highlights: [
                                                          { square: 'f2', color: 'red' },
                                                          { square: 'f7', color: 'red' },
                                                        ],
                                                      },
                                                      {
                                                        text: "But here's the trap. The bishop is on the long a7-g1 diagonal. If we ever push f4 — clearing f2 — that diagonal opens up to our knight on g1, and Black plays Bxg1 winning the piece.",
                                                        arrows: [
                                                          { from: 'c5', to: 'g1', color: 'red' },
                                                        ],
                                                        highlights: [
                                                          { square: 'g1', color: 'red' },
                                                        ],
                                                      },
                                                      {
                                                        text: 'So we trade this bishop FIRST. Be3 challenges it head-on — if Black trades, we recapture with the f-pawn, opening the f-file as a bonus.',
                                                        arrows: [{ from: 'c1', to: 'e3', color: 'blue' }],
                                                      },
                                                    ],
                                                    children: [
                                                      {
                                                        node: {
                                                          san: 'Be3',
                                                          movedBy: 'white',
                                                          idea:
                                                            "5.Be3 — challenge the bishop. Bishop from c1 to e3, offering the trade and getting the dangerous c5-bishop off the long diagonal. Black's choice: trade with Bxe3 (most common — keeps it simple) or retreat with Bb6 (keeping the bishop, but losing tempo). Either way our plan is the same — recapture with the f-pawn if there's a trade, or push f4 safely later if the bishop moves.",
                                                          narration: [
                                                            {
                                                              text: '5.Be3 — challenge the bishop.',
                                                              arrows: [{ from: 'c1', to: 'e3', color: 'green' }],
                                                            },
                                                            {
                                                              text: "Bishop from c1 to e3, offering the trade and getting Black's c5-bishop off the long diagonal where it threatens our knight.",
                                                              arrows: [{ from: 'e3', to: 'c5', color: 'red' }],
                                                            },
                                                            {
                                                              text: "Black's choice — trade with Bxe3, the most common reply, or retreat with Bb6 keeping the bishop but losing a tempo. Either way our plan is the same.",
                                                            },
                                                          ],
                                                          children: [
                                                            {
                                                              node: {
                                                                san: 'Bxe3',
                                                                movedBy: 'black',
                                                                idea:
                                                                  "5...Bxe3 — Black takes the trade. Bishop from c5 captures on e3. Now I get to choose how to recapture, and the answer is the f-pawn — fxe3 — which opens the f-file for our rook AND removes the danger of Bxg1.",
                                                                narration: [
                                                                  {
                                                                    text: '5...Bxe3 — Black takes the trade.',
                                                                    arrows: [{ from: 'c5', to: 'e3', color: 'green' }],
                                                                  },
                                                                  {
                                                                    text: 'Bishop from c5 captures on e3. Now I choose how to recapture.',
                                                                  },
                                                                ],
                                                                children: [
                                                                  {
                                                                    node: {
                                                                      san: 'fxe3',
                                                                      movedBy: 'white',
                                                                      idea:
                                                                        "6.fxe3 — and there's the move. F-pawn captures back on e3. We've doubled our e-pawns and that's slightly ugly, BUT — and this is the whole point of the recapture — the f-file is now wide open. Our rook on h1 can swing to f1; our queen can use the file; the king will castle short and live behind a still-intact pawn shield on g2-h2. The doubled e-pawns are a minor structural concession; the open f-file is a major attacking asset.",
                                                                      narration: [
                                                                        {
                                                                          text: '6.fxe3 — and there is the move. F-pawn captures back on e3.',
                                                                          arrows: [{ from: 'f2', to: 'e3', color: 'green' }],
                                                                        },
                                                                        {
                                                                          text: "We have doubled our e-pawns and that's slightly ugly. But the f-file is now wide open.",
                                                                          highlights: [
                                                                            { square: 'e3', color: 'yellow' },
                                                                            { square: 'e4', color: 'yellow' },
                                                                          ],
                                                                        },
                                                                        {
                                                                          text: 'Rook on h1 can swing to f1. Queen can use the file. The doubled pawns are a minor concession — the open f-file is a major attacking asset.',
                                                                          arrows: [{ from: 'h1', to: 'f1', color: 'blue' }],
                                                                        },
                                                                      ],
                                                                      children: [
                                                                        {
                                                                          node: {
                                                                            san: 'd6',
                                                                            movedBy: 'black',
                                                                            idea:
                                                                              "6...d6 — Black plays it safe. Pawn to d6 supports e5, opens the c8-bishop's diagonal, and waits to see what we commit to. The center is locked: our pawn on e4 against theirs on e5. From here we develop normally — knight to f3, castle short, prepare the f-file pressure.",
                                                                            narration: [
                                                                              {
                                                                                text: '6...d6 — Black plays it safe. Pawn to d6,',
                                                                                arrows: [{ from: 'd7', to: 'd6', color: 'green' }],
                                                                              },
                                                                              {
                                                                                text: 'supports e5 and opens the c8-bishop diagonal so it can develop.',
                                                                                arrows: [
                                                                                  { from: 'd6', to: 'e5', color: 'blue' },
                                                                                  { from: 'c8', to: 'h3', color: 'yellow' },
                                                                                ],
                                                                              },
                                                                            ],
                                                                            children: [
                                                                              {
                                                                                node: {
                                                                                  san: 'Nf3',
                                                                                  movedBy: 'white',
                                                                                  idea:
                                                                                    "7.Nf3 — bring the second knight out. Knight from g1 to f3, where it pressures e5 (third attacker on the pawn) and supports a future castle. With both knights, both bishops, and the kingside cleared, we're one move from castling.",
                                                                                  narration: [
                                                                                    {
                                                                                      text: '7.Nf3 — bring the second knight out.',
                                                                                      arrows: [{ from: 'g1', to: 'f3', color: 'green' }],
                                                                                    },
                                                                                    {
                                                                                      text: 'Knight from g1 to f3, pressuring e5 — a third attacker on the pawn.',
                                                                                      arrows: [{ from: 'f3', to: 'e5', color: 'red' }],
                                                                                      highlights: [{ square: 'e5', color: 'red' }],
                                                                                    },
                                                                                    {
                                                                                      text: "We're one move from castling.",
                                                                                      arrows: [{ from: 'e1', to: 'g1', color: 'blue' }],
                                                                                    },
                                                                                  ],
                                                                                  children: [
                                                                                    {
                                                                                      node: {
                                                                                        san: 'O-O',
                                                                                        movedBy: 'black',
                                                                                        idea:
                                                                                          "7...O-O — Black castles first. King to g8, rook to f8. Standard procedure; nothing special about it. Our turn to do the same.",
                                                                                        narration: [
                                                                                          {
                                                                                            text: '7...O-O — Black castles first.',
                                                                                            arrows: [{ from: 'e8', to: 'g8', color: 'green' }],
                                                                                          },
                                                                                          {
                                                                                            text: 'King to g8, rook to f8. Our turn.',
                                                                                          },
                                                                                        ],
                                                                                        children: [
                                                                                          {
                                                                                            node: {
                                                                                              san: 'O-O',
                                                                                              movedBy: 'white',
                                                                                              idea:
                                                                                                "8.O-O — and we follow. King to g1, rook to f1. The rook lands directly on the open f-file — every move of this opening has been pointing toward this exact configuration. We're now in the middlegame with a textbook Vienna setup: open f-file, knights on c3 and f3, bishop on c4 eyeing f7, kings safely castled, doubled e-pawns the only structural blemish. Black's only critical decision left is whether to challenge our bishop with Bg4.",
                                                                                              narration: [
                                                                                                {
                                                                                                  text: '8.O-O — and we follow. King to g1,',
                                                                                                  arrows: [{ from: 'e1', to: 'g1', color: 'green' }],
                                                                                                },
                                                                                                {
                                                                                                  text: 'rook to f1 — directly on the open f-file. Every move of this opening has been pointing toward this exact configuration.',
                                                                                                  arrows: [{ from: 'h1', to: 'f1', color: 'green' }],
                                                                                                  highlights: [{ square: 'f1', color: 'blue' }],
                                                                                                },
                                                                                                {
                                                                                                  text: "We're now in the middlegame. Open f-file, knights on c3 and f3, bishop on c4 eyeing f7, both kings castled. Doubled e-pawns the only structural blemish — and worth it.",
                                                                                                  highlights: [
                                                                                                    { square: 'g1', color: 'green' },
                                                                                                    { square: 'g8', color: 'green' },
                                                                                                  ],
                                                                                                },
                                                                                              ],
                                                                                              children: [
                                                                                                {
                                                                                                  node: {
                                                                                                    san: 'Bg4',
                                                                                                    movedBy: 'black',
                                                                                                    idea:
                                                                                                      "8...Bg4 — Black pins our knight. Bishop from c8 to g4, pinning Nf3 against our queen on d1. The threat is to play Nxe4 next — since the knight on f3 is pinned, it can't recapture. Our answer is h3 — kick the bishop, force the trade or the retreat.",
                                                                                                    narration: [
                                                                                                      {
                                                                                                        text: '8...Bg4 — Black pins our knight.',
                                                                                                        arrows: [{ from: 'c8', to: 'g4', color: 'green' }],
                                                                                                      },
                                                                                                      {
                                                                                                        text: 'Bishop to g4, pinning the f3-knight against our queen on d1.',
                                                                                                        arrows: [{ from: 'g4', to: 'd1', color: 'red' }],
                                                                                                        highlights: [
                                                                                                          { square: 'f3', color: 'red' },
                                                                                                          { square: 'd1', color: 'red' },
                                                                                                        ],
                                                                                                      },
                                                                                                      {
                                                                                                        text: 'The threat is Nxe4 — since the f3-knight is pinned, it cannot recapture. We answer with h3.',
                                                                                                        arrows: [{ from: 'f6', to: 'e4', color: 'yellow' }],
                                                                                                      },
                                                                                                    ],
                                                                                                    children: [
                                                                                                      {
                                                                                                        node: {
                                                                                                          san: 'h3',
                                                                                                          movedBy: 'white',
                                                                                                          idea:
                                                                                                            "9.h3 — kick the bishop. Pawn to h3 forces Bxf3 (the trade) or Bh5 (retreat, then we play g4 next to chase it further). If they trade, we recapture with the queen — Qxf3 — and our queen lands on a powerful kingside square pointing at f7 and ready to swing. The middlegame plan from here: queen and rook on the f-file, knight to d5 if Black ever lets us, push the d-pawn or the e-pawn for a central break. This is where opening theory ends and real chess begins.",
                                                                                                          narration: [
                                                                                                            {
                                                                                                              text: '9.h3 — kick the bishop.',
                                                                                                              arrows: [{ from: 'h2', to: 'h3', color: 'green' }],
                                                                                                            },
                                                                                                            {
                                                                                                              text: 'Pawn to h3 forces the trade with Bxf3, or the retreat to h5.',
                                                                                                              arrows: [
                                                                                                                { from: 'g4', to: 'f3', color: 'red' },
                                                                                                                { from: 'g4', to: 'h5', color: 'yellow' },
                                                                                                              ],
                                                                                                            },
                                                                                                            {
                                                                                                              text: 'If they trade, we recapture with the queen — Qxf3 — and the queen lands on a powerful kingside square pointing at f7.',
                                                                                                              arrows: [
                                                                                                                { from: 'd1', to: 'f3', color: 'green' },
                                                                                                                { from: 'f3', to: 'f7', color: 'red' },
                                                                                                              ],
                                                                                                            },
                                                                                                            {
                                                                                                              text: 'Middlegame plan from here. Queen and rook on the f-file. Knight to d5 if Black lets us. Push the d-pawn or the e-pawn for a central break. This is where opening theory ends and real chess begins.',
                                                                                                              arrows: [
                                                                                                                { from: 'c3', to: 'd5', color: 'blue' },
                                                                                                                { from: 'd3', to: 'd4', color: 'green' },
                                                                                                              ],
                                                                                                            },
                                                                                                          ],
                                                                                                          children: [],
                                                                                                        },
                                                                                                      },
                                                                                                    ],
                                                                                                  },
                                                                                                },
                                                                                              ],
                                                                                            },
                                                                                          },
                                                                                        ],
                                                                                      },
                                                                                    },
                                                                                  ],
                                                                                },
                                                                              },
                                                                            ],
                                                                          },
                                                                        },
                                                                      ],
                                                                    },
                                                                  },
                                                                ],
                                                              },
                                                            },
                                                          ],
                                                        },
                                                      },
                                                    ],
                                                  },
                                                },
                                              ],
                                            },
                                          },
                                        ],
                                      },
                                    },
                                  ],
                                },
                              },
                            ],
                          },
                        },
                        {
                          label: '2…Bc5',
                          forkSubtitle:
                            "Italian-style as Black — develop and fight for d4",
                          node: {
                            san: 'Bc5',
                            movedBy: 'black',
                            idea:
                              "2...Bc5 — Black plays Italian-style as Black, developing the bishop to its most active square and aiming at the f2 pawn. This is rarer than the knight moves but solid. We respond with normal development and look for f4 later, same as the other lines.",
                            children: [
                              {
                                node: {
                                  san: 'Nf3',
                                  movedBy: 'white',
                                  idea:
                                    "3.Nf3 — develop the second knight. Yes, this commits the f-pawn behind the knight for now, but after 2...Bc5 the gambit f4 doesn't work as well anyway (Black can take and the bishop on c5 is already eyeing the f2 square). 3.Nf3 is the practical choice — get all our pieces out, castle short, then look for breaks.",
                                  children: [],
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  },
};
