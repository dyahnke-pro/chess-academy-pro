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
const PRO_LICHESS_USERNAMES: Record<string, string> = {
  carlsen: 'DrNykterstein',
  'magnus carlsen': 'DrNykterstein',
  magnus: 'DrNykterstein',
  drnykterstein: 'DrNykterstein',
  firouzja: 'alireza2003',
  'alireza firouzja': 'alireza2003',
  alireza: 'alireza2003',
  alireza2003: 'alireza2003',
};

function resolveUsername(player: string): string {
  const key = player.trim().toLowerCase();
  return PRO_LICHESS_USERNAMES[key] ?? player.trim();
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
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
