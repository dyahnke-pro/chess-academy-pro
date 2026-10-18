/**
 * /api/free-tier — the free allowance, remembered past a reinstall (David
 * 2026-10-18: "there might not ever be revenue if ppl just keep reinstalling").
 *
 * The free tier ($1 of coach, 20 puzzles, the free opening) lives in the app's
 * own database, which a delete-and-reinstall wipes. The phone's install id now
 * lives in the iOS Keychain (installAnchor), which survives the reinstall, so
 * the ledger is mirrored here under that id: the app sends its row after every
 * change and reads it back on boot.
 *
 * The server only ever moves a ledger FORWARD (mergeLedger): counters take the
 * larger value, claimed openings are a union, the kid window keeps its earliest
 * start. So a fresh install posting zeros cannot reset anything. One GET per
 * boot, one GET+SET per change; audit traffic never reaches Redis.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuditTraffic } from './_lib/auditTraffic.js';

/** The fields the server keeps. Everything else on the row stays local. */
export interface Ledger {
  puzzlesSolved: number;
  coachSpendUsd: number;
  coachLessonsUsed: number;
  coachChatTurnsUsed: number;
  freeOpeningIds: string[];
  trainingOpeningCredits: number;
  kidFirstAccessAt: number | null;
}

export const EMPTY_LEDGER: Ledger = {
  puzzlesSolved: 0,
  coachSpendUsd: 0,
  coachLessonsUsed: 0,
  coachChatTurnsUsed: 0,
  freeOpeningIds: [],
  trainingOpeningCredits: 0,
  kidFirstAccessAt: null,
};

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
const ids = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && /^[A-Za-z0-9_:.-]{1,80}$/.test(x)).slice(0, 200) : [];
const when = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

/** Read any input as a ledger, dropping what does not fit. */
export function toLedger(v: unknown): Ledger {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return {
    puzzlesSolved: num(o.puzzlesSolved),
    coachSpendUsd: num(o.coachSpendUsd),
    coachLessonsUsed: num(o.coachLessonsUsed),
    coachChatTurnsUsed: num(o.coachChatTurnsUsed),
    freeOpeningIds: ids(o.freeOpeningIds),
    trainingOpeningCredits: num(o.trainingOpeningCredits),
    kidFirstAccessAt: when(o.kidFirstAccessAt),
  };
}

/** Forward-only merge: nothing a later write sends can undo usage already spent. */
export function mergeLedger(a: Ledger, b: Ledger): Ledger {
  const kid = [a.kidFirstAccessAt, b.kidFirstAccessAt].filter((x): x is number => x !== null);
  return {
    puzzlesSolved: Math.max(a.puzzlesSolved, b.puzzlesSolved),
    coachSpendUsd: Math.max(a.coachSpendUsd, b.coachSpendUsd),
    coachLessonsUsed: Math.max(a.coachLessonsUsed, b.coachLessonsUsed),
    coachChatTurnsUsed: Math.max(a.coachChatTurnsUsed, b.coachChatTurnsUsed),
    freeOpeningIds: [...new Set([...a.freeOpeningIds, ...b.freeOpeningIds])],
    trainingOpeningCredits: Math.max(a.trainingOpeningCredits, b.trainingOpeningCredits),
    kidFirstAccessAt: kid.length ? Math.min(...kid) : null,
  };
}

const KEY = (device: string): string => `ft:${device}`;

/** The install id is caller-supplied; keep it to a safe key shape. */
export function safeDevice(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const d = s.trim();
  return /^[A-Za-z0-9_-]{6,64}$/.test(d) ? d : null;
}

interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, val: string): Promise<void>;
}

const mem = new Map<string, string>();
function memStore(): Store {
  return {
    async get(k) { return mem.has(k) ? mem.get(k)! : null; },
    async set(k, v) { mem.set(k, v); },
  };
}

async function getStore(): Promise<Store> {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? null;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? null;
  if (!url || !token) return memStore();
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url, token, automaticDeserialization: false });
    return {
      async get(k) { const v = await redis.get<string>(k); return v == null ? null : String(v); },
      async set(k, v) { await redis.set(k, v); },
    };
  } catch {
    return memStore();
  }
}

async function readLedger(store: Store, device: string): Promise<Ledger> {
  const raw = await store.get(KEY(device));
  if (!raw) return { ...EMPTY_LEDGER };
  try { return toLedger(JSON.parse(raw)); } catch { return { ...EMPTY_LEDGER }; }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-audit-marked');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // Audit traffic never touches Redis (auditTraffic.ts).
  if (isAuditTraffic(req.headers)) {
    res.status(200).json({ ledger: null, refused: 'audit' });
    return;
  }

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
  const device = safeDevice(req.method === 'GET' ? req.query?.device : body.device);
  if (!device) { res.status(400).json({ error: 'device' }); return; }

  try {
    const store = await getStore();
    const stored = await readLedger(store, device);
    if (req.method === 'GET') { res.status(200).json({ ledger: stored }); return; }
    if (req.method !== 'POST') { res.status(405).end(); return; }
    const merged = mergeLedger(stored, toLedger(body.ledger));
    if (JSON.stringify(merged) !== JSON.stringify(stored)) await store.set(KEY(device), JSON.stringify(merged));
    res.status(200).json({ ledger: merged });
  } catch {
    // The store being down must never break the app: the client keeps its own row.
    res.status(200).json({ ledger: null, degraded: true });
  }
}
