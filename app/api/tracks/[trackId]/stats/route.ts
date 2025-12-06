import { NextRequest, NextResponse } from 'next/server';
import { incrementPlayCount, incrementDownloadCount } from '@/app/lib/redis';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const { trackId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!trackId) {
      return NextResponse.json(
        { error: 'Track ID is required' },
        { status: 400 }
      );
    }

    if (!action || !['play', 'download'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use "play" or "download"' },
        { status: 400 }
      );
    }

    let track;
    if (action === 'play') {
      track = await incrementPlayCount(trackId);
    } else {
      track = await incrementDownloadCount(trackId);
    }

    if (!track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      plays: track.plays,
      downloads: track.downloads,
    });
  } catch (error) {
    console.error('[Track Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update stats' },
      { status: 500 }
    );
  }
}
