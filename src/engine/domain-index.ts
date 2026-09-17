import type { HostBucket } from './types.js';
import { hostSuffixes } from './util.js';

interface TrieNode {
  children: Map<string, TrieNode>;
  bucket: HostBucket | null;
}

function emptyBucket(): HostBucket {
  return {
    hideSelectors: [],
    exceptions: [],
    pathCss: [],
    procedural: [],
  };
}

function mergeBuckets(into: HostBucket, from: HostBucket): void {
  into.hideSelectors.push(...from.hideSelectors);
  into.exceptions.push(...from.exceptions);
  into.pathCss.push(...from.pathCss);
  into.procedural.push(...from.procedural);
}

export class DomainIndex {
  private readonly root: TrieNode = { children: new Map(), bucket: null };

  insert(host: string, bucket: HostBucket): void {
    const labels = host.toLowerCase().split('.').filter(Boolean);
    if (labels.length === 0) {
      return;
    }
    let node = this.root;
    for (const label of [...labels].reverse()) {
      let child = node.children.get(label);
      if (!child) {
        child = { children: new Map(), bucket: null };
        node.children.set(label, child);
      }
      node = child;
    }
    if (!node.bucket) {
      node.bucket = emptyBucket();
    }
    mergeBuckets(node.bucket, bucket);
  }

  lookupExact(host: string): HostBucket {
    const labels = host.toLowerCase().split('.').filter(Boolean);
    if (labels.length === 0) {
      return emptyBucket();
    }
    let node: TrieNode = this.root;
    for (const label of [...labels].reverse()) {
      const child = node.children.get(label);
      if (!child) {
        return emptyBucket();
      }
      node = child;
    }
    return node.bucket ? { ...node.bucket } : emptyBucket();
  }

  lookup(hostname: string): HostBucket {
    const merged = emptyBucket();
    for (const suffix of hostSuffixes(hostname)) {
      mergeBuckets(merged, this.lookupExact(suffix));
    }
    return merged;
  }
}
