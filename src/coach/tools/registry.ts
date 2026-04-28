/**
 * Tool registry — exports the full 21-tool toolbelt the spine
 * dispatches. Ten cerebellum (read-only deterministic), eleven
 * cerebrum (decisions / side effects). See COACH-BRAIN-00 §"The
 * Cerebellum" and §"The Cerebrum Toolbelt".
 *
 * Spine wires these as (post WO-COACH-OPERATOR-FOUNDATION-01):
 *   FULLY IMPLEMENTED — stockfish_eval, stockfish_classify_move,
 *     lichess_opening_lookup, lichess_master_games,
 *     lichess_cloud_eval, lichess_tablebase_lookup,
 *     legal_moves_for_piece, material_count,
 *     local_opening_book, navigate_to_route, play_move,
 *     take_back_move, set_board_position, reset_board,
 *     set_intended_opening, clear_memory, record_hint_request,
 *     record_blunder
 *   PUNTED w/ flag    — lichess_puzzle_fetch (no theme API)
 *   STUBBED until WO  — speak (BRAIN-05), request_hint_tier (BRAIN-05)
 */
import type { Tool, ToolDefinition } from '../types';

import { stockfishEvalTool } from './cerebellum/stockfishEval';
import { stockfishClassifyMoveTool } from './cerebellum/stockfishClassifyMove';
import { lichessOpeningLookupTool } from './cerebellum/lichessOpeningLookup';
import { lichessMasterGamesTool } from './cerebellum/lichessMasterGames';
import { lichessPuzzleFetchTool } from './cerebellum/lichessPuzzleFetch';
import { lichessCloudEvalTool } from './cerebellum/lichessCloudEval';
import { lichessTablebaseLookupTool } from './cerebellum/lichessTablebaseLookup';
import { legalMovesForPieceTool } from './cerebellum/legalMovesForPiece';
import { materialCountTool } from './cerebellum/materialCount';
import { localOpeningBookTool } from './cerebellum/localOpeningBook';

import { navigateToRouteTool } from './cerebrum/navigateToRoute';
import { setIntendedOpeningTool } from './cerebrum/setIntendedOpening';
import { clearMemoryTool } from './cerebrum/clearMemory';
import { playMoveTool } from './cerebrum/playMove';
import { takeBackMoveTool } from './cerebrum/takeBackMove';
import { setBoardPositionTool } from './cerebrum/setBoardPosition';
import { resetBoardTool } from './cerebrum/resetBoard';
import { speakTool } from './cerebrum/speak';
import { requestHintTierTool } from './cerebrum/requestHintTier';
import { recordHintRequestTool } from './cerebrum/recordHintRequest';
import { recordBlunderTool } from './cerebrum/recordBlunder';

/** Registered tools, ordered as in COACH-BRAIN-00. */
export const COACH_TOOLS: Tool[] = [
  // Cerebellum
  stockfishEvalTool,
  stockfishClassifyMoveTool,
  lichessOpeningLookupTool,
  lichessMasterGamesTool,
  lichessPuzzleFetchTool,
  lichessCloudEvalTool,
  lichessTablebaseLookupTool,
  legalMovesForPieceTool,
  materialCountTool,
  localOpeningBookTool,
  // Cerebrum
  navigateToRouteTool,
  setIntendedOpeningTool,
  clearMemoryTool,
  playMoveTool,
  takeBackMoveTool,
  setBoardPositionTool,
  resetBoardTool,
  speakTool,
  requestHintTierTool,
  recordHintRequestTool,
  recordBlunderTool,
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
