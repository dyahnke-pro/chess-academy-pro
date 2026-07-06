/**
 * bucketAuditBridge
 * -----------------
 * Exposes the bucket-pipeline audit engine on `window.__bucketAudit` so
 * `scripts/audit-bucket-delivery-loop.mjs` can run the SAME invariant checker
 * the unit gate uses against the LIVE app's Dexie state (via `page.evaluate`),
 * without needing the source-file paths Vite bundles away in production.
 *
 * Side-effect import (mirrors masterPlayAuditBridge). Gated on localStorage's
 * `auditStreamUrl` being set — the default for every real user is unset, so
 * the bridge is a no-op in normal use. The audit script sets that key via
 * `addInitScript` before load, activating the bridge only during audit runs.
 * The exposed surface is a single read-only function; it grants no capability
 * beyond reading the user's own local weakness stores.
 */

import { auditBucketPipeline } from './bucketPipelineAudit';

declare global {
  interface Window {
    __bucketAudit?: {
      auditBucketPipeline: typeof auditBucketPipeline;
    };
  }
}

function installBridge(): void {
  if (typeof window === 'undefined') return;
  try {
    if (!window.localStorage.getItem('auditStreamUrl')) return;
  } catch {
    return;
  }
  window.__bucketAudit = { auditBucketPipeline };
}

installBridge();
