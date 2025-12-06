import Redis from 'ioredis';

const FREE_TRIAL_LIMIT = 2;
const KEY_PREFIX = 'music_gen:ip:';
const TASK_PREFIX = 'music_gen:task:';
const TRACK_PREFIX = 'music_gen:track:';
const TRACKS_LIST_KEY = 'music_gen:tracks_list';

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
      connectTimeout: 10000,
      // Enable TLS for Railway
      tls: useTls ? { rejectUnauthorized: false } : undefined,
      // Disable offline queue to fail fast in serverless
      enableOfflineQueue: false,
      // Lazy connect for serverless
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

async function ensureConnection(client: Redis): Promise<void> {
  if (client.status !== 'ready') {
    await client.connect();
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
      return {
        remaining: FREE_TRIAL_LIMIT - 1,
        used: 1,
        limit: FREE_TRIAL_LIMIT,
        hasTrialsLeft: true,
      };
    }

    if (client.status !== 'ready') {
      await client.connect();
    }

    const newCount = await client.incr(key);

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
    await ensureConnection(client);
    const key = `${KEY_PREFIX}${ip}`;
    await client.del(key);
  } catch (error) {
    console.error('[Redis] Error resetting trials:', error);
  }
}

// ============================================
// Task Management (for async Suno generation)
// ============================================

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface GenerationTask {
  id: string;
  status: TaskStatus;
  prompt: string;
  instrumental?: boolean;
  style?: string;
  title?: string;
  sunoTaskId?: string;
  audioUrl?: string;
  imageUrl?: string;
  duration?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a new generation task
 */
export async function createTask(task: Omit<GenerationTask, 'updatedAt'>): Promise<GenerationTask> {
  const client = getRedisClient();
  const fullTask: GenerationTask = {
    ...task,
    updatedAt: new Date().toISOString(),
  };

  if (client) {
    try {
      await ensureConnection(client);
      const key = `${TASK_PREFIX}${task.id}`;
      await client.setex(key, 60 * 60, JSON.stringify(fullTask)); // 1 hour TTL
    } catch (error) {
      console.error('[Redis] Error creating task:', error);
    }
  }

  return fullTask;
}

/**
 * Get a task by ID
 */
export async function getTask(taskId: string): Promise<GenerationTask | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    await ensureConnection(client);
    const key = `${TASK_PREFIX}${taskId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[Redis] Error getting task:', error);
    return null;
  }
}

/**
 * Update a task
 */
export async function updateTask(taskId: string, updates: Partial<GenerationTask>): Promise<GenerationTask | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    await ensureConnection(client);
    const key = `${TASK_PREFIX}${taskId}`;
    const existing = await client.get(key);

    if (!existing) return null;

    const task = JSON.parse(existing) as GenerationTask;
    const updatedTask: GenerationTask = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await client.setex(key, 60 * 60, JSON.stringify(updatedTask)); // Reset TTL
    return updatedTask;
  } catch (error) {
    console.error('[Redis] Error updating task:', error);
    return null;
  }
}

// ============================================
// Track Storage (public music library)
// ============================================

export interface StoredTrack {
  id: string;
  audioUrl: string;
  imageUrl?: string;
  prompt: string;
  title?: string;
  style?: string;
  instrumental?: boolean;
  duration?: number;
  createdAt: string;
}

/**
 * Save a completed track to the public library
 */
export async function saveTrack(track: StoredTrack): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await ensureConnection(client);
    const key = `${TRACK_PREFIX}${track.id}`;

    // Store the track data
    await client.set(key, JSON.stringify(track));

    // Add to the sorted set (sorted by timestamp for ordering)
    const timestamp = new Date(track.createdAt).getTime();
    await client.zadd(TRACKS_LIST_KEY, timestamp, track.id);

    console.log('[Redis] Track saved:', track.id);
  } catch (error) {
    console.error('[Redis] Error saving track:', error);
  }
}

/**
 * Get a single track by ID
 */
export async function getTrack(trackId: string): Promise<StoredTrack | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    await ensureConnection(client);
    const key = `${TRACK_PREFIX}${trackId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[Redis] Error getting track:', error);
    return null;
  }
}

/**
 * Get all tracks (most recent first)
 */
export async function getTracks(limit = 50, offset = 0): Promise<StoredTrack[]> {
  const client = getRedisClient();
  if (!client) return [];

  try {
    await ensureConnection(client);

    // Get track IDs from sorted set (newest first)
    const trackIds = await client.zrevrange(TRACKS_LIST_KEY, offset, offset + limit - 1);

    if (trackIds.length === 0) return [];

    // Get all track data
    const keys = trackIds.map(id => `${TRACK_PREFIX}${id}`);
    const trackData = await client.mget(...keys);

    return trackData
      .filter((data): data is string => data !== null)
      .map(data => JSON.parse(data) as StoredTrack);
  } catch (error) {
    console.error('[Redis] Error getting tracks:', error);
    return [];
  }
}

/**
 * Get total track count
 */
export async function getTrackCount(): Promise<number> {
  const client = getRedisClient();
  if (!client) return 0;

  try {
    await ensureConnection(client);
    return await client.zcard(TRACKS_LIST_KEY);
  } catch (error) {
    console.error('[Redis] Error getting track count:', error);
    return 0;
  }
}

export default redis;
