/**
 * Tool registry — exports the full 13-tool toolbelt the spine
 * dispatches. Five cerebellum (read-only deterministic), eight
 * cerebrum (decisions / side effects). See COACH-BRAIN-00 §"The
 * Cerebellum" and §"The Cerebrum Toolbelt".
 *
 * Spine v1 wires these as:
 *   FULLY IMPLEMENTED — stockfish_eval, stockfish_classify_move,
 *     lichess_opening_lookup, lichess_master_games,
 *     set_intended_opening, clear_memory, record_hint_request,
 *     record_blunder
 *   PUNTED w/ flag    — lichess_puzzle_fetch (no theme API)
 *   STUBBED until WO  — navigate_to_route (BRAIN-03),
 *     play_move (BRAIN-04), speak (BRAIN-05),
 *     request_hint_tier (BRAIN-05)
 */
import type { Tool, ToolDefinition } from '../types';

import { stockfishEvalTool } from './cerebellum/stockfishEval';
import { stockfishClassifyMoveTool } from './cerebellum/stockfishClassifyMove';
import { lichessOpeningLookupTool } from './cerebellum/lichessOpeningLookup';
import { lichessMasterGamesTool } from './cerebellum/lichessMasterGames';
import { lichessPuzzleFetchTool } from './cerebellum/lichessPuzzleFetch';

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
