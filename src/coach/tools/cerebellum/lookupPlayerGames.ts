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
import modelGamesData from '../../../data/model-games.json';
import { loadProGameReferenceData } from '../../../services/proGameReferenceData';
import type { Tool } from '../../types';
import type { ProGameReference, ModelGame } from '../../../types';

const PLAYER_NAMES: Record<string, string> = Object.fromEntries(
  (proRepertoireData as { players: { id: string; name: string }[] }).players.map((p) => [p.id, p.name]),
);

const ALL_MODEL_GAMES = modelGamesData as unknown as ModelGame[];

function studentLost(g: ProGameReference): boolean {
  return (g.studentSide === 'white' && g.result === '0-1') ||
         (g.studentSide === 'black' && g.result === '1-0');
}

function modelStudentLost(g: ModelGame): boolean {
  return (g.studentSide === 'white' && g.result === '0-1') ||
         (g.studentSide === 'black' && g.result === '1-0');
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Collapse an opening id/name to a comparison stem: drop the trailing
 *  -opening / -defense / -defence / -game / -system so "catalan",
 *  "catalan-opening" and "Catalan Opening" all reduce to "catalan". */
function openingStem(s: string): string {
  return norm(s).replace(/-(opening|defense|defence|game|system|variation|attack)$/g, '');
}

/** The tool's return-game shape, shared by the reference set and the
 *  model-game fallback. */
interface PlayerGameResult {
  id: string;
  player: string;
  studentSide: 'white' | 'black';
  opponent: string;
  opponentRating: number | null;
  result: string;
  date: string | null;
  source: string;
  variationLabel: string;
  plyCount: number;
  pgn: string;
}

/** Fallback breadth source: when the bundled reference set has no game
 *  for the ask (e.g. `pro-game-references.json` doesn't carry this pro/
 *  opening yet), pull from the curated `model-games.json` so the coach
 *  still surfaces a REAL game instead of "no game found" (David
 *  2026-06-11: "Show me a Magnus Catalan" → coach wrongly said none).
 *  Filters by opening stem + (optional) player name against the
 *  student's side. */
function modelGameFallback(args: {
  playerArg: string;
  openingStemArg: string;
  limit: number;
  fullPgn: boolean;
}): PlayerGameResult[] {
  const { playerArg, openingStemArg, limit, fullPgn } = args;
  // Require at least one of opening / player so we never dump the whole
  // corpus on an unfiltered call.
  if (!openingStemArg && !playerArg) return [];
  const playerNorm = playerArg ? norm(playerArg) : '';

  const matches = ALL_MODEL_GAMES.filter((g) => {
    if (modelStudentLost(g)) return false;
    if (openingStemArg) {
      const gStem = openingStem(g.openingId);
      if (gStem !== openingStemArg && !gStem.includes(openingStemArg) && !openingStemArg.includes(gStem)) {
        return false;
      }
    }
    if (playerNorm) {
      const studentName = norm(g.studentSide === 'white' ? g.white : g.black);
      if (!studentName.includes(playerNorm) && !playerNorm.includes(studentName)) return false;
    }
    return true;
  });

  const ranked = [...matches].sort((a, b) => {
    const aMax = Math.max(a.whiteElo ?? 0, a.blackElo ?? 0);
    const bMax = Math.max(b.whiteElo ?? 0, b.blackElo ?? 0);
    return bMax - aMax;
  });

  return ranked.slice(0, limit).map((g) => {
    const side = g.studentSide ?? 'white';
    const player = side === 'white' ? g.white : g.black;
    const opponent = side === 'white' ? g.black : g.white;
    const opponentRating = side === 'white' ? (g.blackElo ?? null) : (g.whiteElo ?? null);
    const plies = g.pgn.split(/\s+/).filter(Boolean);
    return {
      id: g.id,
      player,
      studentSide: side,
      opponent,
      opponentRating,
      result: g.result,
      date: g.year != null ? String(g.year) : null,
      source: 'model-game',
      variationLabel: g.event ?? '',
      plyCount: plies.length,
      pgn: fullPgn ? g.pgn : plies.slice(0, 40).join(' '),
    };
  });
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
    if (proOpeningIdArg) {
      matches = matches.filter((g) => g.proOpeningId === proOpeningIdArg);
    } else if (openingIdArg || openingNameArg) {
      // Soft opening match. The build buckets each game by the player's
      // REPERTOIRE TREE (openingId), stashing the ACTUAL opening played
      // in variationLabel — e.g. Carlsen's 7 Catalan wins are tagged
      // openingId "queens-pawn", variationLabel "Catalan g3". So match
      // the stem against BOTH the openingId AND the variation label/slug,
      // or the opening is invisible (David 2026-06-11 Magnus-Catalan
      // bug: "magnus has played the catalan!! we have several").
      // A "vs <Opening>" variationLabel means the player FACED that
      // opening (their own repertoire was something else), so exclude it
      // from a "show me his <Opening>" ask — they want him WIELDING it.
      const stem = openingStem(openingIdArg || openingNameArg);
      matches = matches.filter((g) => {
        if (openingStem(g.openingId) === stem) return true;
        const facing = /^vs\b/i.test(g.variationLabel.trim());
        if (facing) return false;
        return norm(g.variationLabel).includes(stem) ||
               (g.variation ? norm(g.variation).includes(stem) : false);
      });
    }
    if (variationArg) matches = matches.filter((g) => g.variation.includes(variationArg) || norm(g.variationLabel).includes(variationArg));

    const ranked = [...matches].sort((a, b) => (b.opponentRating ?? 0) - (a.opponentRating ?? 0));
    const picked: PlayerGameResult[] = ranked.slice(0, limit).map((g) => {
      const opponent = g.studentSide === 'white' ? g.black : g.white;
      return {
        id: g.id,
        player: PLAYER_NAMES[g.playerId] ?? g.playerId,
        studentSide: g.studentSide,
        opponent,
        opponentRating: g.opponentRating ?? null,
        result: g.result,
        date: g.date ?? null,
        source: g.source,
        variationLabel: g.variationLabel,
        plyCount: g.plyCount,
        pgn: fullPgn ? g.pgn : g.pgn.split(/\s+/).slice(0, 40).join(' '),
      };
    });

    // BREADTH FALLBACK: the reference set had nothing — pull a real game
    // from the curated model-games corpus so the coach never falsely says
    // "no game" when one is shipped (David 2026-06-11 Magnus-Catalan bug).
    if (picked.length === 0) {
      const openingStemArg =
        proOpeningIdArg ? openingStem(proOpeningIdArg.replace(/^pro-[a-z]+-/, ''))
        : openingIdArg ? openingStem(openingIdArg)
        : openingNameArg ? openingStem(openingNameArg)
        : '';
      const fallback = modelGameFallback({ playerArg, openingStemArg, limit, fullPgn });
      if (fallback.length > 0) {
        return { ok: true, result: { totalAvailable: fallback.length, games: fallback } };
      }
    }

    return {
      ok: true,
      result: {
        totalAvailable: matches.length,
        games: picked,
      },
    };
  },
};
