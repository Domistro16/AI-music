import { NextRequest, NextResponse } from 'next/server';
import { resetTrials, getTrialStatus } from '@/app/lib/redis';

// Reset trials for testing - In production, protect this with auth
export async function POST(request: NextRequest) {
  try {
    // Get client IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const clientIP = forwardedFor?.split(',')[0].trim() || realIP || '127.0.0.1';

    // Reset trials for this IP
    await resetTrials(clientIP);

    // Get updated status
    const status = await getTrialStatus(clientIP);

    return NextResponse.json({
      success: true,
      message: 'Trials reset successfully',
      trialStatus: status,
      ip: clientIP.substring(0, 8) + '...',
    });
  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset trials' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to reset your trials',
  });
}
