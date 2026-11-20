/** The board-read worker in a Node `worker_threads` thread, for tests: the
 *  same core (`serveBoardReads`) the browser's worker runs, on a real second
 *  thread with structured clone between them. */
import { parentPort } from 'node:worker_threads';
import { serveBoardReads, type ToWorker } from '../services/boardReadWorkerCore';

const port = parentPort;
if (port) {
  serveBoardReads({
    postMessage: (m) => port.postMessage(m),
    onMessage: (h) => { port.on('message', (m: ToWorker) => h(m)); },
  });
}
