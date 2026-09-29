import {
  reviveCompiledProc,
  serializeCompiledProc,
  type SerializedRegex,
  type StoredAction,
  type StoredCompiledProc,
  type StoredProcOp,
} from '../engine/serialized.js';
import type { HostBucket } from '../engine/types.js';
import { AMAZON_EN_ALIAS, AMAZON_RETAIL_ALIAS } from '../engine/amazon-retail.js';
import { isAmazonEnHost, isAmazonRetailHost } from '../engine/amazon-retail.js';
import { fnv1a, hostSuffixes } from '../engine/util.js';

export type { SerializedRegex, StoredAction, StoredCompiledProc, StoredProcOp };
export { reviveCompiledProc, serializeCompiledProc };

export const STORAGE_KEYS = {
  metaSubs: 'meta:subs',
  metaSettings: 'meta:settings',
  metaDisabledHosts: 'meta:disabledHosts',
  cssGeneric: 'css:generic',
} as const;

export interface StoredHostBucket {
  hideSelectors: string[];
  exceptions: string[];
  procedural: StoredCompiledProc[];
}

export type HostShardRecord = Record<string, StoredHostBucket>;

export interface SubscriptionMeta {
  id: string;
  title: string;
  enabled: boolean;
  etag: string | null;
  lastModified: string | null;
  gitSha: string | null;
  fetchedAt: number | null;
  bytes: number;
  parseErrors: number;
}

export interface MetaSettings {
  enabledGlobal: boolean;
  packagedRev: number;
  compiledRev: number;
  shardKeys: string[];
  /** `! Version:` of the last synced darklist. 0 when unknown. */
  syncedListVersion: number;
}

const TWO_PART_PUBLIC_SUFFIX = /^(co|com|net|org|gov|edu|ac)$/;

export function registrableDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split('.').filter(Boolean);
  if (parts.length <= 2) {
    return parts.join('.');
  }
  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  if (tld.length === 2 && TWO_PART_PUBLIC_SUFFIX.test(sld) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

export function shardKeyForHost(hostname: string): string {
  const hex = (fnv1a(registrableDomain(hostname)) & 0xffff).toString(16).padStart(4, '0');
  return `host:${hex}`;
}

export function serializeHostBucket(bucket: HostBucket): StoredHostBucket {
  return {
    hideSelectors: [...bucket.hideSelectors],
    exceptions: [...bucket.exceptions],
    procedural: bucket.procedural.map(serializeCompiledProc),
  };
}

export function reviveHostBucket(stored: StoredHostBucket): HostBucket {
  return {
    hideSelectors: [...stored.hideSelectors],
    exceptions: [...stored.exceptions],
    procedural: stored.procedural.map(reviveCompiledProc),
  };
}

export async function getMetaSettings(): Promise<MetaSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.metaSettings);
  const settings = result[STORAGE_KEYS.metaSettings] as MetaSettings | undefined;
  return {
    enabledGlobal: settings?.enabledGlobal ?? true,
    packagedRev: settings?.packagedRev ?? 0,
    compiledRev: settings?.compiledRev ?? 0,
    shardKeys: settings?.shardKeys ?? [],
    syncedListVersion: settings?.syncedListVersion ?? 0,
  };
}

export async function setMetaSettings(settings: MetaSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.metaSettings]: settings });
}

export async function getDisabledHosts(): Promise<Set<string>> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.metaDisabledHosts);
  const list = result[STORAGE_KEYS.metaDisabledHosts] as string[] | undefined;
  return new Set(list ?? []);
}

export async function isHostDisabled(hostname: string): Promise<boolean> {
  const disabled = await getDisabledHosts();
  const registrable = registrableDomain(hostname);
  return disabled.has(registrable) || disabled.has(hostname);
}

export async function setDomainDisabled(registrable: string, disabled: boolean): Promise<void> {
  const hosts = await getDisabledHosts();
  if (disabled) {
    hosts.add(registrable);
  } else {
    hosts.delete(registrable);
  }
  await chrome.storage.local.set({
    [STORAGE_KEYS.metaDisabledHosts]: [...hosts],
  });
}

export async function getSubscriptionMeta(): Promise<SubscriptionMeta[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.metaSubs);
  return (result[STORAGE_KEYS.metaSubs] as SubscriptionMeta[] | undefined) ?? [];
}

export async function setSubscriptionMeta(subs: SubscriptionMeta[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.metaSubs]: subs });
}

export async function getGenericCss(): Promise<string> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.cssGeneric);
  return (result[STORAGE_KEYS.cssGeneric] as string | undefined) ?? '';
}

export async function setGenericCss(css: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.cssGeneric]: css });
}

export async function readHostShard(shardKey: string): Promise<HostShardRecord> {
  const result = await chrome.storage.local.get(shardKey);
  return (result[shardKey] as HostShardRecord | undefined) ?? {};
}

export async function writeHostShard(shardKey: string, record: HostShardRecord): Promise<void> {
  await chrome.storage.local.set({ [shardKey]: record });
}

export function groupBucketsByShard(
  hostBuckets: Map<string, HostBucket>,
): Map<string, HostShardRecord> {
  const shards = new Map<string, HostShardRecord>();
  for (const [host, bucket] of hostBuckets) {
    const key = shardKeyForHost(host);
    let record = shards.get(key);
    if (!record) {
      record = {};
      shards.set(key, record);
    }
    record[host] = serializeHostBucket(bucket);
  }
  return shards;
}

export function matchingHostsInShard(hostname: string, shard: HostShardRecord): string[] {
  const suffixes = new Set(listHostsForHostname(hostname));
  return Object.keys(shard).filter((host) => suffixes.has(host));
}

/** Hostname suffixes plus Amazon list aliases, which are not DNS suffixes. */
export function listHostsForHostname(hostname: string): string[] {
  const hosts = hostSuffixes(hostname);
  if (isAmazonRetailHost(hostname)) {
    hosts.push(AMAZON_RETAIL_ALIAS);
  }
  if (isAmazonEnHost(hostname)) {
    hosts.push(AMAZON_EN_ALIAS);
  }
  return hosts;
}
