import { NextRequest, NextResponse } from 'next/server';
import { getTracks, getTrackCount, TrackSortBy } from '@/app/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sortBy = (searchParams.get('sort') || 'recent') as TrackSortBy;

    // Validate sort option
    const validSorts: TrackSortBy[] = ['recent', 'plays', 'downloads'];
    const safeSortBy = validSorts.includes(sortBy) ? sortBy : 'recent';

    // Clamp values
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safeOffset = Math.max(0, offset);

    const [tracks, total] = await Promise.all([
      getTracks(safeLimit, safeOffset, safeSortBy),
      getTrackCount(),
    ]);

    return NextResponse.json({
      tracks,
      pagination: {
        total,
        limit: safeLimit,
        offset: safeOffset,
        hasMore: safeOffset + tracks.length < total,
      },
      sort: safeSortBy,
    });
  } catch (error) {
    console.error('[Tracks API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tracks' },
      { status: 500 }
    );
  }
}
