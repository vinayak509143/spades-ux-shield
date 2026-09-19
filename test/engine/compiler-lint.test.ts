// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { compileRules, hostBucketToCss } from '../../src/engine/compiler.js';
import type { HostBucket, Rule } from '../../src/engine/types.js';

function hideRule(host: string, selector: string, id: number): Rule {
  return {
    kind: 'cosmetic',
    hosts: [host],
    entity: false,
    pathRe: null,
    selector,
    procedural: [],
    action: { type: 'hide' },
    line: id,
    id,
    source: `${host}##${selector}`,
  };
}

describe('hostBucketToCss selector lint', () => {
  it('drops invalid selectors but keeps valid ones for the same host', () => {
    const rules = [
      hideRule('shop.example.com', '.valid-nag', 1),
      hideRule('shop.example.com', '##broken', 2),
      hideRule('shop.example.com', '.another-valid', 3),
    ];
    const { hostBuckets } = compileRules(rules);
    const bucket = hostBuckets.get('shop.example.com') as HostBucket;
    const css = hostBucketToCss('shop.example.com', bucket);
    expect(css).toContain('.valid-nag');
    expect(css).toContain('.another-valid');
    expect(css).not.toContain('##broken');
  });
});
