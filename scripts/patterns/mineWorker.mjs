// One shard of the pattern miner: scans the games it is handed and posts the
// scans back, ten at a time, with their indices, so the main thread can
// checkpoint them and fold them in game order.
import { parentPort, workerData } from 'node:worker_threads';
import { register } from 'tsx/esm/api';

// A worker does not inherit the main thread's tsx loader: register it here so
// the pattern checks (extensionless TypeScript imports) resolve.
register();
const { scanGame } = await import('./mineCore.ts');

const { games, ids } = workerData;
let batch = [];
for (const { index, game } of games) {
  batch.push({ index, scan: scanGame(game, ids) });
  // Posted in batches so the main thread can checkpoint them to disk as they land.
  if (batch.length === 10) { parentPort.postMessage({ type: 'scans', scans: batch }); batch = []; }
}
parentPort.postMessage({ type: 'scans', scans: batch });
parentPort.postMessage({ type: 'done' });
