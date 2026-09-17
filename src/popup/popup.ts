import { buildBreakageReportUrl } from './report.js';

interface PopupState {
  tabActive: boolean;
  domainActive: boolean;
  ruleHits: number[];
}

const tabToggle = document.getElementById('tab-active') as HTMLInputElement;
const domainToggle = document.getElementById('domain-active') as HTMLInputElement;
const reportLink = document.getElementById('report') as HTMLAnchorElement;

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    throw new Error('No active tab');
  }
  return tab;
}

async function loadState(): Promise<void> {
  const tab = await getActiveTab();
  const hostname = new URL(tab.url!).hostname;
  const state = await chrome.runtime.sendMessage({
    type: 'op:get-popup-state',
    tabId: tab.id,
    hostname,
  }) as PopupState;

  tabToggle.checked = state.tabActive;
  domainToggle.checked = state.domainActive;
}

tabToggle.addEventListener('change', () => {
  void (async () => {
    const tab = await getActiveTab();
    const hostname = new URL(tab.url!).hostname;
    await chrome.runtime.sendMessage({
      type: 'op:set-tab-active',
      tabId: tab.id,
      active: tabToggle.checked,
      hostname,
    });
  })();
});

domainToggle.addEventListener('change', () => {
  void (async () => {
    const tab = await getActiveTab();
    const hostname = new URL(tab.url!).hostname;
    await chrome.runtime.sendMessage({
      type: 'op:set-domain-active',
      tabId: tab.id,
      active: domainToggle.checked,
      hostname,
    });
    if (!domainToggle.checked) {
      tabToggle.checked = false;
    }
  })();
});

reportLink.addEventListener('click', (event) => {
  event.preventDefault();
  void (async () => {
    const tab = await getActiveTab();
    const url = await buildBreakageReportUrl(tab.id!, tab.url!);
    await chrome.tabs.create({ url, active: true });
  })();
});

void loadState().catch(() => {
  tabToggle.checked = true;
  domainToggle.checked = true;
});
