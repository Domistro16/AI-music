import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getTrialStatus, incrementTrialUsage } from '@/app/lib/redis';
import { checkTokenBalance } from '@/app/lib/solana';

interface GenerateRequest {
  prompt: string;
  duration: number;
  walletAddress?: string;
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

// Generate music using Lyria RealTime
async function generateMusicWithLyria(prompt: string, durationSeconds: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const client = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: 'v1alpha' }
  });

  return new Promise((resolve, reject) => {
    const audioChunks: Buffer[] = [];
    let totalDuration = 0;
    const targetDuration = durationSeconds * 1000; // Convert to ms
    let resolved = false;

    // Timeout after duration + buffer time
    const timeout = setTimeout(() => {
      if (resolved) return;
      resolved = true;

      if (audioChunks.length > 0) {
        const audioBuffer = Buffer.concat(audioChunks);
        const base64Audio = audioBuffer.toString('base64');
        resolve(`data:audio/wav;base64,${base64Audio}`);
      } else {
        reject(new Error('No audio generated within timeout'));
      }
    }, targetDuration + 15000); // Add 15 second buffer

    client.live.music.connect({
      model: 'models/lyria-realtime-exp',
      callbacks: {
        onmessage: (message) => {
          if (resolved) return;

          // Handle audio chunks
          const audioData = message?.serverContent?.audioChunks;
          if (audioData && Array.isArray(audioData)) {
            for (const chunk of audioData) {
              if (chunk.data) {
                const buffer = Buffer.from(chunk.data, 'base64');
                audioChunks.push(buffer);
                // Estimate duration: 48kHz, stereo, 16-bit = 192000 bytes/sec
                totalDuration += (buffer.length / 192000) * 1000;

                if (totalDuration >= targetDuration) {
                  resolved = true;
                  clearTimeout(timeout);
                  const audioBuffer = Buffer.concat(audioChunks);
                  const base64Audio = audioBuffer.toString('base64');
                  resolve(`data:audio/wav;base64,${base64Audio}`);
                  return;
                }
              }
            }
          }
        },
        onerror: (error) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          console.error('[Lyria] Error:', error);
          reject(new Error(`Lyria error: ${error?.message || 'Unknown error'}`));
        },
        onclose: () => {
          console.log('[Lyria] Connection closed');
          if (!resolved && audioChunks.length > 0) {
            resolved = true;
            clearTimeout(timeout);
            const audioBuffer = Buffer.concat(audioChunks);
            const base64Audio = audioBuffer.toString('base64');
            resolve(`data:audio/wav;base64,${base64Audio}`);
          }
        }
      }
    }).then(async (session) => {
      console.log('[Lyria] Connection opened');

      // Configure music generation
      await session.setMusicGenerationConfig({
        musicGenerationConfig: {
          bpm: 120,
          density: 0.5,
          brightness: 0.5,
          guidance: 3.5,
        }
      });

      // Set the prompt
      await session.setWeightedPrompts({
        weightedPrompts: [
          { text: prompt, weight: 1.0 }
        ]
      });

      // Start playing
      await session.play();

    }).catch((err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    // Check for Gemini API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Server configuration error: Gemini API not configured' },
        { status: 500 }
      );
    }

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

    // Generate music using Lyria
    console.log('[Lyria] Starting music generation with prompt:', prompt.substring(0, 50) + '...');

    const audioUrl = await generateMusicWithLyria(prompt.trim(), duration);

    console.log('[Lyria] Generation complete, audio length:', audioUrl.length);

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

    if (errorMessage.includes('API key') || errorMessage.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Invalid Gemini API key', details: errorMessage },
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
