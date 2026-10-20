/**
 * freeTierSync — mirrors the free allowance to the server under the install's
 * Keychain id, so a delete-and-reinstall cannot reset it (David 2026-10-18).
 *
 * Boot: read the server's ledger and fold it into the local row, forward only
 * (freeTierService.mergeServerLedger). Every local write after that sends the
 * row back (debounced), and the server merges forward too, so neither side can
 * ever hand allowance back. Native only: the web app is free and never walls.
 * Every failure is silent — the local row always still works.
 */
import { Capacitor } from '@capacitor/core';
import { getDeviceId } from './deviceIdentity';
import { isAuditMarkedPage } from './appAuditor';
import { loadFreeTier, mergeServerLedger, onFreeTierWritten, toServerLedger, type ServerLedger } from './freeTierService';
import { withWebOrigin } from '../utils/webOrigin';

const API = '/api/free-tier';
const PUSH_DEBOUNCE_MS = 1500;

function notifyLedgerChanged(): void {
  try { window.dispatchEvent(new CustomEvent('free-tier-updated')); } catch { /* no window */ }
}

function isServerLedger(v: unknown): v is ServerLedger {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.puzzlesSolved === 'number' && typeof o.coachSpendUsd === 'number' && Array.isArray(o.freeOpeningIds);
}

/** Read the server's ledger for this install and fold it in. Returns whether
 *  anything was learned. */
async function pullFreeTier(): Promise<boolean> {
  try {
    const device = await getDeviceId();
    const res = await fetch(withWebOrigin(`${API}?device=${encodeURIComponent(device)}&cb=${Date.now()}`), { cache: 'no-store' });
    if (!res.ok) return false;
    const data = (await res.json()) as { ledger?: unknown };
    if (!isServerLedger(data.ledger)) return false;
    await mergeServerLedger(data.ledger);
    notifyLedgerChanged();
    return true;
  } catch {
    return false;
  }
}

/** Send this install's current ledger. */
async function pushFreeTier(): Promise<boolean> {
  try {
    const device = await getDeviceId();
    const ledger = toServerLedger(await loadFreeTier());
    const res = await fetch(withWebOrigin(API), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ device, ledger }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

let started = false;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Start the mirror once per boot: pull first, then push on every write. */
export async function startFreeTierSync(opts: { native?: boolean } = {}): Promise<void> {
  const native = opts.native ?? Capacitor.isNativePlatform();
  if (started || !native || isAuditMarkedPage()) return;
  started = true;
  await pullFreeTier();
  onFreeTierWritten(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; void pushFreeTier(); }, PUSH_DEBOUNCE_MS);
  });
  // The pull may have found nothing (a first install); send the local row so
  // the server holds it from the start.
  await pushFreeTier();
}

/** Test seam. */
export function resetFreeTierSyncForTest(): void {
  started = false;
  if (timer) clearTimeout(timer);
  timer = null;
}
