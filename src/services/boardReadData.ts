/**
 * THE DATA A BOARD READ LOOKS UP, MIRRORED INTO THE BOARD-READ WORKER
 * (`boardReadOffThread`, 2026-11-19).
 *
 * A few computers on the read look things up synchronously in data the app
 * loads at run time — the masters' moves (`masterMovesCachedSync`: the live
 * answers in memory, then the local masters file), the opening positions, the
 * opening identity facts, the club gems index (`knownSlipIndexNow`) and the
 * strong player's games (`lookupHisPlaySync`). A worker has its own copy of
 * every module, so without this it would read them cold and say less than
 * the main thread would. Before each read the page sends:
 *  - which data FILES it has in memory: the worker loads the same file by the
 *    same loader and waits for it before reading (`DATA_FILES`, a `Record`, so
 *    a new file fails to compile here until it says how it loads);
 *  - the live masters answers it holds that the worker has not been sent.
 * A file the worker's own computers start loading (each loader warms itself
 * on first use, as it did on the main thread) loads there as it did here.
 */
import { masterPlayCache } from './masterPlayCache';
import type { MasterPlayResult } from './masterPlayTypes';
import { mastersDbLoaded, ensureMastersDbLoaded, confirmedEmptyPositions, addConfirmedEmpty } from './masterPlayLookup';
import { openingPositionsLoaded, loadOpeningPositions } from './openingPositions';
import { openingIdentityLoaded, loadOpeningIdentity } from './openingIdentity';
import { knownSlipIndexLoaded, loadKnownSlipIndex } from './knownSlips';
import { hisPlayDbLoaded, getHisPlayDb } from './hisPlayLookup';

export type BoardReadDataFile = 'mastersDb' | 'openingPositions' | 'openingIdentity' | 'knownSlips' | 'hisPlay';

export const DATA_FILES: Record<BoardReadDataFile, { loaded: () => boolean; load: () => Promise<unknown> }> = {
  mastersDb: { loaded: mastersDbLoaded, load: ensureMastersDbLoaded },
  openingPositions: { loaded: openingPositionsLoaded, load: loadOpeningPositions },
  openingIdentity: { loaded: openingIdentityLoaded, load: loadOpeningIdentity },
  knownSlips: { loaded: knownSlipIndexLoaded, load: loadKnownSlipIndex },
  hisPlay: { loaded: hisPlayDbLoaded, load: getHisPlayDb },
};
const FILE_IDS = Object.keys(DATA_FILES) as BoardReadDataFile[];

/** What the page sends the worker before a read. */
export interface DataMirror {
  files: BoardReadDataFile[];
  masters: Array<[string, MasterPlayResult]>;
  emptyPositions: string[];
}

/** The page's side: what it holds now that it has not sent before. */
export function createMirrorSender(): () => DataMirror {
  const sent = new Map<string, MasterPlayResult>();
  const sentEmpty = new Set<string>();
  return () => {
    const masters: Array<[string, MasterPlayResult]> = [];
    for (const [k, v] of masterPlayCache.resolved()) {
      if (sent.get(k) !== v) { sent.set(k, v); masters.push([k, v]); }
    }
    const emptyPositions = confirmedEmptyPositions().filter((k) => !sentEmpty.has(k));
    for (const k of emptyPositions) sentEmpty.add(k);
    return { files: FILE_IDS.filter((id) => DATA_FILES[id].loaded()), masters, emptyPositions };
  };
}

/** The worker's side: take the page's data in, and resolve once every file
 *  the page holds is in memory here too (a file that cannot be had resolves
 *  as it would have on the page: the lookup reads nothing). */
export async function applyMirror(m: DataMirror): Promise<void> {
  for (const [k, v] of m.masters) masterPlayCache.set(k, v);
  addConfirmedEmpty(m.emptyPositions);
  await Promise.all(m.files.filter((id) => !DATA_FILES[id].loaded()).map((id) => DATA_FILES[id].load().catch(() => null)));
}
