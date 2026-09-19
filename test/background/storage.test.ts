import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileRules } from '../../src/engine/compiler.js';
import { parseList } from '../../src/engine/parser.js';
import {
  groupBucketsByShard,
  registrableDomain,
  shardKeyForHost,
} from '../../src/background/storage.js';

describe('storage shards', () => {
  it('maps hosts to stable host:{hex4} keys by registrable domain', () => {
    const a = shardKeyForHost('www.scam-shop.example.com');
    const b = shardKeyForHost('scam-shop.example.com');
    expect(a).toBe(b);
    expect(a).toMatch(/^host:[0-9a-f]{4}$/);
    expect(registrableDomain('www.shop.example.com')).toBe('example.com');
    expect(registrableDomain('www.amazon.co.uk')).toBe('amazon.co.uk');
    expect(registrableDomain('shop.amazon.co.uk')).toBe('amazon.co.uk');
  });

  it('groups compiled buckets into shard records', () => {
    const source = readFileSync(resolve(process.cwd(), 'lists/darklist.txt'), 'utf8');
    const { rules } = parseList(source);
    const compiled = compileRules(rules);
    const shards = groupBucketsByShard(compiled.hostBuckets);
    expect(shards.size).toBeGreaterThan(0);
    for (const record of shards.values()) {
      expect(Object.keys(record).length).toBeGreaterThan(0);
    }
  });
});
