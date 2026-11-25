/**
 * Remote push notifications on the native iOS app (David 2026-11-25). First
 * use: when David answers a user in the bell's thread (api/messages devReply),
 * that phone gets "New message from David" even with the app closed, and a tap
 * opens the app with the bell open.
 *
 * WHEN WE ASK — the first time the student SENDS David something (a reply in
 * the bell, or in-app feedback). That is the one moment an answer from him is
 * expected, so the iOS prompt arrives with its reason in front of it, and
 * never at first launch. Asked once: a denial is recorded and the app never
 * asks again (iOS would not show the prompt a second time anyway).
 *
 * At every boot, a phone that already said yes (here, or to the review
 * reminders, which share iOS's one notification permission) registers again
 * so a rotated token is refiled. The token is posted only when it changed.
 *
 * Web and PWA: every export is a no-op.
 *
 * PostHog: push_permission {result: granted|denied, trigger}, push_registered
 * {apns_environment, changed}, push_opened {open}.
 */
import { Capacitor } from '@capacitor/core';
import { db } from '../db/schema';
import { captureEvent } from './analytics';
import { getDeviceId, resolveDistributionChannel } from './deviceIdentity';
import { isAuditMarkedPage } from './appAuditor';
import { withWebOrigin } from '../utils/webOrigin';

export const PUSH_PROMPTED_KEY = 'push.prompted';
export const PUSH_TOKEN_KEY = 'push.lastToken';
export const PUSH_REGISTER_API = '/api/push-register';
/** Fired on window when a tap asks for the bell (NotificationBell listens). */
export const OPEN_BELL_EVENT = 'open-notification-bell';
/** Fired on window when a push arrives while the app is open (refresh the bell). */
export const PUSH_RECEIVED_EVENT = 'push-message-received';

export type PushTrigger = 'bell-reply' | 'feedback';

/** Native iOS only — the one platform with an APNs path today. */
export function pushSupported(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && !isAuditMarkedPage();
  } catch {
    return false;
  }
}

/** Xcode-run builds get sandbox tokens; TestFlight and the App Store are
 *  production. The server retries the other host once if this guess is wrong. */
export function apnsEnvironmentFor(distribution: string): 'production' | 'sandbox' {
  return distribution === 'development' ? 'sandbox' : 'production';
}

async function readMeta(key: string): Promise<string | null> {
  try {
    const row = await db.meta.get(key);
    return typeof row?.value === 'string' ? row.value : null;
  } catch {
    return null;
  }
}
async function writeMeta(key: string, value: string): Promise<void> {
  try { await db.meta.put({ key, value }); } catch { /* best-effort */ }
}

// A tap can land before any bell has mounted (a cold launch from the
// notification). The request waits here until a visible bell takes it.
let pendingBellOpen = false;

/** A bell that is on screen claims the pending open. True once per tap. */
export function takePendingBellOpen(): boolean {
  if (!pendingBellOpen) return false;
  pendingBellOpen = false;
  return true;
}

export function requestBellOpen(): void {
  pendingBellOpen = true;
  try { window.dispatchEvent(new CustomEvent(OPEN_BELL_EVENT)); } catch { /* no window */ }
}

/** File the token with the server, only when it is new for this phone. */
export async function postToken(token: string): Promise<void> {
  const last = await readMeta(PUSH_TOKEN_KEY);
  const environment = apnsEnvironmentFor(await resolveDistributionChannel());
  const changed = last !== token;
  if (!changed) return;
  try {
    const device = await getDeviceId();
    const res = await fetch(withWebOrigin(PUSH_REGISTER_API), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ device, token, environment, platform: 'ios' }),
    });
    if (!res.ok) return;
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
    if (data.ok === false) return;
    await writeMeta(PUSH_TOKEN_KEY, token);
    captureEvent('push_registered', { apns_environment: environment, changed });
  } catch { /* the next boot tries again */ }
}

let listening = false;

async function addListeners(): Promise<void> {
  if (listening) return;
  listening = true;
  const { PushNotifications } = await import('@capacitor/push-notifications');
  await PushNotifications.addListener('registration', (t) => { void postToken(t.value); });
  await PushNotifications.addListener('registrationError', (e) => {
    console.warn('[push] registration failed', e.error);
  });
  await PushNotifications.addListener('pushNotificationReceived', () => {
    try { window.dispatchEvent(new CustomEvent(PUSH_RECEIVED_EVENT)); } catch { /* no window */ }
  });
  await PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
    const data = a.notification.data as Record<string, unknown> | undefined;
    const open = typeof data?.open === 'string' ? data.open : 'bell';
    captureEvent('push_opened', { open });
    if (open === 'bell') requestBellOpen();
  });
}

/**
 * Boot: listen for taps, and re-register a phone that already granted
 * permission so its token stays current. Never prompts.
 */
export async function startPush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    await addListeners();
    const { PushNotifications } = await import('@capacitor/push-notifications');
    if ((await PushNotifications.checkPermissions()).receive === 'granted') await PushNotifications.register();
  } catch (e) {
    console.warn('[push] start failed', e);
  }
}

/**
 * The one ask. Called when the student sends David something. Prompts at most
 * once per install; a phone that already granted is simply registered.
 */
export async function askForPushOnce(trigger: PushTrigger): Promise<void> {
  if (!pushSupported()) return;
  try {
    await addListeners();
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const status = (await PushNotifications.checkPermissions()).receive;
    if (status === 'granted') { await PushNotifications.register(); return; }
    if ((await readMeta(PUSH_PROMPTED_KEY)) !== null) return;
    if (status === 'denied') {
      await writeMeta(PUSH_PROMPTED_KEY, 'denied');
      captureEvent('push_permission', { result: 'denied', trigger, prompted: false });
      return;
    }
    await writeMeta(PUSH_PROMPTED_KEY, 'asked');
    const result = (await PushNotifications.requestPermissions()).receive;
    const granted = result === 'granted';
    await writeMeta(PUSH_PROMPTED_KEY, granted ? 'granted' : 'denied');
    captureEvent('push_permission', { result: granted ? 'granted' : 'denied', trigger, prompted: true });
    if (granted) await PushNotifications.register();
    else console.info('[push] permission denied — not asking again');
  } catch (e) {
    console.warn('[push] ask failed', e);
  }
}

/** Test seam. */
export function resetPushForTests(): void {
  listening = false;
  pendingBellOpen = false;
}
