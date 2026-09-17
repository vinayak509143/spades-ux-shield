import { compileRules } from '../engine/compiler.js';
import { parseList } from '../engine/parser.js';
import type { Rule } from '../engine/types.js';
import manifest from './subscriptions.json';
import {
  getMetaSettings,
  getSubscriptionMeta,
  groupBucketsByShard,
  setGenericCss,
  setMetaSettings,
  setSubscriptionMeta,
  type MetaSettings,
  type SubscriptionMeta,
} from './storage.js';

export const SYNC_ALARM = 'op-sync';
export const SYNC_PERIOD_MINUTES = 720;

export interface SubscriptionManifest {
  schemaVersion: number;
  packagedRev: number;
  lists: Array<{
    id: string;
    title: string;
    enabledByDefault: boolean;
    primaryUrl: string;
    mirrors: string[];
    issues?: string;
  }>;
}

export function getSubscriptionManifest(): SubscriptionManifest {
  return manifest as SubscriptionManifest;
}

export async function ensureSyncAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(SYNC_ALARM);
  if (!existing) {
    await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_PERIOD_MINUTES });
  }
}

function listUrls(entry: SubscriptionManifest['lists'][0]): string[] {
  return [entry.primaryUrl, ...entry.mirrors];
}

function parseGitSha(directives: Record<string, string>): string | null {
  return directives['Git-SHA'] ?? directives['Git-sha'] ?? null;
}

interface FetchResult {
  status: number;
  body: string | null;
  etag: string | null;
  lastModified: string | null;
}

async function fetchList(url: string, etag: string | null, lastModified: string | null): Promise<FetchResult> {
  const headers: Record<string, string> = {};
  if (etag) {
    headers['If-None-Match'] = etag;
  }
  if (lastModified) {
    headers['If-Modified-Since'] = lastModified;
  }
  const response = await fetch(url, { headers, cache: 'no-store' });
  const responseEtag = response.headers.get('etag');
  const responseModified = response.headers.get('last-modified');
  if (response.status === 304) {
    return {
      status: 304,
      body: null,
      etag: responseEtag ?? etag,
      lastModified: responseModified ?? lastModified,
    };
  }
  if (!response.ok) {
    return {
      status: response.status,
      body: null,
      etag: responseEtag ?? etag,
      lastModified: responseModified ?? lastModified,
    };
  }
  const body = await response.text();
  return {
    status: response.status,
    body,
    etag: responseEtag ?? etag,
    lastModified: responseModified ?? lastModified,
  };
}

async function fetchFromMirrors(
  urls: string[],
  etag: string | null,
  lastModified: string | null,
): Promise<FetchResult | null> {
  for (const url of urls) {
    try {
      const result = await fetchList(url, etag, lastModified);
      if (result.status === 304 || (result.status === 200 && result.body !== null)) {
        return result;
      }
    } catch {
      // Try next mirror.
    }
  }
  return null;
}

export async function ensureSubscriptionMeta(): Promise<SubscriptionMeta[]> {
  const existing = await getSubscriptionMeta();
  if (existing.length > 0) {
    return existing;
  }
  const spec = getSubscriptionManifest();
  const seeded: SubscriptionMeta[] = spec.lists.map((list) => ({
    id: list.id,
    title: list.title,
    enabled: list.enabledByDefault,
    etag: null,
    lastModified: null,
    gitSha: null,
    fetchedAt: null,
    bytes: 0,
    parseErrors: 0,
  }));
  await setSubscriptionMeta(seeded);
  return seeded;
}

async function persistCompiledRules(rules: Rule[], compiledRev: number): Promise<number> {
  const compiled = compileRules(rules);
  const shards = groupBucketsByShard(compiled.hostBuckets);
  const settings = await getMetaSettings();

  for (const oldKey of settings.shardKeys ?? []) {
    await chrome.storage.local.remove(oldKey);
  }

  const shardKeys: string[] = [];
  for (const [key, record] of shards) {
    await chrome.storage.local.set({ [key]: record });
    shardKeys.push(key);
  }

  await setGenericCss('');
  await setMetaSettings({
    ...settings,
    packagedRev: getSubscriptionManifest().packagedRev,
    compiledRev,
    shardKeys,
  });

  return compiled.errors.length;
}

export async function syncSubscription(
  entry: SubscriptionManifest['lists'][0],
  meta: SubscriptionMeta,
): Promise<SubscriptionMeta> {
  if (!meta.enabled) {
    return meta;
  }

  const result = await fetchFromMirrors(listUrls(entry), meta.etag, meta.lastModified);
  if (!result) {
    return meta;
  }

  const now = Date.now();
  if (result.status === 304) {
    return {
      ...meta,
      etag: result.etag,
      lastModified: result.lastModified,
      fetchedAt: now,
    };
  }

  if (result.status !== 200 || result.body === null) {
    return meta;
  }

  const parsed = parseList(result.body);
  const gitSha = parseGitSha(parsed.directives);
  const parseErrors = parsed.errors.length;
  const compiledRev = Number(parsed.directives.Version?.replace(/\D/g, '').slice(0, 12)) || now;

  await persistCompiledRules(parsed.rules, compiledRev);

  return {
    ...meta,
    etag: result.etag,
    lastModified: result.lastModified,
    gitSha,
    fetchedAt: now,
    bytes: result.body.length,
    parseErrors,
  };
}

export async function syncAllSubscriptions(): Promise<void> {
  const spec = getSubscriptionManifest();
  const metas = await ensureSubscriptionMeta();
  const byId = new Map(metas.map((row) => [row.id, row]));
  const updated: SubscriptionMeta[] = [];

  const allRules: Rule[] = [];

  for (const entry of spec.lists) {
    const current = byId.get(entry.id) ?? {
      id: entry.id,
      title: entry.title,
      enabled: entry.enabledByDefault,
      etag: null,
      lastModified: null,
      gitSha: null,
      fetchedAt: null,
      bytes: 0,
      parseErrors: 0,
    };

    if (!current.enabled) {
      updated.push(current);
      continue;
    }

    const result = await fetchFromMirrors(listUrls(entry), current.etag, current.lastModified);
    if (!result) {
      updated.push(current);
      continue;
    }

    const now = Date.now();
    if (result.status === 304) {
      updated.push({
        ...current,
        etag: result.etag,
        lastModified: result.lastModified,
        fetchedAt: now,
      });
      continue;
    }

    if (result.status === 200 && result.body !== null) {
      const parsed = parseList(result.body);
      allRules.push(...parsed.rules);
      updated.push({
        ...current,
        etag: result.etag,
        lastModified: result.lastModified,
        gitSha: parseGitSha(parsed.directives),
        fetchedAt: now,
        bytes: result.body.length,
        parseErrors: parsed.errors.length,
      });
    } else {
      updated.push(current);
    }
  }

  if (allRules.length > 0) {
    const compiledRev = Date.now();
    const totalParseErrors = await persistCompiledRules(allRules, compiledRev);
    for (const row of updated) {
      if (row.enabled) {
        row.parseErrors = totalParseErrors;
      }
    }
  }

  await setSubscriptionMeta(updated);
}
