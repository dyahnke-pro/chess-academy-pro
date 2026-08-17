// A NOTE MAY ONLY CITE A POSITION THE VIDEO ACTUALLY SHOWED.
//
// This gate exists because I broke the rule myself, by hand, minutes after
// writing it down. Hand-transcribing a FEN into a note put Black's bishop on a
// square it had already been captured from and dropped White's bishop entirely.
// Every sentence of that note was sound; the board it pointed at did not exist.
//
// That is the same defect the farmed corpus already has at scale — a Traxler
// lesson's teaching filed in the Giuoco Pianissimo, three such notes still
// selected and spoken (see PLAN.md) — and it is invisible to every existing
// check, because `noteDescribesPosition` asks whether prose is TRUE OF a board,
// never whether it was ABOUT that board.
//
// Discipline does not survive contact with a long session. A gate does.
//
// Two things are checked:
//   1. Each committed track is internally legal — every move plays from the
//      position before it, so a track cannot drift into fiction on its own.
//   2. Every FEN cited in the hand-written notes appears in some track. Copy
//      positions from the track output; never retype them.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';

const TRACK_DIR = join(process.cwd(), 'data/video-tracks');
const NOTES_DOC = join(process.cwd(), 'docs/plans/2026-08-17-handwritten-note-pilot.md');

interface TrackMove { t: number; ply: number; line: string[]; fen: string }
interface Track {
  videoId: string;
  geometry: { x0: number; y0: number; square: number; orientation: string | null };
  moves: TrackMove[];
}

const loadTracks = (): Track[] => {
  if (!existsSync(TRACK_DIR)) return [];
  return readdirSync(TRACK_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(TRACK_DIR, f), 'utf8')) as Track);
};

/** Placement + side to move. Move counters differ between a replay and a
 *  rewind-visited position without the BOARD differing, and the board is what a
 *  note is about. */
const posKey = (fen: string): string => fen.split(' ').slice(0, 2).join(' ');

describe('video tracks', () => {
  const tracks = loadTracks();

  it('has at least one committed track', () => {
    expect(tracks.length).toBeGreaterThan(0);
  });

  it('every recorded FEN is a legal position', () => {
    for (const track of tracks) {
      for (const m of track.moves) {
        expect(() => new Chess(m.fen), `${track.videoId} ply ${m.ply} @${m.t}s`).not.toThrow();
      }
    }
  });

  it('every recorded FEN is exactly what its moves produce', () => {
    for (const track of tracks) {
      // `line` holds the moves ADDED at this step, not the whole line — a
      // rewind re-enters at a lower ply and continues from there. So the full
      // line is rebuilt as we walk: truncate to where this step began, append
      // what it added. (Assuming `line` was the complete line is a mistake this
      // gate caught on its first run.)
      let line: string[] = [];
      for (const m of track.moves) {
        line = line.slice(0, m.ply - m.line.length);
        line.push(...m.line);
        const c = new Chess();
        let threw: string | null = null;
        try {
          for (const san of line) c.move(san);
        } catch (e) {
          threw = String(e);
        }
        expect(threw, `${track.videoId} @${m.t}s: ${line.join(' ')}`).toBeNull();
        // The FEN must be what those moves actually produce. This is the check
        // that makes a track trustworthy: prose can be graded against a board
        // only if the board is what the moves say it is.
        expect(posKey(c.fen()), `${track.videoId} @${m.t}s FEN disagrees with its moves`)
          .toBe(posKey(m.fen));
      }
    }
  });

  it('hand-written notes cite only positions the video showed', () => {
    if (!existsSync(NOTES_DOC)) return;
    const shown = new Set(tracks.flatMap((t) => t.moves.map((m) => posKey(m.fen))));
    const doc = readFileSync(NOTES_DOC, 'utf8');
    const cited = [...doc.matchAll(/`([rnbqkpRNBQKP1-8/]+ [wb] [KQkq-]+ [a-h1-9-]+ \d+ \d+)`/g)]
      .map((m) => m[1]);
    expect(cited.length, 'no FENs found in the notes doc — did its format change?')
      .toBeGreaterThan(0);
    const orphans = cited.filter((f) => !shown.has(posKey(f)));
    expect(orphans, `cited but never on screen:\n${orphans.join('\n')}`).toEqual([]);
  });
});
