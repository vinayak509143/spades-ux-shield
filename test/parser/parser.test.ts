import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileRules, compileToDomainIndex } from '../../src/engine/compiler.js';
import { parseLine, parseList } from '../../src/engine/parser.js';

const baseListPath = resolve(process.cwd(), 'lists/base.txt');

describe('parseList', () => {
  it('parses lists/base.txt with directives and rules', () => {
    const source = readFileSync(baseListPath, 'utf8');
    const { rules, errors, directives } = parseList(source);

    expect(errors).toHaveLength(0);
    expect(directives.Title).toBe('Spades UX-Shield Base');
    expect(directives.Version).toBe('202609172320');
    expect(rules).toHaveLength(23);

    const timerHide = rules.find((r) => r.hosts.includes('scam-shop.example.com'));
    expect(timerHide?.kind).toBe('cosmetic');
    expect(timerHide?.selector).toBe('.hurry-up-timer');
    expect(timerHide?.action.type).toBe('hide');

    const hasText = rules.find((r) => r.hosts.includes('generic-ecommerce.com'));
    expect(hasText?.procedural[0]?.type).toBe('has-text');
    expect(hasText?.procedural[0]).toMatchObject({ type: 'has-text' });

    const uncheck = rules.find((r) => r.action.type === 'uncheck');
    expect(uncheck?.hosts).toContain('sketchy-airlines.example.com');
    expect(uncheck?.pathRe).not.toBeNull();
    expect(uncheck?.selector).toBe('input[name="travel_insurance"]');

    const exception = rules.find((r) => r.kind === 'exception');
    expect(exception?.hosts).toContain('legit.scam-shop.example.com');
    expect(exception?.selector).toBe('.hurry-up-timer');
  });

  it('compiles parsed base list into host buckets and domain index', () => {
    const source = readFileSync(baseListPath, 'utf8');
    const { rules } = parseList(source);
    const compiled = compileRules(rules);
    expect(compiled.errors).toHaveLength(0);
    expect(compiled.hostBuckets.has('scam-shop.example.com')).toBe(true);

    const { index, errors } = compileToDomainIndex(rules);
    expect(errors).toHaveLength(0);
    const bucket = index.lookup('www.scam-shop.example.com');
    expect(bucket.hideSelectors).toContain('.hurry-up-timer');
  });
});

describe('parseLine rejections', () => {
  it('rejects bare div:has-text at compile time', () => {
    const { rule } = parseLine('bad.example.com##div:has-text(bad)', 1);
    expect(rule).toBeDefined();
    const { errors } = compileRules(rule ? [rule] : []);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toMatch(/bare div\/span\/p\/\*/i);
  });

  it('rejects HTML filter marker ##^', () => {
    const { error, rule } = parseLine('foo.com##^script:has-text(ads)', 1);
    expect(rule).toBeUndefined();
    expect(error?.message).toMatch(/##\^/);
  });

  it('rejects scriptlet filters', () => {
    const { error } = parseLine('foo.com##+js(aalert)', 1);
    expect(error?.message).toMatch(/\+js/);
  });
});
