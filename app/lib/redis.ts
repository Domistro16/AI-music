import Redis from 'ioredis';

// Initialize Redis client for Railway
const getRedisClient = (): Redis | null => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('[Redis] REDIS_URL not configured');
    return null;
  }

  return new Redis(redisUrl);
};

const redis = getRedisClient();

const FREE_TRIAL_LIMIT = 2;
const KEY_PREFIX = 'music_gen:ip:';

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

  try {
    if (!redis) {
      // If Redis not configured, allow access (fail open for development)
      return {
        remaining: FREE_TRIAL_LIMIT,
        used: 0,
        limit: FREE_TRIAL_LIMIT,
        hasTrialsLeft: true,
      };
    }

    const usedStr = await redis.get(key);
    const used = usedStr ? parseInt(usedStr, 10) : 0;
    const remaining = Math.max(0, FREE_TRIAL_LIMIT - used);

    return {
      remaining,
      used,
      limit: FREE_TRIAL_LIMIT,
      hasTrialsLeft: remaining > 0,
    };
  } catch (error) {
    console.error('Redis error getting trial status:', error);
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

  try {
    if (!redis) {
      return {
        remaining: 0,
        used: FREE_TRIAL_LIMIT,
        limit: FREE_TRIAL_LIMIT,
        hasTrialsLeft: false,
      };
    }

    const newCount = await redis.incr(key);

    // Set expiration to 30 days if this is the first increment
    if (newCount === 1) {
      await redis.expire(key, 60 * 60 * 24 * 30); // 30 days
    }

    const remaining = Math.max(0, FREE_TRIAL_LIMIT - newCount);

    return {
      remaining,
      used: newCount,
      limit: FREE_TRIAL_LIMIT,
      hasTrialsLeft: remaining > 0,
    };
  } catch (error) {
    console.error('Redis error incrementing trial:', error);
    // Return that trials are exhausted if we can't track
    return {
      remaining: 0,
      used: FREE_TRIAL_LIMIT,
      limit: FREE_TRIAL_LIMIT,
      hasTrialsLeft: false,
    };
  }
}

/**
 * Reset trials for an IP (admin function)
 */
export async function resetTrials(ip: string): Promise<void> {
  if (!redis) return;
  const key = `${KEY_PREFIX}${ip}`;
  await redis.del(key);
}

export default redis;
