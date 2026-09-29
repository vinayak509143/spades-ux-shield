// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileRules } from '../../src/engine/compiler.js';
import { parseList } from '../../src/engine/parser.js';
import { readProceduralForHostname } from '../../src/background/inject-css.js';
import { groupBucketsByShard, shardKeyForHost, writeHostShard } from '../../src/background/storage.js';

describe('readProceduralForHostname', () => {
  const memory = new Map<string, unknown>();

  afterEach(() => {
    memory.clear();
    vi.unstubAllGlobals();
  });

  function stubChrome(): void {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: memory.get(key) }),
          set: async (items: Record<string, unknown>) => {
            for (const [key, value] of Object.entries(items)) {
              memory.set(key, value);
            }
          },
        },
      },
    });
  }

  it('returns procedural rules for a hostname suffix and an Amazon alias', async () => {
    stubChrome();
    const { rules } = parseList(
      [
        'www.example.com##span.nag:has-text(/only\\s+left/i)',
        'amazon-retail##span.scarcity:has-text(/only\\s+\\d+\\s+left/i)',
      ].join('\n'),
    );
    const shards = groupBucketsByShard(compileRules(rules).hostBuckets);
    for (const [key, record] of shards) {
      await writeHostShard(key, record);
    }

    const example = await readProceduralForHostname('www.example.com', new Map());
    expect(example.map((rule) => rule.selector)).toContain('span.nag');

    const amazon = await readProceduralForHostname('www.amazon.com', new Map());
    expect(amazon.map((rule) => rule.selector)).toContain('span.scarcity');
    expect(shardKeyForHost('amazon-retail')).not.toBe(shardKeyForHost('www.amazon.com'));
  });

  it('drops a procedural rule with an invalid selector', async () => {
    stubChrome();
    const key = shardKeyForHost('www.example.com');
    await writeHostShard(key, {
      'www.example.com': {
        hideSelectors: [],
        exceptions: [],
        procedural: [
          {
            ruleId: 1,
            hosts: ['www.example.com'],
            entity: false,
            pathRe: null,
            selector: 'div[',
            procedural: [{ type: 'has-text', needle: { source: 'only', flags: 'i' } }],
            action: { type: 'hide' },
          },
          {
            ruleId: 2,
            hosts: ['www.example.com'],
            entity: false,
            pathRe: null,
            selector: 'span.nag',
            procedural: [{ type: 'has-text', needle: { source: 'only', flags: 'i' } }],
            action: { type: 'hide' },
          },
        ],
      },
    });
    const rules = await readProceduralForHostname('www.example.com', new Map());
    expect(rules.map((rule) => rule.ruleId)).toEqual([2]);
  });
});
