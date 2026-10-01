import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileRules } from '../../src/engine/compiler.js';
import { parseList } from '../../src/engine/parser.js';
import { cssInjectionTarget, buildUserCssForHostname, clearPackagedHostCssCache } from '../../src/background/inject-css.js';
import {
  groupBucketsByShard,
  shardKeyForHost,
  writeHostShard,
} from '../../src/background/storage.js';

describe('cssInjectionTarget', () => {
  it('prefers documentId over frameId', () => {
    expect(cssInjectionTarget(9, 2, 'doc-abc')).toEqual({
      tabId: 9,
      documentIds: ['doc-abc'],
    });
  });

  it('falls back to frameId when documentId is missing', () => {
    expect(cssInjectionTarget(9, 2)).toEqual({
      tabId: 9,
      frameIds: [2],
    });
  });
});

describe('buildUserCssForHostname after SW restart', () => {
  const memory = new Map<string, unknown>();

  afterEach(() => {
    memory.clear();
    clearPackagedHostCssCache();
    vi.unstubAllGlobals();
  });

  it('reads updated shards from storage when the in-memory cache is empty', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        getURL: () => 'https://extension.invalid/dist/packaged-host-css.json',
      },
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
    vi.stubGlobal(
      'fetch',
      async () =>
        ({
          ok: true,
          json: async () => ({}),
        }) as Response,
    );

    const { rules, errors } = parseList(
      '! Title: t\n! Version: 209901011200\npost-sync.example.com##.after-update-nag\n',
    );
    expect(errors).toHaveLength(0);
    const compiled = compileRules(rules);
    const shards = groupBucketsByShard(compiled.hostBuckets);
    const shardKey = shardKeyForHost('www.post-sync.example.com');
    const record = shards.get(shardKey);
    expect(record).toBeDefined();
    await writeHostShard(shardKey, record ?? {});

    const css = await buildUserCssForHostname('www.post-sync.example.com', new Map());
    expect(css).toContain('.after-update-nag');
    expect(css).toContain('data-op-h~="post-sync.example.com"');
  });

  it('merges packaged CSS from the Firefox part index', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        getURL: (path: string) => `https://extension.invalid/${path}`,
      },
      storage: {
        local: {
          get: async () => ({}),
          set: async () => undefined,
        },
      },
    });
    vi.stubGlobal('fetch', async (url: string) => {
      const path = String(url);
      if (path.endsWith('packaged-host-css-index.json')) {
        return {
          ok: true,
          json: async () => ({
            files: ['packaged-host-css-part-01.json', 'packaged-host-css-part-02.json'],
          }),
        } as Response;
      }
      if (path.endsWith('packaged-host-css-part-01.json')) {
        return { ok: true, json: async () => ({ 'www.example.com': '.from-part-one{}' }) } as Response;
      }
      if (path.endsWith('packaged-host-css-part-02.json')) {
        return { ok: true, json: async () => ({ 'www.other.test': '.from-part-two{}' }) } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    const css = await buildUserCssForHostname('www.example.com', new Map());
    expect(css).toContain('.from-part-one{}');
    expect(css).not.toContain('.from-part-two{}');
  });
});
