import { isAmazonEnHost, isAmazonRetailHost } from '../engine/amazon-retail.js';
import { hostSuffixes } from '../engine/util.js';

export function hostMarkValue(hostname: string): string {
  return hostSuffixes(hostname).join(' ');
}

export function applyAmazonRetailMarks(html: HTMLElement, hostname: string): void {
  if (isAmazonRetailHost(hostname)) {
    html.setAttribute('data-op-amz', '1');
  } else {
    html.removeAttribute('data-op-amz');
  }
  if (isAmazonEnHost(hostname)) {
    html.setAttribute('data-op-amz-en', '1');
  } else {
    html.removeAttribute('data-op-amz-en');
  }
}

/** Sync host marker so packaged CSS (`html[data-op-h~="…"]`) can match immediately. */
export function applyHostMark(): void {
  const html = document.documentElement;
  const hostname = location.hostname;
  html.setAttribute('data-op-h', hostMarkValue(hostname));
  html.setAttribute('data-op', '1');
  applyAmazonRetailMarks(html, hostname);
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
  const hostname = location.hostname;
  const suffixes = hostMarkValue(hostname);
  if (html.getAttribute('data-op-h') !== suffixes) {
    html.setAttribute('data-op-h', suffixes);
  }
  applyAmazonRetailMarks(html, hostname);
}
