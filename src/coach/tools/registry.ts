/**
 * Tool registry — exports the toolbelt the spine dispatches.
 * Cerebellum (read-only deterministic fact-fetch) + cerebrum
 * (decisions / side effects). See COACH-BRAIN-00 §"The Cerebellum"
 * and §"The Cerebrum Toolbelt".
 *
 * Three dead tools were removed (2026-06-10): `speak` and
 * `request_hint_tier` were never-implemented BRAIN-05 stubs (returned
 * `{ stub: true }` with no effect — narration goes through
 * `voiceService`, hints through the hint system), and
 * `lichess_puzzle_fetch` was punted (no theme API; the local
 * `puzzles.json` already serves themed puzzles). Cutting them also
 * drops three tool schemas from every agentic-turn prompt.
 *
 * Spine wires these as (post WO-COACH-LICHESS-OPENINGS):
 *   FULLY IMPLEMENTED — stockfish_eval, stockfish_classify_move,
 *     lichess_opening_lookup, lichess_master_games,
 *     lichess_game_export, local_opening_book, lookup_player_games,
 *     lookup_player_opening_moves, navigate_to_route,
 *     play_move, take_back_move, set_board_position, reset_board,
 *     set_intended_opening, clear_memory, record_hint_request,
 *     record_blunder, quiz_user_for_move,
 *     start_walkthrough_for_opening
 */
import type { Tool, ToolDefinition } from '../types';

import { stockfishEvalTool } from './cerebellum/stockfishEval';
import { stockfishClassifyMoveTool } from './cerebellum/stockfishClassifyMove';
import { lichessOpeningLookupTool } from './cerebellum/lichessOpeningLookup';
import { lichessMasterGamesTool } from './cerebellum/lichessMasterGames';
import { lichessGameExportTool } from './cerebellum/lichessGameExport';
import { localOpeningBookTool } from './cerebellum/localOpeningBook';
import { lookupPlayerGamesTool } from './cerebellum/lookupPlayerGames';
import { lookupPlayerOpeningMovesTool } from './cerebellum/lookupPlayerOpeningMoves';

import { navigateToRouteTool } from './cerebrum/navigateToRoute';
import { setIntendedOpeningTool } from './cerebrum/setIntendedOpening';
import { favoriteOpeningTool } from './cerebrum/favoriteOpening';
import { saveOpeningToRepertoireTool } from './cerebrum/saveOpeningToRepertoire';
import { clearMemoryTool } from './cerebrum/clearMemory';
import { playMoveTool } from './cerebrum/playMove';
import { takeBackMoveTool } from './cerebrum/takeBackMove';
import { setBoardPositionTool } from './cerebrum/setBoardPosition';
import { savePositionTool } from './cerebrum/savePosition';
import { restoreSavedPositionTool } from './cerebrum/restoreSavedPosition';
import { resetBoardTool } from './cerebrum/resetBoard';
import { recordHintRequestTool } from './cerebrum/recordHintRequest';
import { recordBlunderTool } from './cerebrum/recordBlunder';
import { quizUserForMoveTool } from './cerebrum/quizUserForMove';
import { startWalkthroughForOpeningTool } from './cerebrum/startWalkthroughForOpening';

/** Registered tools, ordered as in COACH-BRAIN-00. */
export const COACH_TOOLS: Tool[] = [
  // Cerebellum
  stockfishEvalTool,
  stockfishClassifyMoveTool,
  lichessOpeningLookupTool,
  lichessMasterGamesTool,
  lichessGameExportTool,
  localOpeningBookTool,
  lookupPlayerGamesTool,
  lookupPlayerOpeningMovesTool,
  // Cerebrum
  navigateToRouteTool,
  setIntendedOpeningTool,
  favoriteOpeningTool,
  saveOpeningToRepertoireTool,
  clearMemoryTool,
  playMoveTool,
  takeBackMoveTool,
  setBoardPositionTool,
  savePositionTool,
  restoreSavedPositionTool,
  resetBoardTool,
  recordHintRequestTool,
  recordBlunderTool,
  quizUserForMoveTool,
  startWalkthroughForOpeningTool,
];

const TOOL_INDEX: Map<string, Tool> = new Map(COACH_TOOLS.map((t) => [t.name, t]));

export function getTool(name: string): Tool | undefined {
  return TOOL_INDEX.get(name);
}

/** Strip executors so the toolbelt can be safely embedded in the
 *  envelope — the LLM only needs the contract, not the dispatcher.
 *  WO-COACH-RESILIENCE: optional `exclude` filter lets the spine ship
 *  a reduced toolbelt during fallback retries (e.g. drop
 *  `stockfish_eval` when the engine is hung so the LLM stops
 *  blocking on the tool). */
export function getToolDefinitions(opts?: { exclude?: readonly string[] }): ToolDefinition[] {
  const exclude = opts?.exclude;
  if (!exclude || exclude.length === 0) {
    return COACH_TOOLS.map(({ category: _category, execute: _execute, ...def }) => def);
  }
  const excludeSet = new Set(exclude);
  return COACH_TOOLS
    .filter((t) => !excludeSet.has(t.name))
    .map(({ category: _category, execute: _execute, ...def }) => def);
}
