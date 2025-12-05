import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

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
    const used = await redis.get<number>(key) || 0;
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
  const key = `${KEY_PREFIX}${ip}`;
  await redis.del(key);
}

export default redis;
