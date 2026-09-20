import { describe, expect, it } from 'vitest';
import { compileRules, hostBucketToCss } from '../../src/engine/compiler.js';
import { parseLine } from '../../src/engine/parser.js';
import { ruleMatchesHost } from '../../src/content/procedural-match.js';

describe('amazon-retail / amazon-en aliases', () => {
  it('emits data-op-amz gated CSS, not data-op-h on amazon.com', () => {
    const { rule } = parseLine(
      'amazon-retail###socialProofingAsinFaceout_feature_div',
      1,
    );
    expect(rule).toBeDefined();
    const { hostBuckets } = compileRules(rule ? [rule] : []);
    const css = hostBucketToCss('amazon-retail', hostBuckets.get('amazon-retail')!);
    expect(css).toContain('data-op-amz="1"');
    expect(css).not.toContain('data-op-h~="amazon.com"');
    expect(css).toContain('#socialProofingAsinFaceout_feature_div');
  });

  it('matches retail hosts for amazon-retail procedural rules', () => {
    const { rule } = parseLine(
      'amazon-en##.a-badge:has-text(/limited time deal/i)',
      1,
    );
    expect(rule).toBeDefined();
    const { hostBuckets } = compileRules(rule ? [rule] : []);
    const proc = hostBuckets.get('amazon-en')?.procedural[0];
    expect(proc).toBeDefined();
    expect(ruleMatchesHost(proc!, 'www.amazon.com')).toBe(true);
    expect(ruleMatchesHost(proc!, 'aws.amazon.com')).toBe(false);
    expect(ruleMatchesHost(proc!, 'www.amazon.de')).toBe(false);
  });
});
