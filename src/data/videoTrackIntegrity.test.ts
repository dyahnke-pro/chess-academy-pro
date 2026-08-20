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
  titleCheck?: { claims: string; confirmed: boolean; verdict?: string; checkedBy?: string };
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

/** FEN after a move prefix, memoized.
 *
 *  Replaying each prefix from the opening position is quadratic in line length,
 *  and with 100+ ply lessons and twenty tracks these checks stopped FAILING and
 *  started TIMING OUT — the least useful way for a gate to break, since a
 *  timeout says nothing about the data. A prefix is its parent plus one move, so
 *  each is derived from the cached parent instead. Shared across checks: the
 *  same prefixes are walked by more than one. `''` caches an illegal line. */
const fenCache = new Map<string, string>();
const fenOfPrefix = (sans: string[]): string | null => {
  const key = sans.join(' ');
  const hit = fenCache.get(key);
  if (hit !== undefined) return hit || null;
  const parent = sans.length === 1 ? new Chess().fen() : fenOfPrefix(sans.slice(0, -1));
  if (parent === null) { fenCache.set(key, ''); return null; }
  const c = new Chess(parent);
  try { c.move(sans[sans.length - 1]); } catch { fenCache.set(key, ''); return null; }
  fenCache.set(key, c.fen());
  return c.fen();
};

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
        const got = fenOfPrefix(line);
        expect(got, `${track.videoId} @${m.t}s: illegal line ${line.join(' ')}`).not.toBeNull();
        // The FEN must be what those moves actually produce. This is the check
        // that makes a track trustworthy: prose can be graded against a board
        // only if the board is what the moves say it is.
        expect(got && posKey(got), `${track.videoId} @${m.t}s FEN disagrees with its moves`)
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

  it('every opening a track claims is one the lesson actually reached', { timeout: 60000 }, () => {
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
    // A NAME MAPS TO MANY POSITIONS, not one. "Queen's Pawn Game: Chigorin
    // Variation" is four separate DB entries — d4 Nf6 Nc3 d5, d4 d5 Nc3,
    // d4 d5 Nc3 e6 and d4 d5 Nf3 Nc6 — and the same is true across the file
    // wherever move orders converge on one name. Keying name -> one position
    // made this gate fail on a correct build, so it collects every position a
    // name is used for and asks whether the cited line is one of them.
    const dbPos = new Map<string, Set<string>>();
    for (const e of db) {
      const c = new Chess();
      let ok = true;
      for (const san of e.pgn.trim().split(/\s+/).filter((t) => !/^\d+\.+$/.test(t))) {
        // chess.js throws on an illegal move rather than returning null, so the
        // catch IS the guard — testing the return value is dead code.
        try { c.move(san); } catch { ok = false; break; }
      }
      if (!ok) continue;
      const bucket = dbPos.get(e.name) ?? new Set<string>();
      bucket.add(posKey(c.fen()));
      dbPos.set(e.name, bucket);
    }

    for (const track of tracks) {
      // Every position the lesson stood on, prefixes included.
      const visited = new Set<string>();
      let line: string[] = [];
      for (const m of track.moves) {
        if (!m.line.length) continue;
        line = line.slice(0, m.ply - m.line.length);
        line.push(...m.line);
        for (let n = 1; n <= line.length; n++) {
          const f = fenOfPrefix(line.slice(0, n));
          if (f === null) break;
          visited.add(posKey(f));
        }
      }

      for (const o of track.openings ?? []) {
        const want = dbPos.get(o.name);
        expect(want, `${track.videoId}: "${o.name}" is not a name in the DB`).toBeDefined();
        if (!want) continue;
        const c = new Chess();
        let threw: string | null = null;
        try {
          for (const san of o.line.split(' ')) c.move(san);
        } catch (e) {
          threw = String(e);
        }
        expect(threw, `${track.videoId}: "${o.name}" cites an illegal line`).toBeNull();
        // The cited line must BE that opening, and the lesson must have played it.
        expect(want.has(posKey(c.fen())),
          `${track.videoId}: "${o.name}" cites a line that is a different opening`).toBe(true);
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

  it('every committed build carries hand-written notes', () => {
    // David 2026-08-17: *"all openings we get corpus for will get hand written
    // lines. So every line you pull needs to be hand written by you to maintain
    // accuracy and standard."*
    //
    // Pulling a line IS the commitment to write it, so a build sitting here with
    // no notes is not a backlog item — it is an unpaid debt against the standard,
    // and debts accumulate silently unless something counts them. This is that
    // something.
    //
    // It is also what stops the tempting shortcut. Seven builds were removed the
    // day this rule landed rather than papered over, and six of them were removed
    // because they were MISTRACKED, not merely un-noted: a King's Gambit lesson
    // had tracked as `d3 c5 d4 d5`. Note that every move of that line is LEGAL —
    // chess.js cannot catch a systematically wrong read, only an impossible one,
    // so the legality checks above all passed on nonsense. Writing prose over it
    // would have satisfied this test while destroying exactly what it protects.
    const bare = tracks.filter((t) => !(t.notes ?? []).length).map((t) => t.videoId);
    expect(bare, `builds with no hand-written notes — write them or drop the build:\n${bare.join('\n')}`)
      .toEqual([]);
  });

  it('an unconfirmed title is resolved by hand, never left hanging', () => {
    // `titleCheck.confirmed === false` means the board did not back the title,
    // and that has two very different causes: the TITLE is wrong (the "Scotch
    // Game" upload that plays 3.Nc3 for eighty plies — a fine build), or the
    // TRACK is wrong (a Najdorf video resolving to "Bird Opening" — junk). Only
    // a person looking at it can tell, and nothing else in the pipeline can.
    //
    // So the verdict is required to be recorded. Without this, an unresolved
    // flag looks identical to a resolved one and the distinction rots.
    // A TITLE THAT NAMES NO OPENING IS OUTSIDE THIS CONTRACT, not exempt from
    // it. `checkTitle` now records `{claims: null, unverifiable}` for marketing
    // titles ("Master Class | Controlling Center") instead of writing nothing,
    // because an ABSENT verdict reads as a passed one — 6 banked tracks sat in
    // that state. Those entries claim nothing, so the board cannot have failed
    // to back them and there is no disagreement for a person to settle. Every
    // title that DOES name an opening is still held to the full requirement.
    const unresolved = tracks
      .filter((t) => t.titleCheck?.claims && !t.titleCheck.confirmed && !t.titleCheck.verdict)
      .map((t) => `${t.videoId} claims "${t.titleCheck?.claims}"`);
    expect(unresolved, `unconfirmed titles with no hand verdict:\n${unresolved.join('\n')}`)
      .toEqual([]);
  });

  it('a build judged mistracked is never written from', () => {
    // The verdict above records the judgement; this enforces it. Recording
    // "mistracked" and then writing notes anyway satisfies both of the tests
    // above — the build has a verdict, and it has notes — while shipping prose
    // over a board the video never showed, which is the exact harm the whole
    // pipeline exists to prevent.
    //
    // Quarantining the file out of the bank is the first line of defence and the
    // one that works day to day; this is what survives someone moving it back.
    // `srNXYAsaX7I` is the worked example: 113 plies of a real, legal, correctly
    // named Semi-Tarrasch, over a video whose game was an Alapin.
    const written = tracks
      .filter((t) => t.titleCheck?.verdict === 'mistracked' && (t.notes ?? []).length)
      .map((t) => t.videoId);
    expect(written, `mistracked builds carrying notes — re-track them or drop them:\n${written.join('\n')}`)
      .toEqual([]);
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
