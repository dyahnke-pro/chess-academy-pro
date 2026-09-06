import { describe, it, expect } from 'vitest';
import { hasUnread, type Announcement } from './announcementsService';

const m = (id: string): Announcement => ({ id, date: '2026-09-06', title: 't', body: 'b' });

describe('announcementsService.hasUnread — drives the red dot', () => {
  it('no dot when there are no messages', () => {
    expect(hasUnread([], null)).toBe(false);
    expect(hasUnread([], 'anything')).toBe(false);
  });

  it('dot when the newest message has never been seen', () => {
    expect(hasUnread([m('a')], null)).toBe(true);
  });

  it('dot when the newest message is unseen (older one was seen)', () => {
    // messages are newest-first: [newest, older]
    expect(hasUnread([m('b'), m('a')], 'a')).toBe(true);
  });

  it('no dot once the newest message has been opened', () => {
    expect(hasUnread([m('b'), m('a')], 'b')).toBe(false);
  });
});
