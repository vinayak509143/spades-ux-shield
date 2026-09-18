import { registerMessageHandlers } from './messages.js';
import { ensureSessionAccessForContent } from './session-store.js';
import { buildUserCssForHostname } from './inject-css.js';
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

const shardMemory = new Map<string, HostShardRecord>();

async function prefetchShardForUrl(url: string): Promise<void> {
  try {
    const hostname = new URL(url).hostname;
    if (!hostname) {
      return;
    }
    const shardKey = shardKeyForHost(hostname);
    if (shardMemory.has(shardKey)) {
      return;
    }
    const record = await readHostShard(shardKey);
    shardMemory.set(shardKey, record);
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

async function injectUserCss(tabId: number, frameId: number, url: string): Promise<void> {
  try {
    const hostname = new URL(url).hostname;
    if (!hostname || !(await shouldInject(tabId, hostname))) {
      return;
    }
    const css = await buildUserCssForHostname(hostname, shardMemory);
    const amazon = /(^|\.)amazon\.in$/i.test(hostname);
    if (amazon) {
      await chrome.scripting.insertCSS({
        target: { tabId, frameIds: [frameId] },
        files: ['cosmetic-critical.css'],
        origin: 'USER',
      });
    }
    if (!css.trim()) {
      return;
    }
    await chrome.scripting.insertCSS({
      target: { tabId, frameIds: [frameId] },
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

registerMessageHandlers();

chrome.runtime.onInstalled.addListener(() => {
  void (async () => {
    await ensureSessionAccessForContent();
    await ensureSyncAlarm();
    await syncAllSubscriptions();
  })();
});

chrome.runtime.onStartup.addListener(() => {
  void (async () => {
    await ensureSessionAccessForContent();
    await ensureSyncAlarm();
  })();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== SYNC_ALARM) {
    return;
  }
  void syncAllSubscriptions();
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) {
    return;
  }
  void prefetchShardForUrl(details.url);
});

chrome.webNavigation.onCommitted.addListener((details) => {
  void injectUserCss(details.tabId, details.frameId, details.url);
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) {
    return;
  }
  sendRouteMessage(details.tabId, details.url);
});
