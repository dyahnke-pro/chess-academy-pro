/**
 * lookup_player_opening_moves — the ON-THE-FLY engine for "how does
 * <player> play this opening" (David 2026-06-02). Queries the Lichess
 * per-player explorer (`source=player`) for the moves a SINGLE player
 * actually plays at the given position, with their win/draw/loss counts
 * computed server-side across the player's whole Lichess history.
 *
 * The brain walks this ply-by-ply: at each position the player's
 * most-played move is the spine; the alternates are the variations
 * (ranked by how often the player plays them). That reproduces the
 * data-build the content pipeline does — but LIVE, for ANY player on
 * Lichess, with no pre-authored repertoire. When the bundled
 * `lookup_player_games` reference set already covers the player+opening,
 * prefer that (zero-latency, hand-checked); reach for THIS when we don't
 * have the player pre-built.
 *
 * Lichess usernames: a small high-confidence alias map covers a couple of
 * famous mains; otherwise `player` is treated as a raw Lichess username
 * (the student can supply one). No games found -> empty `moves` + a note;
 * the brain must NOT fabricate the player's moves (G3) and must NOT brand
 * the lesson as the player's official/endorsed content (the unbranded
 * rule). The name is a factual source for where the moves come from.
 */
import { fetchLichessPlayerExplorer } from '../../../services/lichessExplorerService';
import type { Tool } from '../../types';

/** App player id / common name -> VERIFIED public Lichess username (main
 *  account, confirmed to have explorer games). Keep this conservative:
 *  only well-established public mains, never an unconfirmed alt/smurf.
 *  Anything not here falls through to treating `player` as a raw
 *  Lichess username. */
// Every mapping below was LIVE-VERIFIED (2026-06-02) to resolve to an
// account with a rich explorer history on the Lichess /player endpoint —
// the famous players' real-NAME handles mostly have ~0 games (they play
// chess.com or under these active handles), so name->active-handle is what
// makes "teach me how <pro> plays X" actually return data.
const PRO_LICHESS_USERNAMES: Record<string, string> = {
  // World #1 / elite OTB who are ALSO active on Lichess under known handles.
  carlsen: 'DrNykterstein',
  'magnus carlsen': 'DrNykterstein',
  magnus: 'DrNykterstein',
  drnykterstein: 'DrNykterstein',
  firouzja: 'alireza2003',
  'alireza firouzja': 'alireza2003',
  alireza: 'alireza2003',
  alireza2003: 'alireza2003',
  nepomniachtchi: 'may6enexttime', // Ian Nepomniachtchi (4.5k games)
  nepo: 'may6enexttime',
  artemiev: 'Vladimirovich9000', // Vladislav Artemiev (5.5k)
  'vladislav artemiev': 'Vladimirovich9000',
  // Players whose REAL-NAME Lichess account is the active one.
  'nihal sarin': 'nihalsarin',
  nihal: 'nihalsarin',
  giri: 'AnishGiri',
  'anish giri': 'AnishGiri',
  zhigalko: 'Zhigalko_Sergei',
  'sergei zhigalko': 'Zhigalko_Sergei',
  'eric rosen': 'EricRosen',
  rosen: 'EricRosen',
  // Streamers / content creators active on Lichess.
  'andrew tang': 'penguingm1',
  penguin: 'penguingm1',
  penguingm1: 'penguingm1',
};

/** Alphanumerics only, lowercased — so "Magnus Carlsen", "magnuscarlsen",
 *  and "magnus_carlsen" all collapse to the same key. */
function norm(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Normalized alias map (built once) for spaceless / punctuation-insensitive
 *  matching: the brain often guesses "magnuscarlsen" rather than "Carlsen",
 *  and that MUST still resolve (production bug 2026-06-02: it passed
 *  "magnuscarlsen", missed the map, hit an empty Lichess account, then
 *  improvised the wrong opening). */
const NORM_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(PRO_LICHESS_USERNAMES).map(([k, v]) => [norm(k), v]),
);

function resolveUsername(player: string): string {
  const raw = player.trim();
  const lower = raw.toLowerCase();
  if (PRO_LICHESS_USERNAMES[lower]) return PRO_LICHESS_USERNAMES[lower];
  const nk = norm(raw);
  if (!nk) return raw;
  if (NORM_ALIASES[nk]) return NORM_ALIASES[nk]; // "magnuscarlsen" -> DrNykterstein
  // Substring match against the longer alias keys (≥5 chars, so a famous
  // surname embedded in a guessed handle resolves): "magnuscarlsen"
  // contains "carlsen", "alirezafirouzja" contains "firouzja", etc.
  for (const [k, v] of Object.entries(NORM_ALIASES)) {
    if (k.length >= 5 && (nk.includes(k) || k.includes(nk))) return v;
  }
  return raw;
}

