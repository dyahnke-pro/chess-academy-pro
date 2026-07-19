import { describe, it, expect } from 'vitest';
import { MISCONCEPTION_TAGS } from './misconceptionTags';
import { PRINCIPLE_DEVICES, principleFor } from './principles';

describe('principles — the device per misconception tag (Phase 3)', () => {
  it('every first-class tag has a device; only `other` goes without', () => {
    for (const tag of MISCONCEPTION_TAGS) {
      if (tag.id === 'other') {
        expect(principleFor(tag.id)).toBeNull();
      } else {
        expect(principleFor(tag.id), `missing device for ${tag.id}`).toBeTruthy();
      }
    }
  });

  it('no device names a tag outside the closed set', () => {
    const ids = new Set(MISCONCEPTION_TAGS.map((t) => t.id));
    for (const key of Object.keys(PRINCIPLE_DEVICES)) {
      expect(ids.has(key), `unknown tag ${key}`).toBe(true);
    }
  });

  it('devices are voice-clean: no SAN tokens, no digits, no interface talk', () => {
    for (const [tag, device] of Object.entries(PRINCIPLE_DEVICES)) {
      expect(device, tag).not.toMatch(/\d/);
      expect(device, tag).not.toMatch(/\b[NBRQK][a-h][1-8]\b/); // bare SAN
      expect(device, tag).not.toMatch(/\b(tap|click|button|screen|menu)\b/i);
    }
  });

  it('devices are one breath: a single spoken line under 220 characters', () => {
    for (const [tag, device] of Object.entries(PRINCIPLE_DEVICES)) {
      expect(device.length, tag).toBeLessThanOrEqual(220);
      expect(device, tag).toMatch(/^The device: /);
    }
  });

  it('unknown tags return null, never throw', () => {
    expect(principleFor('not-a-tag')).toBeNull();
    expect(principleFor('')).toBeNull();
  });
});
