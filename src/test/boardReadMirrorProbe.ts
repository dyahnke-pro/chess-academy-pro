/** A second thread that takes a page's data mirror (`boardReadData`) and
 *  reports what its own lookups then answer — the mirror's test. */
import { parentPort } from 'node:worker_threads';
import { applyMirror, type DataMirror } from '../services/boardReadData';
import { masterMovesCachedSync } from '../services/masterPlayLookup';

const port = parentPort;
if (port) {
  port.on('message', (m: { mirror: DataMirror; ask: string[] }) => {
    void applyMirror(m.mirror).then(() => port.postMessage(m.ask.map((f) => masterMovesCachedSync(f))));
  });
}
