/**
 * lookup_player_games — read-only zero-latency lookup against the
 * bundled pro game-reference set (`src/data/pro-game-references.json`,
 * built by scripts/pro-repertoire/build-game-references.mjs). The
 * coach's BREADTH layer: a pro's REAL games per opening/variation with
 * full move lists, opponent + rating + result + source.
 *
 * The auto-injected `playerGames` envelope block ships only the top ~4
 * games (40-ply preview). This tool surfaces MORE games and the FULL
 * move list on demand, so the brain can walk an entire game in a
 * walkthrough or pull additional examples. Filter by player +
 * opening (base id, pro id, or name) + variation. (David 2026-06-01.)
 */
import proRepertoireData from '../../../data/pro-repertoires.json';
import { loadProGameReferenceData } from '../../../services/proGameReferenceData';
import type { Tool } from '../../types';
import type { ProGameReference } from '../../../types';

const PLAYER_NAMES: Record<string, string> = Object.fromEntries(
  (proRepertoireData as { players: { id: string; name: string }[] }).players.map((p) => [p.id, p.name]),
);

function studentLost(g: ProGameReference): boolean {
  return (g.studentSide === 'white' && g.result === '0-1') ||
         (g.studentSide === 'black' && g.result === '1-0');
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const lookupPlayerGamesTool: Tool = {
  name: 'lookup_player_games',
  category: 'cerebellum',
  kind: 'read',
  description:
    "Look up a pro player's REAL games in an opening from the bundled reference set. Deterministic, zero-latency, offline. Returns { totalAvailable, games: [{ id, player, studentSide, opponent, opponentRating, result, date, source, variationLabel, plyCount, pgn }] } — pgn is the full clean SAN move list. Use this to walk a whole game in a walkthrough or pull more examples than the pre-loaded block. Filter by any of: player (app id like \"naroditsky\" or a name), openingId (base like \"caro-kann\"), proOpeningId (like \"pro-naroditsky-caro-kann\"), or openingName. Returns [] when nothing matches — never invent games not returned here.",
  parameters: {
    type: 'object',
    properties: {
      player: { type: 'string', description: 'Pro player app id ("naroditsky") or display name. Optional.' },
      openingId: { type: 'string', description: 'Base opening id, e.g. "caro-kann". Optional.' },
      proOpeningId: { type: 'string', description: 'Pro opening id, e.g. "pro-naroditsky-caro-kann". Optional — most precise.' },
      openingName: { type: 'string', description: 'Opening display name, e.g. "Caro-Kann Defense". Optional.' },
      variation: { type: 'string', description: 'Variation label or slug to narrow to one line. Optional.' },
      limit: { type: 'number', description: 'Max games to return (default 6, max 12).' },
      fullPgn: { type: 'boolean', description: 'Return the full move list (default true). When false, the first 40 plies.' },
    },
    required: [],
  },
  async execute(args) {
    const ALL_REFS = await loadProGameReferenceData();
    const playerArg = typeof args.player === 'string' ? args.player.trim() : '';
    const openingIdArg = typeof args.openingId === 'string' ? norm(args.openingId) : '';
    const proOpeningIdArg = typeof args.proOpeningId === 'string' ? norm(args.proOpeningId) : '';
    const openingNameArg = typeof args.openingName === 'string' ? norm(args.openingName.split(':')[0]) : '';
    const variationArg = typeof args.variation === 'string' ? norm(args.variation) : '';
    const limit = Math.min(Math.max(Number(args.limit) || 6, 1), 12);
    const fullPgn = args.fullPgn !== false;

    // Resolve a player filter: app id directly, or a display-name match.
    let playerId: string | null = null;
    if (playerArg) {
      const n = norm(playerArg);
      if (PLAYER_NAMES[n]) playerId = n;
      else {
        const byName = Object.entries(PLAYER_NAMES).find(([, name]) => norm(name).includes(n) || n.includes(norm(name)));
        playerId = byName ? byName[0] : n; // fall through to raw id match
      }
    }

    let matches = ALL_REFS.filter((g) => !studentLost(g));
    if (playerId) matches = matches.filter((g) => g.playerId === playerId);
    if (proOpeningIdArg) matches = matches.filter((g) => g.proOpeningId === proOpeningIdArg);
    if (openingIdArg) {
      const stem = openingIdArg.replace(/-defen[cs]e$/, '');
      matches = matches.filter((g) => g.openingId === openingIdArg || g.openingId === stem || g.openingId.replace(/-defen[cs]e$/, '') === stem);
    }
    if (!proOpeningIdArg && !openingIdArg && openingNameArg) {
      const stem = openingNameArg.replace(/-defen[cs]e$/, '');
      matches = matches.filter((g) => g.openingId.replace(/-defen[cs]e$/, '') === stem);
    }
    if (variationArg) matches = matches.filter((g) => g.variation.includes(variationArg) || norm(g.variationLabel).includes(variationArg));

    const ranked = [...matches].sort((a, b) => (b.opponentRating ?? 0) - (a.opponentRating ?? 0));
    const picked = ranked.slice(0, limit);

    return {
      ok: true,
      result: {
        totalAvailable: matches.length,
        games: picked.map((g) => {
          const opponent = g.studentSide === 'white' ? g.black : g.white;
          return {
            id: g.id,
            player: PLAYER_NAMES[g.playerId] ?? g.playerId,
            studentSide: g.studentSide,
            opponent,
            opponentRating: g.opponentRating,
            result: g.result,
            date: g.date,
            source: g.source,
            variationLabel: g.variationLabel,
            plyCount: g.plyCount,
            pgn: fullPgn ? g.pgn : g.pgn.split(/\s+/).slice(0, 40).join(' '),
          };
        }),
      },
    };
  },
};
