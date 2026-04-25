/**
 * Tool registry — exports the full 14-tool toolbelt the spine
 * dispatches. Six cerebellum (read-only deterministic), eight
 * cerebrum (decisions / side effects). See COACH-BRAIN-00 §"The
 * Cerebellum" and §"The Cerebrum Toolbelt".
 *
 * Spine wires these as (post WO-BRAIN-04 + tightening):
 *   FULLY IMPLEMENTED — stockfish_eval, stockfish_classify_move,
 *     lichess_opening_lookup, lichess_master_games,
 *     local_opening_book, navigate_to_route, play_move,
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
import { localOpeningBookTool } from './cerebellum/localOpeningBook';

import { navigateToRouteTool } from './cerebrum/navigateToRoute';
import { setIntendedOpeningTool } from './cerebrum/setIntendedOpening';
import { clearMemoryTool } from './cerebrum/clearMemory';
import { playMoveTool } from './cerebrum/playMove';
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
  localOpeningBookTool,
  // Cerebrum
  navigateToRouteTool,
  setIntendedOpeningTool,
  clearMemoryTool,
  playMoveTool,
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
 *  envelope — the LLM only needs the contract, not the dispatcher. */
export function getToolDefinitions(): ToolDefinition[] {
  return COACH_TOOLS.map(({ category: _category, execute: _execute, ...def }) => def);
}
