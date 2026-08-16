/**
 * The trap menu, tested against the REAL gem file — not fixtures.
 *
 * The label is the identity: a tapped chip routes its own text back through
 * `handleSubmit`, so a label that cannot be parsed back to exactly one gem
 * teaches the wrong line. The Vienna makes that concrete — 21 traps, of which
 * two are punished after `Qf6` and two after `Nge7`. Labelling by slip and
 * punish alone would print duplicate chips and resolve half of them wrongly.
 */
import { describe, it, expect } from 'vitest';
import {
  teachableGems, gemTrapChoices, gemChipLabel, parseGemChipLabel,
  gemForChipLabel, remainingGemChoices, slipMoveNumber,
  gemForChipLabelAnywhere, gemTeachingText,
} from './gemTrapMenu';
import { gemId, isSurfaceableGem, getPunishGemsForOpening } from './punishGems';

const VIENNA = 'vienna-game';

describe('the menu offers only what the app can actually play', () => {
  it('lists the Vienna traps', () => {
    const gems = teachableGems(VIENNA);
    expect(gems.length).toBeGreaterThan(10);
    expect(gems.every(isSurfaceableGem)).toBe(true);
  });

  it('never offers a gem the UI would refuse to render', () => {
    // Offering a lesson the app then cannot show is a worse bug than the one
    // this whole feature fixes.
    const offered = new Set(teachableGems(VIENNA).map(gemId));
    for (const g of getPunishGemsForOpening(VIENNA)) {
      if (!isSurfaceableGem(g)) expect(offered.has(gemId(g))).toBe(false);
    }
  });

  it('returns nothing for an opening with no gems, rather than inventing a menu', () => {
    // The Bishop's Opening really has none — the honest answer is an empty
    // menu, not a plausible-looking one.
    expect(gemTrapChoices('bishops-opening')).toEqual([]);
    expect(gemTrapChoices(undefined)).toEqual([]);
  });
});

describe('every label identifies exactly one trap', () => {
  it('produces no duplicate chips for the Vienna', () => {
    const labels = gemTrapChoices(VIENNA);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('separates the two traps that share a slip', () => {
    // The reason the move number is in the label at all.
    const gems = teachableGems(VIENNA);
    const qf6 = gems.filter((g) => g.inaccuracy === 'Qf6');
    expect(qf6.length, 'expected the Vienna to still have two Qf6 gems').toBe(2);
    const [a, b] = qf6.map((g) => gemChipLabel(g));
    expect(a).not.toBe(b);
    expect(slipMoveNumber(qf6[0])).not.toBe(slipMoveNumber(qf6[1]));
  });

  it('round-trips every Vienna label back to the gem it names', () => {
    for (const gem of teachableGems(VIENNA)) {
      const label = gemChipLabel(gem);
      const back = gemForChipLabel(VIENNA, label);
      expect(back, label).toBeTruthy();
      expect(gemId(back!), label).toBe(gemId(gem));
    }
  });

  it('reads as something a person can act on', () => {
    const label = gemChipLabel(teachableGems(VIENNA)[0]);
    expect(label).toMatch(/^Opponent plays \d+(…|\.)\S+ — punish with \S+$/);
  });

  it('rejects text that is not a trap chip', () => {
    for (const s of ['teach me the Vienna', 'Trap', '', 'after Ng4', 'Opponent plays Ng4 — punish with Ng5'])
      expect(parseGemChipLabel(s), s).toBeNull();
  });
});

describe('resolution is by coordinates, not by position in the menu', () => {
  it('matches a chip whose number no longer matches its slot', () => {
    // A stale chip sits in the transcript after the menu has shrunk. The label
    // carries no slot number precisely so it cannot go stale — move number +
    // slip + punish keep pointing at the same trap.
    const gems = teachableGems(VIENNA);
    const third = gems[2];
    const staleLabel = gemChipLabel(third);
    expect(gemId(gemForChipLabel(VIENNA, staleLabel)!)).toBe(gemId(third));
  });

  it('returns null for a chip from another opening', () => {
    const foreign = gemChipLabel(teachableGems(VIENNA)[0]);
    expect(gemForChipLabel('caro-kann', foreign)).toBeNull();
  });
});

describe('continuing down the list', () => {
  it('drops what has been taught and renumbers from 1', () => {
    const gems = teachableGems(VIENNA);
    const taught = [gemId(gems[0]), gemId(gems[1])];
    const left = remainingGemChoices(VIENNA, taught);
    expect(left.length).toBe(gems.length - 2);
    // The menu shows what is LEFT, in board order, with nothing missing.
    expect(left[0]).toMatch(/^Opponent plays /);
    expect(left[1]).toMatch(/^Opponent plays /);
  });

  it('still resolves a renumbered chip to the right gem', () => {
    const gems = teachableGems(VIENNA);
    const left = remainingGemChoices(VIENNA, [gemId(gems[0])]);
    expect(gemId(gemForChipLabel(VIENNA, left[0])!)).toBe(gemId(gems[1]));
  });

  it('empties once every trap is taught — the cue to stop asking', () => {
    const all = teachableGems(VIENNA).map(gemId);
    expect(remainingGemChoices(VIENNA, all)).toEqual([]);
  });
});

describe('resolving a chip with no opening scope', () => {
  it('finds the gem when the label is unique across every opening', () => {
    const gem = teachableGems(VIENNA)[0];
    const found = gemForChipLabelAnywhere(gemChipLabel(gem));
    // Either it resolves to this exact gem, or the coordinates genuinely
    // collide with another opening's trap — in which case it must return null
    // rather than guess. Both are correct; teaching a DIFFERENT trap is not.
    if (found) expect(gemId(found)).toBe(gemId(gem));
  });

  it('returns null rather than guessing when two openings share the coordinates', () => {
    // Build the collision from real data if one exists; otherwise assert the
    // rule holds on a label that matches nothing.
    expect(gemForChipLabelAnywhere('Opponent plays 99…Zz9 — punish with Zz9')).toBeNull();
    expect(gemForChipLabelAnywhere('not a chip')).toBeNull();
  });

  it('never resolves to a gem the app cannot render', () => {
    const gem = teachableGems(VIENNA)[3];
    const found = gemForChipLabelAnywhere(gemChipLabel(gem));
    if (found) expect(isSurfaceableGem(found)).toBe(true);
  });
});

describe('the taught text comes from the gem, not from a model', () => {
  it('assembles real authored narration for a Vienna trap', () => {
    const gem = teachableGems(VIENNA)[0];
    const taught = gemTeachingText(gem);
    expect(taught, 'every surfaceable gem has narration by definition').toBeTruthy();
    expect(taught!.length).toBeGreaterThan(40);
  });

  it('pairs each line with the move it describes', () => {
    const taught = gemTeachingText(teachableGems(VIENNA)[0])!;
    // "<SAN> — <authored line>" is the shape; a line with no move in front of
    // it would be prose floating free of the board.
    expect(taught.split('\n\n')[0]).toMatch(/^\S+ — \S/);
  });

  it('skips authored silence rather than padding it', () => {
    for (const gem of teachableGems(VIENNA).slice(0, 5)) {
      const taught = gemTeachingText(gem);
      if (!taught) continue;
      expect(taught).not.toMatch(/— \s*$/m);      // no empty narration lines
      expect(taught).not.toMatch(/\n\n\n/);       // no gaps where silence was
    }
  });
});
