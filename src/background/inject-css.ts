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

const HOST_CSS_INDEX = 'dist/packaged-host-css-index.json';
const HOST_CSS_FILE = 'dist/packaged-host-css.json';
const HOST_CSS_PART = /^packaged-host-css-part-\d{2}\.json$/;

let packagedHostCss: Record<string, string> | null = null;
let packagedHostCssPromise: Promise<Record<string, string>> | null = null;

export function clearPackagedHostCssCache(): void {
  packagedHostCss = null;
  packagedHostCssPromise = null;
}

async function readExtensionJson(path: string): Promise<unknown | null> {
  try {
    const response = await fetch(chrome.runtime.getURL(path));
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

function isHostCssMap(value: unknown): value is Record<string, string> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === 'string');
}

async function loadPackagedHostCss(): Promise<Record<string, string>> {
  if (packagedHostCss) {
    return packagedHostCss;
  }
  if (!packagedHostCssPromise) {
    packagedHostCssPromise = (async () => {
      const index = await readExtensionJson(HOST_CSS_INDEX);
      const files =
        index != null &&
        typeof index === 'object' &&
        !Array.isArray(index) &&
        Array.isArray((index as { files?: unknown }).files)
          ? (index as { files: unknown[] }).files
          : null;
      if (files) {
        const partNames = files.filter(
          (file): file is string => typeof file === 'string' && HOST_CSS_PART.test(file),
        );
        if (partNames.length !== files.length) {
          return {};
        }
        const merged: Record<string, string> = {};
        for (const file of partNames) {
          const part = await readExtensionJson(`dist/${file}`);
          if (!isHostCssMap(part)) {
            return {};
          }
          Object.assign(merged, part);
        }
        return merged;
      }
      const single = await readExtensionJson(HOST_CSS_FILE);
      return isHostCssMap(single) ? single : {};
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
