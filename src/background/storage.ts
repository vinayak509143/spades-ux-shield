import type { Action, CompiledProc, HostBucket, ProcOp } from '../engine/types.js';
import { fnv1a, hostSuffixes } from '../engine/util.js';

export const STORAGE_KEYS = {
  metaSubs: 'meta:subs',
  metaSettings: 'meta:settings',
  metaDisabledHosts: 'meta:disabledHosts',
  cssGeneric: 'css:generic',
} as const;

export interface SerializedRegex {
  source: string;
  flags: string;
}

export interface StoredHostBucket {
  hideSelectors: string[];
  exceptions: string[];
  pathCss: Array<{ pathRe: SerializedRegex; css: string }>;
  procedural: StoredCompiledProc[];
}

export interface StoredCompiledProc {
  ruleId: number;
  hosts: string[];
  entity: boolean;
  pathRe: SerializedRegex | null;
  selector: string;
  procedural: StoredProcOp[];
  action: StoredCompiledProc['action'];
}

export type StoredProcOp =
  | { type: 'has-text'; needle: string | SerializedRegex }
  | { type: 'matches-path'; pattern: string | SerializedRegex }
  | { type: 'matches-attr'; name: string; value?: string | SerializedRegex }
  | { type: 'matches-css'; property: string; value: string | SerializedRegex }
  | { type: 'upward'; steps: number | string }
  | { type: 'watch-attr'; names: string[] }
  | { type: 'min-text-length'; length: number };

export type StoredAction =
  | { type: 'hide' }
  | { type: 'uncheck' }
  | { type: 'click-dismiss' }
  | { type: 'unlock-scroll' }
  | { type: 'remove' }
  | { type: 'remove-attr'; pattern: string | SerializedRegex }
  | { type: 'remove-class'; pattern: string | SerializedRegex }
  | { type: 'style'; decls: Array<[string, string]> };

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
}

function serRegex(re: RegExp): SerializedRegex {
  return { source: re.source, flags: re.flags };
}

function serValue(value: string | RegExp): string | SerializedRegex {
  return value instanceof RegExp ? serRegex(value) : value;
}

export function registrableDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split('.').filter(Boolean);
  if (parts.length <= 2) {
    return parts.join('.');
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
    pathCss: bucket.pathCss.map((row) => ({
      pathRe: serRegex(row.pathRe),
      css: row.css,
    })),
    procedural: bucket.procedural.map(serializeCompiledProc),
  };
}

function serializeCompiledProc(rule: CompiledProc): StoredCompiledProc {
  return {
    ruleId: rule.ruleId,
    hosts: [...rule.hosts],
    entity: rule.entity,
    pathRe: rule.pathRe ? serRegex(rule.pathRe) : null,
    selector: rule.selector,
    procedural: rule.procedural.map(serializeProcOp),
    action: serializeAction(rule.action),
  };
}

function serializeProcOp(op: ProcOp): StoredProcOp {
  switch (op.type) {
    case 'has-text':
      return { type: op.type, needle: serValue(op.needle) };
    case 'matches-path':
      return { type: op.type, pattern: serValue(op.pattern) };
    case 'matches-attr':
      return {
        type: op.type,
        name: op.name,
        value: op.value === undefined ? undefined : serValue(op.value),
      };
    case 'matches-css':
      return {
        type: op.type,
        property: op.property,
        value: serValue(op.value),
      };
    default:
      return op;
  }
}

function serializeAction(action: Action): StoredAction {
  switch (action.type) {
    case 'remove-attr':
    case 'remove-class':
      return { ...action, pattern: serValue(action.pattern) };
    default:
      return action;
  }
}

function reviveRegex(value: string | SerializedRegex): RegExp | string {
  if (typeof value === 'string') {
    return value;
  }
  return new RegExp(value.source, value.flags);
}

export function reviveHostBucket(stored: StoredHostBucket): HostBucket {
  return {
    hideSelectors: [...stored.hideSelectors],
    exceptions: [...stored.exceptions],
    pathCss: stored.pathCss.map((row) => ({
      pathRe: new RegExp(row.pathRe.source, row.pathRe.flags),
      css: row.css,
    })),
    procedural: stored.procedural.map(reviveCompiledProc),
  };
}

function reviveCompiledProc(stored: StoredCompiledProc): CompiledProc {
  return {
    ruleId: stored.ruleId,
    hosts: [...stored.hosts],
    entity: stored.entity,
    pathRe: stored.pathRe ? new RegExp(stored.pathRe.source, stored.pathRe.flags) : null,
    selector: stored.selector,
    procedural: stored.procedural.map(reviveProcOp),
    action: reviveAction(stored.action),
  };
}

function reviveProcOp(op: StoredProcOp): ProcOp {
  switch (op.type) {
    case 'has-text':
      return { type: 'has-text', needle: reviveRegex(op.needle) };
    case 'matches-path':
      return { type: 'matches-path', pattern: reviveRegex(op.pattern) };
    case 'matches-attr':
      return {
        type: 'matches-attr',
        name: op.name,
        value: op.value === undefined ? undefined : reviveRegex(op.value),
      };
    case 'matches-css':
      return {
        type: 'matches-css',
        property: op.property,
        value: reviveRegex(op.value),
      };
    default:
      return op as ProcOp;
  }
}

function reviveAction(action: StoredAction): CompiledProc['action'] {
  switch (action.type) {
    case 'remove-attr':
    case 'remove-class':
      return { ...action, pattern: reviveRegex(action.pattern) };
    default:
      return action;
  }
}

export async function getMetaSettings(): Promise<MetaSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.metaSettings);
  const settings = result[STORAGE_KEYS.metaSettings] as MetaSettings | undefined;
  return (
    settings ?? {
      enabledGlobal: true,
      packagedRev: 0,
      compiledRev: 0,
      shardKeys: [],
    }
  );
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
  const suffixes = new Set(hostSuffixes(hostname));
  return Object.keys(shard).filter((host) => suffixes.has(host));
}
