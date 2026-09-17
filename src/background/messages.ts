import {
  getMetaSettings,
  isHostDisabled,
  registrableDomain,
  setDomainDisabled,
} from './storage.js';
import {
  getTabRuleHits,
  isTabDisabled,
  recordRuleHit,
  setTabDisabled,
} from './session-store.js';

export interface PopupState {
  tabActive: boolean;
  domainActive: boolean;
  ruleHits: number[];
}

async function isExtensionActiveForTab(
  tabId: number,
  hostname: string,
): Promise<{ tabActive: boolean; domainActive: boolean }> {
  const settings = await getMetaSettings();
  if (!settings.enabledGlobal) {
    return { tabActive: false, domainActive: false };
  }
  const tabOff = await isTabDisabled(tabId);
  const domainOff = hostname ? await isHostDisabled(hostname) : false;
  return {
    tabActive: !tabOff,
    domainActive: !domainOff,
  };
}

function resolveTabId(message: { tabId?: number }, sender: chrome.runtime.MessageSender): number | undefined {
  if (typeof message.tabId === 'number') {
    return message.tabId;
  }
  return sender.tab?.id;
}

export function registerMessageHandlers(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== 'object') {
      return;
    }

    const tabId = resolveTabId(message, sender);

    if (message.type === 'op:query-state' && tabId !== undefined) {
      void (async () => {
        const hostname = sender.tab?.url ? new URL(sender.tab.url).hostname : '';
        const state = await isExtensionActiveForTab(tabId, hostname);
        const active = state.tabActive && state.domainActive;
        sendResponse({ active, ...state });
      })();
      return true;
    }

    if (message.type === 'op:rule-hit' && tabId !== undefined && typeof message.ruleId === 'number') {
      void recordRuleHit(tabId, message.ruleId);
      return;
    }

    if (message.type === 'op:get-popup-state' && tabId !== undefined) {
      void (async () => {
        const hostname = typeof message.hostname === 'string' ? message.hostname : '';
        const state = await isExtensionActiveForTab(tabId, hostname);
        const hits = await getTabRuleHits(tabId);
        sendResponse({ ...state, ruleHits: hits } satisfies PopupState);
      })();
      return true;
    }

    if (message.type === 'op:set-tab-active' && tabId !== undefined && typeof message.active === 'boolean') {
      void (async () => {
        await setTabDisabled(tabId, !message.active);
        const hostname = typeof message.hostname === 'string' ? message.hostname : '';
        const domainActive = hostname ? !(await isHostDisabled(hostname)) : true;
        await chrome.tabs.sendMessage(tabId, {
          type: 'op:set-active',
          active: message.active && domainActive,
        });
        sendResponse({ ok: true });
      })();
      return true;
    }

    if (
      message.type === 'op:set-domain-active' &&
      tabId !== undefined &&
      typeof message.active === 'boolean' &&
      typeof message.hostname === 'string'
    ) {
      void (async () => {
        const reg = registrableDomain(message.hostname);
        await setDomainDisabled(reg, !message.active);
        const tabState = await isExtensionActiveForTab(tabId, message.hostname);
        const combinedActive = tabState.tabActive && message.active;
        await chrome.tabs.sendMessage(tabId, {
          type: 'op:set-active',
          active: combinedActive,
        });
        sendResponse({ ok: true });
      })();
      return true;
    }

    return undefined;
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    void chrome.storage.session.remove([`tab:${tabId}:off`, `tab:${tabId}:hits`]);
  });
}
