import { hostBucketToCss } from '../engine/compiler.js';
import { hostSuffixes } from '../engine/util.js';
import {
  matchingHostsInShard,
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
  const shardKey = shardKeyForHost(hostname);
  let shard = shardCache.get(shardKey);
  if (!shard) {
    shard = await readHostShard(shardKey);
    shardCache.set(shardKey, shard);
  }

  const chunks: string[] = [];
  const packaged = await loadPackagedHostCss();
  for (const host of hostSuffixes(hostname)) {
    const css = packaged[host];
    if (css) {
      chunks.push(css);
    }
  }

  for (const host of matchingHostsInShard(hostname, shard)) {
    const bucket = shard[host];
    if (!bucket) {
      continue;
    }
    chunks.push(hostBucketToCss(host, reviveHostBucket(bucket)));
  }

  return chunks.filter(Boolean).join('\n');
}
