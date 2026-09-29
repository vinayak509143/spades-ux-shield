import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseListVersion, syncAllSubscriptions } from '../../src/background/sync.js';
import { STORAGE_KEYS } from '../../src/background/storage.js';

describe('parseListVersion', () => {
  it('reads a numeric ! Version: and treats anything else as unknown', () => {
    expect(parseListVersion({ Version: '209901011200' })).toBe(209901011200);
    expect(parseListVersion({})).toBe(0);
    expect(parseListVersion({ Version: 'latest' })).toBe(0);
  });
});

describe('syncAllSubscriptions list version', () => {
  const store = new Map<string, unknown>();

  afterEach(() => {
    store.clear();
    vi.unstubAllGlobals();
  });

  function stubChrome(body: string): void {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: store.get(key) }),
          set: async (items: Record<string, unknown>) => {
            for (const [key, value] of Object.entries(items)) {
              store.set(key, value);
            }
          },
          remove: async (key: string) => {
            store.delete(key);
          },
        },
      },
    });
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => body,
    }));
  }

  it('stores ! Version: from the synced darklist', async () => {
    stubChrome('! Version: 209901011200\nexample.com##.nag\n');
    await syncAllSubscriptions();
    const settings = store.get(STORAGE_KEYS.metaSettings) as { syncedListVersion: number };
    expect(settings.syncedListVersion).toBe(209901011200);
  });

  it('stores 0 when the synced list has no version', async () => {
    stubChrome('example.com##.nag\n');
    await syncAllSubscriptions();
    const settings = store.get(STORAGE_KEYS.metaSettings) as { syncedListVersion: number };
    expect(settings.syncedListVersion).toBe(0);
  });
});
