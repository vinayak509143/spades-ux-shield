import { describe, expect, it } from 'vitest';
import { parseList } from '../../src/engine/parser.js';
import { compileRules } from '../../src/engine/compiler.js';

describe('compileRules path scope', () => {
  it('routes :matches-path-only rules to procedural, not generic CSS', () => {
    const source = [
      '! Title: Spades Darklist',
      '! Version: 209901010000',
      'shop.example.com##.path-only:matches-path(/^\\/promo\\/?$/)',
    ].join('\n');
    const { rules } = parseList(source);
    expect(rules).toHaveLength(1);
    const { genericCss, hostBuckets, errors } = compileRules(rules);
    expect(errors).toHaveLength(0);
    expect(genericCss).not.toContain('.path-only');
    const bucket = hostBuckets.get('shop.example.com');
    expect(bucket?.procedural).toHaveLength(1);
    expect(bucket?.procedural[0]?.pathRe).not.toBeNull();
    expect(bucket?.hideSelectors).toHaveLength(0);
  });
});

describe('compileRules comma gate', () => {
  it('rejects top-level comma in selector', () => {
    const rule = {
      kind: 'cosmetic' as const,
      hosts: ['shop.example.com'],
      entity: false,
      pathRe: null,
      selector: '.one, .two',
      procedural: [],
      action: { type: 'hide' as const },
      line: 1,
      id: 1,
      source: 'shop.example.com##.one, .two',
    };
    const { hostBuckets, errors, genericCss } = compileRules([rule]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('top-level comma');
    expect(genericCss).toBe('');
    expect(hostBuckets.size).toBe(0);
  });

  it('allows comma inside :not()', () => {
    const rule = {
      kind: 'cosmetic' as const,
      hosts: ['shop.example.com'],
      entity: false,
      pathRe: null,
      selector: 'a:not(.x, .y)',
      procedural: [],
      action: { type: 'hide' as const },
      line: 1,
      id: 2,
      source: 'shop.example.com##a:not(.x, .y)',
    };
    const { errors, genericCss } = compileRules([rule]);
    expect(errors).toHaveLength(0);
    expect(genericCss).toContain('a:not(.x, .y)');
  });
});
