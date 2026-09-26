import { describe, it, expect } from 'vitest';
import { andList, fileList } from './andList';

describe('fileList — the one wording for a list of files (walk 900: "the b, c-file")', () => {
  it('one, two, three files', () => {
    expect(fileList(['c'])).toBe('the c-file');
    expect(fileList(['b', 'c'])).toBe('the b- and c-files');
    expect(fileList(['a', 'b', 'c'])).toBe(`the ${andList(['a-', 'b-', 'c'])}-files`);
    expect(fileList([])).toBe('');
  });
});
