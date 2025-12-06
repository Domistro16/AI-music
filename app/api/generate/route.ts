import { NextRequest, NextResponse } from 'next/server';
import { getTrialStatus, incrementTrialUsage } from '@/app/lib/redis';
import { checkTokenBalance } from '@/app/lib/solana';

const SUNO_API_BASE = 'https://api.sunoapi.org';

interface GenerateRequest {
  prompt: string;
  instrumental?: boolean;
  style?: string;
  title?: string;
  walletAddress?: string;
}

interface SunoGenerateResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

interface SunoStatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: 'SUCCESS' | 'IN_PROGRESS' | 'FAILED' | 'PENDING';
    response?: {
      sunoData: Array<{
        id: string;
        audioUrl: string;
        streamAudioUrl?: string;
        imageUrl?: string;
        title?: string;
        tags?: string;
        duration?: number;
      }>;
    };
    errorMessage?: string;
  };
}

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return '127.0.0.1';
}

// Helper to wait
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface SunoOptions {
  prompt: string;
  instrumental?: boolean;
  style?: string;
  title?: string;
}

// Generate music using Suno API
async function generateMusicWithSuno(options: SunoOptions): Promise<string> {
  const apiKey = process.env.SUNO_API_KEY;

  if (!apiKey) {
    throw new Error('SUNO_API_KEY is not configured');
  }

  // Step 1: Start generation
  console.log('[Suno] Starting music generation...');

  // Build request body based on whether we have style/title (custom mode) or just prompt
  const hasCustomOptions = options.style || options.title;

  const requestBody: Record<string, unknown> = {
    prompt: options.prompt,
    instrumental: options.instrumental ?? false,
    model: 'V4',
  };

  if (hasCustomOptions) {
    // Use custom mode when style or title is provided
    requestBody.customMode = true;
    if (options.style) {
      requestBody.style = options.style;
    }
    if (options.title) {
      requestBody.title = options.title;
    }
  } else {
    // Auto mode - let Suno decide style
    requestBody.customMode = false;
  }

  console.log('[Suno] Request body:', JSON.stringify(requestBody, null, 2));

  const generateResponse = await fetch(`${SUNO_API_BASE}/api/v1/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!generateResponse.ok) {
    const errorText = await generateResponse.text();
    console.error('[Suno] Generate request failed:', generateResponse.status, errorText);
    throw new Error(`Suno API error: ${generateResponse.status} - ${errorText}`);
  }

  const generateData: SunoGenerateResponse = await generateResponse.json();

  if (generateData.code !== 200 || !generateData.data?.taskId) {
    throw new Error(`Suno API error: ${generateData.msg || 'Unknown error'}`);
  }

  const taskId = generateData.data.taskId;
  console.log('[Suno] Task created:', taskId);

  // Step 2: Poll for completion
  const maxAttempts = 60; // 60 * 3s = 3 minutes max
  const pollInterval = 3000; // 3 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(pollInterval);

    console.log(`[Suno] Polling status (attempt ${attempt + 1}/${maxAttempts})...`);

    const statusResponse = await fetch(
      `${SUNO_API_BASE}/api/v1/generate/record-info?taskId=${taskId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!statusResponse.ok) {
      console.error('[Suno] Status check failed:', statusResponse.status);
      continue;
    }

    const statusData: SunoStatusResponse = await statusResponse.json();

    console.log('[Suno] Status:', statusData.data?.status);

    if (statusData.data?.status === 'SUCCESS') {
      const sunoData = statusData.data.response?.sunoData;

      if (sunoData && sunoData.length > 0 && sunoData[0].audioUrl) {
        console.log('[Suno] Generation complete!');
        return sunoData[0].audioUrl;
      }
    } else if (statusData.data?.status === 'FAILED') {
      throw new Error(`Suno generation failed: ${statusData.data.errorMessage || 'Unknown error'}`);
    }
    // Continue polling for IN_PROGRESS or PENDING
  }

  throw new Error('Suno generation timed out after 3 minutes');
}

export async function POST(request: NextRequest) {
  try {
    // Check for Suno API key
    if (!process.env.SUNO_API_KEY) {
      console.error('SUNO_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Server configuration error: Suno API not configured' },
        { status: 500 }
      );
    }

    const body: GenerateRequest = await request.json();
    const { prompt, instrumental, style, title, walletAddress } = body;

    // Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get client IP
    const clientIP = getClientIP(request);

    // Check access
    if (walletAddress) {
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
    } else {
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
      await incrementTrialUsage(clientIP);
    }

    // Generate music using Suno
    console.log('[Suno] Starting music generation with prompt:', prompt.substring(0, 50) + '...');
    console.log('[Suno] Options:', { instrumental, style, title });

    const audioUrl = await generateMusicWithSuno({
      prompt: prompt.trim(),
      instrumental,
      style,
      title,
    });

    console.log('[Suno] Generation complete, audio URL:', audioUrl.substring(0, 50) + '...');

    // Get updated trial status
    const updatedTrialStatus = walletAddress ? null : await getTrialStatus(clientIP);

    return NextResponse.json({
      success: true,
      audioUrl,
      prompt,
      instrumental,
      style,
      title,
      duration: 0, // Actual duration will be determined by audio player
      generatedAt: new Date().toISOString(),
      trialStatus: updatedTrialStatus,
    });
  } catch (error) {
    console.error('Generation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('API') || errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
      return NextResponse.json(
        { error: 'Invalid Suno API key', details: errorMessage },
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
    ip: clientIP.substring(0, 8) + '...',
  });
}
