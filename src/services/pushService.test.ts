import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';

const native = { value: false };
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native.value, getPlatform: () => (native.value ? 'ios' : 'web') },
}));

const listeners = new Map<string, (x: unknown) => void>();
const perm = { receive: 'prompt' as string, answer: 'granted' as string };
const PushNotifications = {
  addListener: vi.fn(async (name: string, fn: (x: unknown) => void) => { listeners.set(name, fn); return { remove: async () => {} }; }),
  checkPermissions: vi.fn(async () => ({ receive: perm.receive })),
  requestPermissions: vi.fn(async () => { perm.receive = perm.answer; return { receive: perm.answer }; }),
  register: vi.fn(async () => {}),
};
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications }));

const captured: [string, Record<string, unknown> | undefined][] = [];
vi.mock('./analytics', () => ({ captureEvent: (n: string, p?: Record<string, unknown>) => { captured.push([n, p]); } }));
vi.mock('./deviceIdentity', () => ({
  getDeviceId: async () => 'dev-test-0001',
  resolveDistributionChannel: async () => 'appstore',
}));

import {
  startPush, askForPushOnce, apnsEnvironmentFor, postToken, takePendingBellOpen,
  resetPushForTests, OPEN_BELL_EVENT, PUSH_PROMPTED_KEY,
} from './pushService';

describe('pushService', () => {
  beforeEach(async () => {
    native.value = false;
    perm.receive = 'prompt'; perm.answer = 'granted';
    listeners.clear(); captured.length = 0;
    Object.values(PushNotifications).forEach((f) => f.mockClear());
    resetPushForTests();
    await db.meta.clear();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })));
  });

  it('is a no-op on the web: no plugin call, no prompt', async () => {
    await startPush();
    await askForPushOnce('bell-reply');
    expect(PushNotifications.addListener).not.toHaveBeenCalled();
    expect(PushNotifications.requestPermissions).not.toHaveBeenCalled();
    expect(PushNotifications.register).not.toHaveBeenCalled();
  });

  it('boot never prompts; it registers only a phone that already said yes', async () => {
    native.value = true;
    await startPush();
    expect(PushNotifications.requestPermissions).not.toHaveBeenCalled();
    expect(PushNotifications.register).not.toHaveBeenCalled();
    perm.receive = 'granted';
    await startPush();
    expect(PushNotifications.register).toHaveBeenCalledTimes(1);
  });

  it('asks once when the student writes to David, and registers on yes', async () => {
    native.value = true;
    await askForPushOnce('bell-reply');
    expect(PushNotifications.requestPermissions).toHaveBeenCalledTimes(1);
    expect(PushNotifications.register).toHaveBeenCalledTimes(1);
    expect(captured).toContainEqual(['push_permission', { result: 'granted', trigger: 'bell-reply', prompted: true }]);
  });

  it('a denial is recorded and never asked again', async () => {
    native.value = true; perm.answer = 'denied';
    await askForPushOnce('feedback');
    perm.receive = 'prompt'; // even if iOS were to report prompt again
    await askForPushOnce('feedback');
    await askForPushOnce('bell-reply');
    expect(PushNotifications.requestPermissions).toHaveBeenCalledTimes(1);
    expect(PushNotifications.register).not.toHaveBeenCalled();
    expect((await db.meta.get(PUSH_PROMPTED_KEY))?.value).toBe('denied');
  });

  it('files a new token once, with the production environment for an App Store build', async () => {
    native.value = true;
    await postToken('d'.repeat(64));
    await postToken('d'.repeat(64));
    const f = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/push-register$/);
    expect(JSON.parse(init.body as string)).toEqual({ device: 'dev-test-0001', token: 'd'.repeat(64), environment: 'production', platform: 'ios' });
    expect(captured.map((c) => c[0])).toContain('push_registered');
  });

  it('sandbox only for an Xcode-run build', () => {
    expect(apnsEnvironmentFor('development')).toBe('sandbox');
    expect(apnsEnvironmentFor('testflight')).toBe('production');
    expect(apnsEnvironmentFor('appstore')).toBe('production');
  });

  it('a tap asks for the bell once', async () => {
    native.value = true;
    await startPush();
    const heard = vi.fn();
    window.addEventListener(OPEN_BELL_EVENT, heard);
    listeners.get('pushNotificationActionPerformed')?.({ notification: { data: { open: 'bell' } } });
    expect(heard).toHaveBeenCalledTimes(1);
    expect(captured).toContainEqual(['push_opened', { open: 'bell' }]);
    expect(takePendingBellOpen()).toBe(true);
    expect(takePendingBellOpen()).toBe(false);
    window.removeEventListener(OPEN_BELL_EVENT, heard);
  });
});
