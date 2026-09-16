// NAME THE GAME (David 2026-09-16: "Yes! Name the game! Date and opponent if
// available."). The callback used to key on the 26-tag coach set only, so the
// app could say it had seen a *misconception* before but not that it had seen
// you miss forks four times. Same sentence, whole spine.
import { describe, it, expect } from 'vitest';
import { composeWeaknessCallback, type CallbackWeakness } from './misconceptionCallbacks';

const NOW = Date.parse('2026-09-16T12:00:00Z');
const daysAgo = (d: number): number => NOW - d * 24 * 60 * 60 * 1000;

const w = (o: Partial<CallbackWeakness> = {}): CallbackWeakness => ({
  tag: 'analysis:tactic:fork',
  label: 'Missed forks',
  total: 4,
  lastSeenAt: daysAgo(9),
  positions: [
    { from: { opponentName: 'Newest', playedAt: daysAgo(1) } },
    { from: { opponentName: 'KaiserlicheHoheit', playedAt: daysAgo(9) } },
  ],
  ...o,
});

describe('the callback reaches analysis clusters, not just coach tags', () => {
  it('names the pattern, the count, the opponent and the date', () => {
    const line = composeWeaknessCallback(w(), NOW);
    expect(line).toContain('missed forks');
    expect(line).toContain('fourth time');
    expect(line).toContain('against KaiserlicheHoheit');
    expect(line).toContain('9 days ago');
  });

  it('reads the PRIOR occurrence, not the one that just happened', () => {
    // positions[0] is this slip; the callback is about the one BEFORE it.
    expect(composeWeaknessCallback(w(), NOW)).not.toContain('Newest');
  });

  it('omits the opponent clause entirely when the source cannot name one', () => {
    const line = composeWeaknessCallback(w({
      positions: [{ from: { playedAt: daysAgo(1) } }, { from: { playedAt: daysAgo(9) } }],
    }), NOW);
    expect(line).toContain('9 days ago');
    expect(line).not.toMatch(/against/);
    expect(line).not.toMatch(/undefined|null|your opponent/);
  });

  it('is SILENT on the first occurrence — nothing to call back to', () => {
    expect(composeWeaknessCallback(w({ total: 1 }), NOW)).toBeNull();
  });

  // The `other`-tag dilution in a different costume: "we've seen this before —
  // mistakes in the middlegame" counts unrelated slips as one pattern.
  it('refuses the generic phase buckets', () => {
    for (const tag of ['analysis:phase:opening', 'analysis:phase:middlegame', 'analysis:phase:endgame']) {
      expect(composeWeaknessCallback(w({ tag, label: 'Mistakes in the middlegame' }), NOW)).toBeNull();
    }
  });

  it('falls back to the row date when the position carries no play clock', () => {
    const line = composeWeaknessCallback(w({ positions: [{}, {}] }), NOW);
    expect(line).toContain('9 days ago'); // lastSeenAt
  });
});

describe('read it', () => {
  it('prints', () => {
    console.log('\n  WITH a named opponent:\n  ' + String(composeWeaknessCallback(w(), NOW)));
    console.log('\n  WITHOUT one:\n  ' + String(composeWeaknessCallback(w({
      positions: [{ from: { playedAt: daysAgo(1) } }, { from: { playedAt: daysAgo(9) } }],
    }), NOW)));
    console.log('\n  A different hole, months back:\n  ' + String(composeWeaknessCallback(w({
      tag: 'analysis:conversion-endgame:rook', label: 'Converting rook endings', total: 3,
      positions: [{ from: { opponentName: 'A', playedAt: daysAgo(3) } }, { from: { opponentName: 'chessMaster99', playedAt: daysAgo(70) } }],
    }), NOW)));
    console.log('');
  });
});

describe('recency is concrete, never vague (Narration Voice Rule 1)', () => {
  const at = (d: number) => composeWeaknessCallback(w({
    positions: [{ from: { opponentName: 'A', playedAt: daysAgo(0) } }, { from: { opponentName: 'B', playedAt: daysAgo(d) } }],
  }), NOW) ?? '';
  it('keeps DAYS for a fortnight — 9 days is "9 days ago", not "1 week"', () => {
    expect(at(9)).toContain('9 days ago');
    expect(at(13)).toContain('13 days ago');
  });
  it('weeks in the middle', () => { expect(at(21)).toContain('3 weeks ago'); });
  it('real months instead of "a while back"', () => {
    expect(at(70)).toContain('about 2 months ago');
    expect(at(70)).not.toContain('a while back');
  });
  it('over a year says so', () => { expect(at(500)).toContain('over a year ago'); });
});
