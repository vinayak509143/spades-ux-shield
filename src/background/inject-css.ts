import { hostBucketToCss } from '../engine/compiler.js';
import {
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
  const shardKey = shardKeyForHost(hostname);
  let shard = shardCache.get(shardKey);
  if (!shard) {
    shard = await readHostShard(shardKey);
    shardCache.set(shardKey, shard);
  }

  const chunks: string[] = [];

  for (const host of matchingHostsInShard(hostname, shard)) {
    const bucket = shard[host];
    if (!bucket) {
      continue;
    }
    chunks.push(hostBucketToCss(host, reviveHostBucket(bucket)));
  }

  return chunks.filter(Boolean).join('\n');
}
