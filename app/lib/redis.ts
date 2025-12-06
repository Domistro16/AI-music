import Redis from 'ioredis';

const FREE_TRIAL_LIMIT = 2;
const KEY_PREFIX = 'music_gen:ip:';

// Lazy initialization for serverless environments
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) {
    return redis;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('[Redis] REDIS_URL not configured');
    return null;
  }

  try {
    // Parse the URL to check if we need TLS
    const url = new URL(redisUrl);
    const useTls = url.protocol === 'rediss:' || url.hostname.includes('railway.app');

    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 100,
      connectTimeout: 10000,
      commandTimeout: 5000,
      // Enable TLS for Railway (they use rediss:// or require TLS)
      tls: useTls ? { rejectUnauthorized: false } : undefined,
      // Disable offline queue to fail fast in serverless
      enableOfflineQueue: false,
      // Reconnect strategy for serverless
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    return redis;
  } catch (error) {
    console.error('[Redis] Failed to create client:', error);
    return null;
  }
}

export interface TrialStatus {
  remaining: number;
  used: number;
  limit: number;
  hasTrialsLeft: boolean;
}

/**
 * Get the trial status for a given IP address
 */
export async function getTrialStatus(ip: string): Promise<TrialStatus> {
  const key = `${KEY_PREFIX}${ip}`;
  const client = getRedisClient();

  try {
    if (!client) {
      // If Redis not configured, allow access (fail open for development)
      console.log('[Redis] No client, allowing access');
      return {
        remaining: FREE_TRIAL_LIMIT,
        used: 0,
        limit: FREE_TRIAL_LIMIT,
        hasTrialsLeft: true,
      };
    }

    // Ensure connection is established
    if (client.status !== 'ready') {
      await client.connect();
    }

    const usedStr = await client.get(key);
    const used = usedStr ? parseInt(usedStr, 10) : 0;
    const remaining = Math.max(0, FREE_TRIAL_LIMIT - used);

    return {
      remaining,
      used,
      limit: FREE_TRIAL_LIMIT,
      hasTrialsLeft: remaining > 0,
    };
  } catch (error) {
    console.error('[Redis] Error getting trial status:', error);
    // If Redis fails, allow access (fail open for better UX)
    return {
      remaining: FREE_TRIAL_LIMIT,
      used: 0,
      limit: FREE_TRIAL_LIMIT,
      hasTrialsLeft: true,
    };
  }
}

/**
 * Increment the usage count for a given IP address
 */
export async function incrementTrialUsage(ip: string): Promise<TrialStatus> {
  const key = `${KEY_PREFIX}${ip}`;
  const client = getRedisClient();

  try {
    if (!client) {
      // If no Redis, still allow but don't track
      return {
        remaining: FREE_TRIAL_LIMIT - 1,
        used: 1,
        limit: FREE_TRIAL_LIMIT,
        hasTrialsLeft: true,
      };
    }

    // Ensure connection is established
    if (client.status !== 'ready') {
      await client.connect();
    }

    const newCount = await client.incr(key);

    // Set expiration to 30 days if this is the first increment
    if (newCount === 1) {
      await client.expire(key, 60 * 60 * 24 * 30); // 30 days
    }

    const remaining = Math.max(0, FREE_TRIAL_LIMIT - newCount);

    return {
      remaining,
      used: newCount,
      limit: FREE_TRIAL_LIMIT,
      hasTrialsLeft: remaining > 0,
    };
  } catch (error) {
    console.error('[Redis] Error incrementing trial:', error);
    // On error, allow access but indicate usage
    return {
      remaining: FREE_TRIAL_LIMIT - 1,
      used: 1,
      limit: FREE_TRIAL_LIMIT,
      hasTrialsLeft: true,
    };
  }
}

/**
 * Reset trials for an IP (admin function)
 */
export async function resetTrials(ip: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    if (client.status !== 'ready') {
      await client.connect();
    }
    const key = `${KEY_PREFIX}${ip}`;
    await client.del(key);
  } catch (error) {
    console.error('[Redis] Error resetting trials:', error);
  }
}

export default redis;
