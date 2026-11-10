import { describe, it, expect } from 'vitest';
import { pickEditableAppInfo, pickSubmissionAppInfo } from './app-info-pick.mjs';

const info = (id: string, state: string, field: 'state' | 'appStoreState' = 'appStoreState') => ({
  id, attributes: { [field]: state },
});

describe('which app info a script reads or writes', () => {
  it('skips the live READY_FOR_SALE app info (readiness read 4.0.7, 2026-11-10)', () => {
    const infos = [info('live', 'READY_FOR_SALE'), info('prep', 'DEVELOPER_REJECTED')];
    expect(pickEditableAppInfo(infos)?.id).toBe('prep');
    expect(pickSubmissionAppInfo(infos)?.id).toBe('prep');
  });

  it('reads the newer `state` field as well as `appStoreState`', () => {
    const infos = [info('live', 'READY_FOR_DISTRIBUTION', 'state'), info('prep', 'PREPARE_FOR_SUBMISSION', 'state')];
    expect(pickEditableAppInfo(infos)?.id).toBe('prep');
  });

  it('none in preparation: no editable one, and the submission reads the live one', () => {
    const infos = [info('live', 'READY_FOR_SALE')];
    expect(pickEditableAppInfo(infos)).toBeNull();
    expect(pickSubmissionAppInfo(infos)?.id).toBe('live');
  });

  it('an app info with no state is never picked as editable', () => {
    expect(pickEditableAppInfo([{ id: 'x', attributes: {} }])).toBeNull();
  });
});
