import { describe, it, expect } from 'vitest';
import { hasUnread, mergeBroadcasts, type Announcement } from './announcementsService';

const m = (id: string): Announcement => ({ id, date: '2026-09-06', title: 't', body: 'b' });
const md = (id: string, date: string): Announcement => ({ id, date, title: id, body: 'b' });

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

describe('announcementsService.mergeBroadcasts — welcome messages always show', () => {
  it('keeps the pinned welcome set when Redis returns nothing (the bug fix)', () => {
    // /api/messages responded ok with an empty broadcast list; the welcome
    // messages must still be present (David 2026-09-07).
    const pinned = [md('2026-09-07-free-openings', '2026-09-07'), md('2026-09-06-welcome', '2026-09-06')];
    const merged = mergeBroadcasts(pinned, []);
    expect(merged.map((x) => x.id)).toEqual(['2026-09-07-free-openings', '2026-09-06-welcome']);
  });

  it('merges dynamic Redis broadcasts with pinned, newest-first', () => {
    const pinned = [md('2026-09-06-welcome', '2026-09-06')];
    const dynamic = [md('2026-09-08-news', '2026-09-08')];
    expect(mergeBroadcasts(pinned, dynamic).map((x) => x.id)).toEqual(['2026-09-08-news', '2026-09-06-welcome']);
  });

  it('dedups by id — a dynamic broadcast overrides a pinned one of the same id', () => {
    const pinned = [{ id: 'x', date: '2026-09-06', title: 'old', body: 'old' }];
    const dynamic = [{ id: 'x', date: '2026-09-06', title: 'new', body: 'new' }];
    const merged = mergeBroadcasts(pinned, dynamic);
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('new');
  });
});
