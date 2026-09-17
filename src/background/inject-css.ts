import { hostBucketToCss } from '../engine/compiler.js';
import {
  getGenericCss,
  matchingHostsInShard,
  readHostShard,
  reviveHostBucket,
  shardKeyForHost,
  type HostShardRecord,
} from './storage.js';

export async function buildUserCssForHostname(
  hostname: string,
  shardCache: Map<string, HostShardRecord>,
): Promise<string> {
  const generic = await getGenericCss();
  const shardKey = shardKeyForHost(hostname);
  let shard = shardCache.get(shardKey);
  if (!shard) {
    shard = await readHostShard(shardKey);
    shardCache.set(shardKey, shard);
  }

  const chunks: string[] = [];
  if (generic.trim()) {
    chunks.push(generic);
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