export const lookupPlayerOpeningMovesTool: Tool = {
  name: 'lookup_player_opening_moves',
  category: 'cerebellum',
  kind: 'read',
  description:
    "ON-THE-FLY 'how does <player> play this opening' lookup against the Lichess per-player explorer. Given a Lichess username + the side they're on + the current position FEN, returns the moves THAT player actually plays here, ranked by frequency, with their win% (from their side) and average opponent rating — computed across the player's whole Lichess history. Walk it ply-by-ply to build a teaching plan from a player's REAL moves with no pre-authored repertoire: the most-played move is the main line, the alternates are variations. Use this when the pre-loaded player-games block / lookup_player_games doesn't already cover the player+opening. Returns { player, color, totalGames, openingName, moves: [{ san, games, playerScorePct, avgOpponentRating }] }. Empty moves => no games found for that player+position: say so, DO NOT invent the player's moves, and DO NOT advertise the lesson as the player's official course — the name is only a factual source. A few famous mains resolve by name (Carlsen, Firouzja); otherwise pass an exact Lichess username.",
  parameters: {
    type: 'object',
    properties: {
      player: {
        type: 'string',
        description:
          'Lichess username (e.g. "DrNykterstein"), or a famous name in the small alias map ("Carlsen", "Firouzja"). For anyone else, pass their exact Lichess username.',
      },
      color: {
        type: 'string',
        enum: ['white', 'black'],
        description: 'The side the player is on in this opening.',
      },
      fen: { type: 'string', description: 'Current position FEN.' },
      maxMoves: {
        type: 'number',
        description: 'Max candidate moves to return (default 6, max 12).',
      },
    },
    required: ['player', 'color', 'fen'],
  },
  async execute(args) {
    const playerArg = typeof args.player === 'string' ? args.player.trim() : '';
    const fen = typeof args.fen === 'string' ? args.fen.trim() : '';
    const color: 'white' | 'black' = args.color === 'black' ? 'black' : 'white';
    const maxMoves = Math.min(Math.max(Number(args.maxMoves) || 6, 1), 12);
    if (!playerArg) return { ok: false, error: 'player is required' };
    if (!fen) return { ok: false, error: 'fen is required' };

    const username = resolveUsername(playerArg);
    try {
      const data = await fetchLichessPlayerExplorer({ fen, player: username, color, maxMoves });
      const moves = (data.moves ?? []).map((m) => {
        const games = m.white + m.draws + m.black;
        // Win% from the queried player's own side.
        const favourable = color === 'white' ? m.white : m.black;
        const playerScorePct = games > 0 ? Math.round(((favourable + m.draws * 0.5) / games) * 100) : null;
        // The player endpoint carries averageOpponentRating; the shared
        // move type only declares averageRating, so read it defensively.
        const avgOpponentRating =
          (m as { averageOpponentRating?: number }).averageOpponentRating ?? m.averageRating ?? null;
        return { san: m.san, games, playerScorePct, avgOpponentRating };
      });
      const totalGames = data.white + data.draws + data.black;
      return {
        ok: true,
        result: {
          player: username,
          color,
          totalGames,
          openingName: data.opening?.name ?? null,
          moves,
          note:
            moves.length === 0
              ? `No Lichess games found for ${username} (${color}) at this position — don't invent their moves; teach the line from the master database instead, or confirm the username.`
              : undefined,
        },
      };
    } catch (err) {
      // A tool FAILURE (explorer unavailable / rate-limited / timeout) is
      // NOT permission for the brain to recite the player's stats from
      // memory (G3). A bare { ok:false, error } makes the brain improvise
      // and fabricate percentages (~40% of runs in the 2026-06-02 live
      // audit). Surface it instead as a NO-DATA result — the same shape
      // the brain already handles gracefully for an empty result — with a
      // hard anti-fabrication note, so it refuses cleanly.
      const reason = err instanceof Error ? err.message : String(err);
      return {
        ok: true,
        result: {
          player: username,
          color,
          totalGames: 0,
          openingName: null,
          moves: [],
          unavailable: true,
          note: `Couldn't reach the Lichess player explorer for ${username} right now (it may be rate-limited or down: ${reason}). You have NO move data for this player this turn. Tell the student you can't pull their games right now and offer to retry — and do NOT state ANY of this player's move frequencies, percentages, win-rates, or "he plays X most often" figures, because you don't have them and reciting them from memory is a fabrication (G3). You may teach the opening itself from the master database, clearly labelled as general theory, NOT as "his".`,
        },
      };
    }
  },
};
