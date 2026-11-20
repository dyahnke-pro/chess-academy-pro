/** The board-read worker (`boardReadWorkerCore`): `self` is its port. */
import { serveBoardReads, type ToWorker, type FromWorker } from './boardReadWorkerCore';

interface WorkerScope {
  postMessage(msg: FromWorker): void;
  onmessage: ((e: MessageEvent<ToWorker>) => void) | null;
}

const scope = self as unknown as WorkerScope;
serveBoardReads({
  postMessage: (msg) => scope.postMessage(msg),
  onMessage: (handler) => { scope.onmessage = (e) => handler(e.data); },
});
