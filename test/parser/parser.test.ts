import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileRules, compileToDomainIndex } from '../../src/engine/compiler.js';
import { parseLine, parseList } from '../../src/engine/parser.js';

const baseListPath = resolve(process.cwd(), 'lists/darklist.txt');

describe('parseList', () => {
  it('parses lists/darklist.txt with directives and rules', () => {
    const source = readFileSync(baseListPath, 'utf8');
    const { rules, errors, directives } = parseList(source);

    expect(errors).toHaveLength(0);
    expect(directives.Title).toBe('Spades Darklist');
    expect(directives.Version).toBe('202610012340');
    expect(rules).toHaveLength(106);

    const sheinRules = rules.filter((r) => r.hosts.includes('us.shein.com'));
    expect(sheinRules).toHaveLength(12);
    expect(sheinRules.every((r) => r.hosts.includes('www.shein.com'))).toBe(true);
    const euqsTags = rules.find(
      (r) => r.hosts.includes('euqs.shein.com') && r.selector === 'span.tags-text',
    );
    expect(euqsTags?.procedural[0]?.type).toBe('has-text');
    const sheinIcon = sheinRules.find((r) => r.selector.includes('user add to cart'));
    expect(sheinIcon?.procedural).toHaveLength(0);
    const sheinText = sheinRules.find((r) => r.procedural[0]?.type === 'has-text');
    expect(sheinText?.selector).toBe('span.label-text');
    const temuRules = rules.filter((r) => r.hosts.includes('www.temu.com'));
    expect(temuRules).toHaveLength(13);
    const temuChips = temuRules.filter((r) => r.action.type === 'hide');
    expect(temuChips).toHaveLength(7);
    expect(temuChips.map((r) => r.selector).sort()).toEqual([
      'div[class]',
      'div[class]:not(:has(button, a, input, select, textarea, [role="button"]))',
      'span[class]',
      'span[class]:not(:has(button, a, input, select, textarea, [role="button"]))',
      'span[data-type="0"]',
      'span[data-type="0"]',
      'span[data-type="0"]:not(:has(button, a, input, select, textarea, [role="button"]))',
    ]);
    const scarcity = temuChips.find((rule) => {
      const op = rule.procedural[0];
      return op?.type === 'has-text' && op.needle instanceof RegExp && op.needle.test('ONLY 8 LEFT');
    })?.procedural[0];
    const rank = temuChips.find((rule) => {
      const op = rule.procedural[0];
      return op?.type === 'has-text' && op.needle instanceof RegExp && op.needle.test('#1 TOP RATED');
    })?.procedural[0];
    if (scarcity?.type === 'has-text' && scarcity.needle instanceof RegExp) {
      for (const phrase of [
        'ALMOST SOLD OUT',
        'ONLY 8 LEFT',
        'Last day',
        'Ends in',
        '12:34:56',
        '2.3K+ sold',
        '105sold',
        '03 : 10 : 40 : 41 Ends in',
      ]) {
        expect(scarcity.needle.test(phrase)).toBe(true);
      }
      for (const phrase of [
        '#1 BEST-SELLING ITEM',
        '#1 TOP RATED in Bedding',
        'Fastest delivery in 5 business days',
        '5 BUSINESS DAYS',
        'Add to cart',
        'Add now! Almost out!',
        '56% OFF',
        'Best-Selling Items',
        'Low stock items alerts',
        'Pay $2.16 today',
        'ADD THE LAST 1!',
        'Free shipping',
        'in Electric Bikes',
      ]) {
        expect(scarcity.needle.test(phrase)).toBe(false);
      }
    } else {
      expect(scarcity).toBeTruthy();
    }
    if (rank?.type === 'has-text' && rank.needle instanceof RegExp) {
      for (const phrase of [
        '#1 BEST-SELLING ITEM',
        '#1 BEST-SELLING ITEM in Electric Bikes',
        '#1 BEST-SELLING ITEMin Office Electronics',
        "#1 TOP RATED in Women's Socks",
        '#1 TOP RATED',
        '#1 TOP RATED in Bedding',
        '#3 MOST REPURCHASED BRAND ITEM in Bedding',
      ]) {
        expect(rank.needle.test(phrase)).toBe(true);
      }
      for (const phrase of [
        '#1 TOP RATED in Shoes ₹500 Add to cart',
        'ONLY 8 LEFT',
        'Best-Selling Items',
        'in Electric Bikes',
      ]) {
        expect(rank.needle.test(phrase)).toBe(false);
      }
    } else {
      expect(rank).toBeTruthy();
    }
    const temuRelabels = temuRules.filter((r) => r.action.type === 'replace-text');
    expect(temuRelabels).toHaveLength(6);
    expect(
      temuRelabels.find(
        (r) =>
          r.action.type === 'replace-text' &&
          r.action.text === 'Add to cart' &&
          r.procedural.some(
            (op) =>
              op.type === 'has-text' &&
              op.needle instanceof RegExp &&
              op.needle.test('Add now! Almost out!'),
          ),
      ),
    ).toBeDefined();
    const buyAlmost = temuRelabels.find(
      (r) =>
        r.action.type === 'replace-text' &&
        r.action.text === 'Buy now' &&
        r.procedural.some(
          (op) =>
            op.type === 'has-text' &&
            op.needle instanceof RegExp &&
            op.needle.test('Buy now! Almost out!'),
        ),
    );
    expect(buyAlmost?.selector).toBe('span[data-type="0"]');
    const buyNowLast = temuRelabels.find(
      (r) =>
        r.action.type === 'replace-text' &&
        r.action.text === 'Buy now' &&
        r.procedural.some(
          (op) =>
            op.type === 'has-text' &&
            op.needle instanceof RegExp &&
            op.needle.test('BUY NOW! LAST 1!'),
        ),
    );
    expect(buyNowLast?.selector).toBe('span[data-type="0"]');
    const buyNeedle = buyNowLast?.procedural[0];
    if (buyNeedle?.type === 'has-text' && buyNeedle.needle instanceof RegExp) {
      expect(buyNeedle.needle.test('Buy now!')).toBe(false);
    }

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

    const consentUncheck = rules.find((r) => r.hosts.includes('consent.example.com'));
    expect(consentUncheck?.action.type).toBe('uncheck');
    expect(consentUncheck?.selector).toBe('input[name="marketing_opt_in"]');

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

  it('rejects :replace-text without :has-text', () => {
    const { rule } = parseLine(
      'bad.example.com##span[data-type="0"]:replace-text("Add to cart")',
      1,
    );
    expect(rule).toBeDefined();
    const { errors } = compileRules(rule ? [rule] : []);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toMatch(/replace-text requires :has-text/);
  });

  it('rejects HTML in :replace-text', () => {
    const { error, rule } = parseLine(
      'bad.example.com##span[data-type="0"]:has-text(/almost out/i):replace-text("<b>Add</b>")',
      1,
    );
    expect(rule).toBeUndefined();
    expect(error?.message).toMatch(/Invalid action :replace-text/);
  });
});
