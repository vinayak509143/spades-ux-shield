import { hostBucketToCss } from '../engine/compiler.js';
import { isValidCosmeticSelector } from '../engine/selector-valid.js';
import type { StoredCompiledProc } from '../engine/serialized.js';
import {
  listHostsForHostname,
  readHostShard,
  reviveHostBucket,
  shardKeyForHost,
  type HostShardRecord,
} from './storage.js';

let packagedHostCss: Record<string, string> | null = null;
let packagedHostCssPromise: Promise<Record<string, string>> | null = null;

async function loadPackagedHostCss(): Promise<Record<string, string>> {
  if (packagedHostCss) {
    return packagedHostCss;
  }
  if (!packagedHostCssPromise) {
    packagedHostCssPromise = (async () => {
      try {
        const url = chrome.runtime.getURL('dist/packaged-host-css.json');
        const response = await fetch(url);
        if (!response.ok) {
          return {};
        }
        return (await response.json()) as Record<string, string>;
      } catch {
        return {};
      }
    })();
  }
  packagedHostCss = await packagedHostCssPromise;
  return packagedHostCss;
}

/** Prefer documentId so a reused frameId cannot style the wrong iframe document. */
export function cssInjectionTarget(
  tabId: number,
  frameId: number,
  documentId?: string,
): chrome.scripting.InjectionTarget {
  if (documentId) {
    return { tabId, documentIds: [documentId] };
  }
  return { tabId, frameIds: [frameId] };
}

export async function buildUserCssForHostname(
  hostname: string,
  shardCache: Map<string, HostShardRecord>,
): Promise<string> {
  const chunks: string[] = [];
  const packaged = await loadPackagedHostCss();
  const hosts = listHostsForHostname(hostname);
  for (const host of hosts) {
    const css = packaged[host];
    if (css) {
      chunks.push(css);
    }
  }

  const seenShards = new Set<string>();
  for (const host of hosts) {
    const key = shardKeyForHost(host);
    if (!seenShards.has(key)) {
      seenShards.add(key);
      if (!shardCache.has(key)) {
        shardCache.set(key, await readHostShard(key));
      }
    }
    const bucket = shardCache.get(key)?.[host];
    if (!bucket) {
      continue;
    }
    chunks.push(hostBucketToCss(host, reviveHostBucket(bucket)));
  }

  return chunks.filter(Boolean).join('\n');
}

/** Procedural rules for this hostname only. Invalid selectors are dropped. */
export async function readProceduralForHostname(
  hostname: string,
  shardCache: Map<string, HostShardRecord>,
): Promise<StoredCompiledProc[]> {
  const hosts = listHostsForHostname(hostname);
  const out: StoredCompiledProc[] = [];
  const seen = new Set<number>();
  const seenShards = new Set<string>();
  for (const host of hosts) {
    const key = shardKeyForHost(host);
    if (!seenShards.has(key)) {
      seenShards.add(key);
      if (!shardCache.has(key)) {
        shardCache.set(key, await readHostShard(key));
      }
    }
    const bucket = shardCache.get(key)?.[host];
    if (!bucket) {
      continue;
    }
    for (const rule of bucket.procedural) {
      if (seen.has(rule.ruleId) || !isValidCosmeticSelector(rule.selector)) {
        continue;
      }
      seen.add(rule.ruleId);
      out.push(rule);
    }
  }
  return out;
}
