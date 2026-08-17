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
interface ForkOption { san: string; t: number; continuation: string }
interface Fork { fen: string; line: string[]; ply: number; options: ForkOption[] }
interface VideoNote {
  id: string; line: string; fen: string; t: number; ply: number;
  teaches: string; explains: string; source: string;
}
interface TrackOpening { name: string; eco: string; plies: number; line: string; coverage: number }
interface Track {
  videoId: string;
  title?: string | null;
  geometry: { x0: number; y0: number; square: number; orientation: string | null };
  moves: TrackMove[];
  forks?: Fork[];
  notes?: VideoNote[];
  openings?: TrackOpening[];
  titleCheck?: { claims: string; confirmed: boolean };
}

/** `by-opening.json` lives beside the tracks but is an INDEX, not a track — it
 *  has no `moves`, so loading it as one crashes every check here. Identify a
 *  track by its shape rather than by listing filenames to exclude, so a future
 *  sidecar cannot break this the same way. */
const loadTracks = (): Track[] => {
  if (!existsSync(TRACK_DIR)) return [];
  return readdirSync(TRACK_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(TRACK_DIR, f), 'utf8')) as Partial<Track>)
    .filter((t): t is Track => Array.isArray(t.moves) && typeof t.videoId === 'string');
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

  it('every fork option is legal at its own position', () => {
    // The forks are the alternatives the lesson DEMONSTRATED — what David asked
    // Learn and Review to surface ("so the user knows there are other options
    // at certain forks"). They are safe to present precisely because they were
    // on screen rather than proposed, but a transcription slip would still put
    // an impossible move in front of a student, so each is played.
    for (const track of tracks) {
      for (const f of track.forks ?? []) {
        expect(f.options.length, `${track.videoId}: a fork needs >1 option`)
          .toBeGreaterThan(1);
        for (const o of f.options) {
          const c = new Chess(f.fen);
          let ok = false;
          try {
            ok = Boolean(c.move(o.san));
          } catch {
            ok = false;
          }
          expect(ok, `${track.videoId}: ${o.san} illegal after ${f.line.join(' ')}`).toBe(true);
        }
      }
    }
  });

  it('every attached note sits on the position its own moves produce', () => {
    // Notes name their anchor by MOVES and have the FEN resolved from the track
    // (attach-notes.mjs), so a typo is structurally unavailable rather than
    // merely discouraged. This proves the resolution actually held: replay the
    // note's line and the board must be the one stored.
    for (const track of tracks) {
      for (const n of track.notes ?? []) {
        const c = new Chess();
        let threw: string | null = null;
        try {
          for (const san of n.line.split(' ')) c.move(san);
        } catch (e) {
          threw = String(e);
        }
        expect(threw, `${n.id}: illegal line`).toBeNull();
        expect(posKey(c.fen()), `${n.id}: stored FEN is not what its moves produce`)
          .toBe(posKey(n.fen));
        // And the lesson must actually have reached it.
        const shown = new Set(track.moves.map((m) => posKey(m.fen)));
        expect(shown.has(posKey(n.fen)), `${n.id}: position never on screen`).toBe(true);
        expect(n.teaches.length, `${n.id}: empty teaching`).toBeGreaterThan(20);
      }
    }
  });

  it('every opening a track claims is one the lesson actually reached', () => {
    // `by-opening.json` is how a later session finds what we have for an
    // opening, and until now nothing checked it. The risk it carries is the one
    // this whole pipeline exists to remove: an upload titled "Scotch Game" that
    // plays 3.Nc3 for eighty plies would, if filed by its title, hand a Three
    // Knights lesson to students learning the Scotch (h-9MlTRN-fk, 2026-08-17).
    //
    // The index resolves from the board instead, so the defect never reached it
    // — this pins that. Each named opening must be a real DB line, and the
    // lesson must have stood on the position that line produces.
    const db = JSON.parse(
      readFileSync(join(process.cwd(), 'src/data/openings-lichess.json'), 'utf8'),
    ) as Array<{ name: string; pgn: string }>;
    const dbPos = new Map<string, string>();
    for (const e of db) {
      if (dbPos.has(e.name)) continue;
      const c = new Chess();
      let ok = true;
      for (const san of e.pgn.trim().split(/\s+/).filter((t) => !/^\d+\.+$/.test(t))) {
        // chess.js throws on an illegal move rather than returning null, so the
        // catch IS the guard — testing the return value is dead code.
        try { c.move(san); } catch { ok = false; break; }
      }
      if (ok) dbPos.set(e.name, posKey(c.fen()));
    }

    for (const track of tracks) {
      // Every position the lesson stood on, prefixes included.
      const visited = new Set<string>();
      let line: string[] = [];
      for (const m of track.moves) {
        if (!m.line.length) continue;
        line = line.slice(0, m.ply - m.line.length);
        line.push(...m.line);
        const c = new Chess();
        for (const san of line) {
          try { c.move(san); } catch { break; }
          visited.add(posKey(c.fen()));
        }
      }

      for (const o of track.openings ?? []) {
        const want = dbPos.get(o.name);
        expect(want, `${track.videoId}: "${o.name}" is not a name in the DB`).toBeDefined();
        const c = new Chess();
        let threw: string | null = null;
        try {
          for (const san of o.line.split(' ')) c.move(san);
        } catch (e) {
          threw = String(e);
        }
        expect(threw, `${track.videoId}: "${o.name}" cites an illegal line`).toBeNull();
        // The cited line must BE that opening, and the lesson must have played it.
        expect(posKey(c.fen()), `${track.videoId}: "${o.name}" cites a line that is a different opening`)
          .toBe(want);
        expect(visited.has(posKey(c.fen())), `${track.videoId}: "${o.name}" was never on the board`)
          .toBe(true);
      }

      // A title that disagrees with the board is allowed — the video is still a
      // real lesson — but it has to stay visible, because the disagreement is
      // exactly what would otherwise be copied forward as fact.
      if (track.titleCheck && !track.titleCheck.confirmed) {
        expect(
          (track.openings ?? []).some((o) => o.name === track.titleCheck?.claims),
          `${track.videoId}: flagged as unconfirmed yet "${track.titleCheck.claims}" is in its openings`,
        ).toBe(false);
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
