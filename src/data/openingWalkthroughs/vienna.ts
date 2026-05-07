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
                                          "3...exf4 — Black takes the bait. Now I'm down a pawn but my plan writes itself: develop fast, get the king to safety, build pressure on the kingside, push e5 if I can to chase Black's f6-knight. My pieces are all about to come out with tempo; Black has to spend moves figuring out where to put the king and how to give back the pawn safely.",
                                        children: [
                                          {
                                            node: {
                                              san: 'Nf3',
                                              movedBy: 'white',
                                              idea:
                                                "4.Nf3 — stops Black from playing ...Qh4+ (which would be devastating, splitting my king from castling rights). This is non-negotiable; any other 4th move runs into ...Qh4+ and the wheels come off. Once the knight is on f3, that diagonal is shut and I can resume normal development.",
                                              children: [],
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
