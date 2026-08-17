#!/usr/bin/env node
/**
 * attach-notes — put the hand-written notes INTO the build, keyed by position.
 *
 * David 2026-08-17: *"right now all we do is map each opening with the
 * narrations and save the builds for later."* A build is only saved for later
 * if the narrations travel with it in a shape something can consume. Prose in a
 * markdown doc is a record, not a build.
 *
 * A NOTE NAMES ITS ANCHOR BY MOVES, NEVER BY FEN. That is the whole design:
 * the FEN is looked up from the track, so there is no way to type one in and
 * therefore no way to typo one. This exists because I typed one by hand and got
 * it wrong — a bishop left on a square it had already been captured from, in a
 * note whose every sentence was otherwise sound. Making the mistake
 * unavailable beats catching it.
 *
 * A line that the lesson never reached resolves to nothing and the note is
 * REFUSED, which is the same contract the rest of the pipeline keeps: silence
 * over invention.
 *
 * Usage: node scripts/video-align/attach-notes.mjs [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const TRACK = 'data/video-tracks/ykmGxE9DURo.json';

/** Written by hand from the lesson (see docs/plans/2026-08-17-handwritten-note-pilot.md).
 *  `line` is the move sequence the note is about; the FEN comes from the track. */
const NOTES = [
  {
    id: 'vn-traxler-sac-declined',
    line: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5 Nxf7',
    teaches: 'A line can be objectively playable and still be the wrong practical choice. When every continuation is forcing and one slip ends the game, the recall a line demands is part of its price, and a verdict of "balanced" does not repay that price.',
    explains: 'Taking on f7 drags the black king into the open, but it hands Black a long series of checks that must each be met exactly. White is no better at the end of it, so the risk buys no advantage — only an obligation to remember a great deal of theory correctly under a clock.',
  },
  {
    id: 'vn-traxler-surprise',
    line: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5 d4',
    teaches: 'Against a gambit whose whole value is preparation, the strongest practical reply is often the one your opponent has not studied. A move that is merely good but unexpected can outperform a move that is best and famous, because the opponent’s preparation is part of the position too.',
    explains: 'Pushing the d-pawn opens the queen’s bishop and strikes at the centre while Black’s pieces are still committed to a kingside attack that has not started. Black’s position is defensible, but only by a reply most players never consider.',
  },
  {
    id: 'vn-traxler-counter-not-retreat',
    line: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5 d4 d5',
    teaches: 'When a defender’s instinct is to protect the attacked point, the saving move is often to hit something of equal value instead. Counting who is attacking what, rather than rescuing the piece under fire, is what finds these.',
    explains: 'Advancing the d-pawn ignores the threat and challenges the bishop that aims at f7. Because it interferes with the most dangerous attacking piece rather than fleeing, Black gains the time a defensive move would have spent.',
  },
  {
    id: 'vn-traxler-simplifying-capture',
    line: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5 Bxf7+ Ke7 Bc4',
    teaches: 'Against an aggressive gambit, prefer the capture that removes the opponent’s attacking chances over the one that wins the most material. The best practical answer often leaves the fewest enemy pieces pointing at your king.',
    explains: 'Capturing with the bishop checks immediately and forces the king to step forward before Black can coordinate. The lines that make this opening dangerous never begin, and White keeps a sound extra pawn and a safe king.',
  },
  {
    id: 'vn-traxler-king-choice',
    line: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5 Nxf7 Bxf2+ Kxf2 Nxe4+',
    teaches: 'A king dragged into the open has to choose between holding on to material and getting out of the way, and the instinct to hold on is usually the losing one. Count the checks available to the attacker before deciding where to step, not after.',
    explains: 'The king has six legal squares here. Stepping forward keeps everything defended and walks into a forced mate; stepping back concedes a pawn and survives. The difference is not calculation depth, it is which question was asked first.',
  },
];

const track = JSON.parse(readFileSync(TRACK, 'utf8'));

// Resolve each note's anchor by replaying the track and matching its line.
const fenOf = new Map();
{
  let line = [];
  for (const m of track.moves) {
    if (!m.line.length) continue;
    line = line.slice(0, m.ply - m.line.length);
    line.push(...m.line);
    const key = line.join(' ');
    if (!fenOf.has(key)) fenOf.set(key, { fen: m.fen, t: m.t, ply: m.ply });
  }
}

const attached = [];
for (const n of NOTES) {
  const hit = fenOf.get(n.line);
  if (!hit) {
    console.error(`REFUSED ${n.id}: the lesson never reached "${n.line}"`);
    continue;
  }
  attached.push({ ...n, fen: hit.fen, t: hit.t, ply: hit.ply, source: `yt:${track.videoId}` });
  console.log(`  ${n.id}  ply ${hit.ply} @${hit.t}s`);
}

console.log(`\n${attached.length}/${NOTES.length} notes anchored`);
if (process.argv.includes('--write')) {
  track.notes = attached;
  writeFileSync(TRACK, JSON.stringify(track, null, 1));
  console.log(`wrote notes into ${TRACK}`);
}
