import { isAmazonRetailHost } from '../engine/amazon-retail.js';
import { registerMessageHandlers } from './messages.js';
import { buildUserCssForHostname, cssInjectionTarget } from './inject-css.js';
import {
  ensureSyncAlarm,
  syncAllSubscriptions,
  SYNC_ALARM,
} from './sync.js';
import { isTabDisabled } from './session-store.js';
import {
  getMetaSettings,
  isHostDisabled,
  readHostShard,
  shardKeyForHost,
  type HostShardRecord,
} from './storage.js';

const SHARD_MEMORY_CAP = 256;

const shardMemory = new Map<string, HostShardRecord>();

export function clearShardMemoryCache(): void {
  shardMemory.clear();
}

function capShardMemory(): void {
  if (shardMemory.size > SHARD_MEMORY_CAP) {
    shardMemory.clear();
  }
}

async function prefetchShardForUrl(url: string): Promise<void> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return;
    }
    const hostname = parsed.hostname;
    if (!hostname) {
      return;
    }
    const shardKey = shardKeyForHost(hostname);
    if (shardMemory.has(shardKey)) {
      return;
    }
    const record = await readHostShard(shardKey);
    shardMemory.set(shardKey, record);
    capShardMemory();
  } catch {
    // Invalid URL — ignore.
  }
}

async function shouldInject(tabId: number, hostname: string): Promise<boolean> {
  const settings = await getMetaSettings();
  if (!settings.enabledGlobal) {
    return false;
  }
  if (await isTabDisabled(tabId)) {
    return false;
  }
  if (await isHostDisabled(hostname)) {
    return false;
  }
  return true;
}

async function injectUserCss(
  tabId: number,
  frameId: number,
  url: string,
  documentId?: string,
): Promise<void> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return;
    }
    const hostname = parsed.hostname;
    if (!hostname || !(await shouldInject(tabId, hostname))) {
      return;
    }
    const css = await buildUserCssForHostname(hostname, shardMemory);
    const target = cssInjectionTarget(tabId, frameId, documentId);
    if (isAmazonRetailHost(hostname)) {
      await chrome.scripting.insertCSS({
        target,
        files: ['cosmetic-critical.css'],
        origin: 'USER',
      });
    }
    if (!css.trim()) {
      return;
    }
    await chrome.scripting.insertCSS({
      target,
      css,
      origin: 'USER',
    });
  } catch {
    // Frame gone or injection blocked — ignore.
  }
}

function sendRouteMessage(tabId: number, url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return;
    }
    chrome.tabs
      .sendMessage(tabId, {
        type: 'op:route',
        path: parsed.pathname,
        search: parsed.search,
      })
      .catch(() => {
        // Content script not ready.
      });
  } catch {
    // Invalid URL.
  }
}

async function runSyncAndClearShardCache(): Promise<void> {
  try {
    await syncAllSubscriptions();
    clearShardMemoryCache();
  } catch {
    // Sync failed — keep existing shards until next alarm.
  }
}

registerMessageHandlers();

chrome.runtime.onInstalled.addListener(() => {
  void (async () => {
    try {
      await ensureSyncAlarm();
      await runSyncAndClearShardCache();
    } catch {
      // Alarm or sync setup failed.
    }
  })();
});

chrome.runtime.onStartup.addListener(() => {
  void (async () => {
    try {
      await ensureSyncAlarm();
    } catch {
      // Alarm setup failed.
    }
  })();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== SYNC_ALARM) {
    return;
  }
  void runSyncAndClearShardCache();
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) {
    return;
  }
  void prefetchShardForUrl(details.url);
});

chrome.webNavigation.onCommitted.addListener((details) => {
  void injectUserCss(details.tabId, details.frameId, details.url, details.documentId);
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) {
    return;
  }
  sendRouteMessage(details.tabId, details.url);
});
