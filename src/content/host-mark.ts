import { hostSuffixes } from '../engine/util.js';

export function hostMarkValue(hostname: string): string {
  return hostSuffixes(hostname).join(' ');
}

/** Sync host marker so packaged CSS (`html[data-op-h~="…"]`) can match immediately. */
export function applyHostMark(): void {
  const html = document.documentElement;
  html.setAttribute('data-op-h', hostMarkValue(location.hostname));
  html.setAttribute('data-op', '1');
}

/**
 * Re-apply host suffixes while the extension is active on this page.
 * Packaged CSS selectors require `html[data-op-h~="host"]`.
 */
export function ensureHostMark(): void {
  const html = document.documentElement;
  if (html.getAttribute('data-op') !== '1') {
    return;
  }
  const suffixes = hostMarkValue(location.hostname);
  if (html.getAttribute('data-op-h') !== suffixes) {
    html.setAttribute('data-op-h', suffixes);
  }
}
