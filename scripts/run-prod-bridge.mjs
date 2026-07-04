/**
 * Standalone prod-bridge runner — starts the local HTTP → prod HTTPS bridge and
 * stays alive so audit scripts can point AUDIT_SMOKE_URL at it and drive the
 * REAL prod bundle (Chromium can't reach prod HTTPS directly through this
 * container's egress proxy — it RESETS). Run backgrounded:
 *   node scripts/run-prod-bridge.mjs &
 */
import { startProdBridge } from './audit-lib/prod-bridge.mjs';

const port = Number(process.env.BRIDGE_PORT ?? 8099);
const bridge = await startProdBridge(port);
console.log(`[bridge] ${bridge.prod} → ${bridge.url}`);
process.on('SIGTERM', () => { void bridge.close().then(() => process.exit(0)); });
process.on('SIGINT', () => { void bridge.close().then(() => process.exit(0)); });
// keep alive
setInterval(() => {}, 1 << 30);
