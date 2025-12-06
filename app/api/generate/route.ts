import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { getTrialStatus, incrementTrialUsage } from '@/app/lib/redis';
import { checkTokenBalance } from '@/app/lib/solana';

// MusicGen model on Replicate
const MUSICGEN_MODEL = 'meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055f2c4f4e09e84b8ac7e166d';

interface GenerateRequest {
  prompt: string;
  duration: number;
  walletAddress?: string;
}

function getClientIP(request: NextRequest): string {
  // Check various headers for the client IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback
  return '127.0.0.1';
}

export async function POST(request: NextRequest) {
  try {
    // Check for Replicate API token
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('REPLICATE_API_TOKEN is not configured');
      return NextResponse.json(
        { error: 'Server configuration error: Replicate API not configured' },
        { status: 500 }
      );
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const body: GenerateRequest = await request.json();
    const { prompt, duration, walletAddress } = body;

    // Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!duration || ![5, 10, 15, 30].includes(duration)) {
      return NextResponse.json(
        { error: 'Invalid duration. Must be 5, 10, 15, or 30 seconds' },
        { status: 400 }
      );
    }

    // Get client IP
    const clientIP = getClientIP(request);

    // Check if wallet is provided
    if (walletAddress) {
      // Verify token balance
      const balanceResult = await checkTokenBalance(walletAddress);

      if (!balanceResult.hasAccess) {
        return NextResponse.json(
          {
            error: 'Insufficient token balance',
            balance: balanceResult.balance,
            required: balanceResult.requiredBalance,
            shortfall: balanceResult.shortfall,
          },
          { status: 403 }
        );
      }

      // Wallet verified with sufficient balance - proceed with generation
    } else {
      // No wallet - check trial status
      const trialStatus = await getTrialStatus(clientIP);

      if (!trialStatus.hasTrialsLeft) {
        return NextResponse.json(
          {
            error: 'Free trials exhausted',
            trialsUsed: trialStatus.used,
            trialsLimit: trialStatus.limit,
            requiresWallet: true,
          },
          { status: 403 }
        );
      }

      // Increment trial usage before generation
      await incrementTrialUsage(clientIP);
    }

    // Generate music using Replicate
    console.log('Starting music generation with prompt:', prompt.substring(0, 50) + '...');

    const output = await replicate.run(MUSICGEN_MODEL, {
      input: {
        prompt: prompt.trim(),
        duration: duration,
        model_version: 'stereo-melody-large',
        output_format: 'mp3',
        normalization_strategy: 'peak',
      },
    });

    console.log('Replicate output:', typeof output, output);

    // Get the audio URL from the output
    const audioUrl = typeof output === 'string' ? output : (output as unknown as string);

    if (!audioUrl) {
      console.error('No audio URL returned from Replicate');
      return NextResponse.json(
        { error: 'Failed to generate music: No audio URL returned' },
        { status: 500 }
      );
    }

    // Get updated trial status
    const updatedTrialStatus = walletAddress ? null : await getTrialStatus(clientIP);

    return NextResponse.json({
      success: true,
      audioUrl,
      prompt,
      duration,
      generatedAt: new Date().toISOString(),
      trialStatus: updatedTrialStatus,
    });
  } catch (error) {
    console.error('Generation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific error types
    if (errorMessage.includes('Invalid token') || errorMessage.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Invalid Replicate API token', details: errorMessage },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate music', details: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint to check trial status
export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);
  const trialStatus = await getTrialStatus(clientIP);

  return NextResponse.json({
    ...trialStatus,
    ip: clientIP.substring(0, 8) + '...', // Partial IP for debugging
  });
}
