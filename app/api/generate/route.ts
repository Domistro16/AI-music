import { NextRequest, NextResponse } from 'next/server';
import { getTrialStatus, incrementTrialUsage, createTask } from '@/app/lib/redis';
import { checkTokenBalance } from '@/app/lib/solana';
import { randomUUID } from 'crypto';

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

function getCallbackUrl(request: NextRequest): string {
  // Get the base URL from the request
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  return `${protocol}://${host}/api/callback/suno`;
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

    // Generate a task ID
    const taskId = randomUUID();
    const callbackUrl = getCallbackUrl(request);

    console.log('[Generate] Starting music generation');
    console.log('[Generate] Task ID:', taskId);
    console.log('[Generate] Callback URL:', callbackUrl);
    console.log('[Generate] Options:', { prompt: prompt.substring(0, 50), instrumental, style, title });

    // Build request body
    const hasCustomOptions = style || title;
    const requestBody: Record<string, unknown> = {
      prompt: prompt.trim(),
      instrumental: instrumental ?? false,
      model: 'V4',
      callBackUrl: callbackUrl,
    };

    if (hasCustomOptions) {
      requestBody.customMode = true;
      if (style) requestBody.style = style;
      if (title) requestBody.title = title;
    } else {
      requestBody.customMode = false;
    }

    console.log('[Generate] Suno request body:', JSON.stringify(requestBody, null, 2));

    // Call Suno API
    const generateResponse = await fetch(`${SUNO_API_BASE}/api/v1/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error('[Generate] Suno API error:', generateResponse.status, errorText);
      return NextResponse.json(
        { error: `Suno API error: ${errorText}` },
        { status: 500 }
      );
    }

    const generateData: SunoGenerateResponse = await generateResponse.json();

    if (generateData.code !== 200 || !generateData.data?.taskId) {
      console.error('[Generate] Suno API response error:', generateData);
      return NextResponse.json(
        { error: generateData.msg || 'Failed to start generation' },
        { status: 500 }
      );
    }

    const sunoTaskId = generateData.data.taskId;
    console.log('[Generate] Suno task created:', sunoTaskId);

    // Create task in Redis (use Suno's taskId as our ID for easy lookup in callback)
    await createTask({
      id: sunoTaskId,
      status: 'pending',
      prompt: prompt.trim(),
      instrumental,
      style,
      title,
      sunoTaskId,
      createdAt: new Date().toISOString(),
    });

    // Get updated trial status
    const updatedTrialStatus = walletAddress ? null : await getTrialStatus(clientIP);

    // Return immediately with task ID
    return NextResponse.json({
      success: true,
      taskId: sunoTaskId,
      status: 'pending',
      message: 'Generation started. Poll /api/task/{taskId} for status.',
      trialStatus: updatedTrialStatus,
    });
  } catch (error) {
    console.error('Generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
