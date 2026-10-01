import { describe, expect, it } from 'vitest';
import { hostCssPartName, splitHostCssMap } from '../../scripts/split-host-css.mjs';

describe('splitHostCssMap', () => {
  it('keeps a small map in one part', () => {
    const parts = splitHostCssMap({ 'www.a.test': 'h1{}' }, 1000);
    expect(parts).toEqual([{ 'www.a.test': 'h1{}' }]);
  });

  it('starts a new part before a part would pass the byte limit', () => {
    const hostCss = {
      'a.test': 'x'.repeat(20),
      'b.test': 'y'.repeat(20),
      'c.test': 'z'.repeat(20),
    };
    const one = Buffer.byteLength(JSON.stringify({ 'a.test': 'x'.repeat(20) }), 'utf8');
    const parts = splitHostCssMap(hostCss, one);
    expect(parts).toHaveLength(3);
    for (const part of parts) {
      expect(Buffer.byteLength(JSON.stringify(part), 'utf8')).toBeLessThanOrEqual(one);
    }
    expect(parts.flatMap((part) => Object.keys(part)).sort()).toEqual([
      'a.test',
      'b.test',
      'c.test',
    ]);
  });

  it('rejects one host whose CSS cannot fit in a part', () => {
    expect(() => splitHostCssMap({ 'a.test': 'x'.repeat(50) }, 20)).toThrow(/a\.test/);
  });
});

describe('hostCssPartName', () => {
  it('pads the part index', () => {
    expect(hostCssPartName(1)).toBe('packaged-host-css-part-01.json');
    expect(hostCssPartName(12)).toBe('packaged-host-css-part-12.json');
  });
});
