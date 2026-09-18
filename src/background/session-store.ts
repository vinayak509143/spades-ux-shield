const MAX_HITS = 32;

export function tabOffKey(tabId: number): string {
  return `tab:${tabId}:off`;
}

export function tabHitsKey(tabId: number): string {
  return `tab:${tabId}:hits`;
}

export async function isTabDisabled(tabId: number): Promise<boolean> {
  const key = tabOffKey(tabId);
  const result = await chrome.storage.session.get(key);
  return Boolean(result[key]);
}

export async function setTabDisabled(tabId: number, disabled: boolean): Promise<void> {
  const key = tabOffKey(tabId);
  if (disabled) {
    await chrome.storage.session.set({ [key]: true });
  } else {
    await chrome.storage.session.remove(key);
  }
}

export async function recordRuleHit(tabId: number, ruleId: number): Promise<void> {
  const key = tabHitsKey(tabId);
  const result = await chrome.storage.session.get(key);
  const hits = (result[key] as number[] | undefined) ?? [];
  if (!hits.includes(ruleId)) {
    hits.push(ruleId);
  }
  while (hits.length > MAX_HITS) {
    hits.shift();
  }
  await chrome.storage.session.set({ [key]: hits });
}

export async function getTabRuleHits(tabId: number): Promise<number[]> {
  const key = tabHitsKey(tabId);
  const result = await chrome.storage.session.get(key);
  return (result[key] as number[] | undefined) ?? [];
}

export async function clearTabSession(tabId: number): Promise<void> {
  await chrome.storage.session.remove([tabOffKey(tabId), tabHitsKey(tabId)]);
}
