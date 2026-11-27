import { describe, expect, it } from 'vitest';
import calibration from '../data/skill-difficulty.json';
import { skillRefitList } from './skillRefit';
import { skillDifficulty } from './skillMetersLoader';

// The refit list is computed, never typed: every tag on it has no row of its
// own or its parent's, and every tag with a row is off it.
describe('the skill table refit list', () => {
  it('holds exactly the tags the table cannot score', () => {
    const list = skillRefitList();
    for (const tag of list) expect(skillDifficulty(tag), tag).toBeNull();
    for (const tag of Object.keys((calibration as { table: Record<string, unknown> }).table)) expect(list).not.toContain(tag);
    expect(list).not.toContain('other');
  });
});
