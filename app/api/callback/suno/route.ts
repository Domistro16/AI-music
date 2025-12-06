import { NextRequest, NextResponse } from 'next/server';
import { updateTask, getTask, saveTrack } from '@/app/lib/redis';

// Suno callback payload structure
interface SunoCallbackPayload {
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

export async function POST(request: NextRequest) {
  try {
    const payload: SunoCallbackPayload = await request.json();

    console.log('[Suno Callback] Received:', JSON.stringify(payload, null, 2));

    const { taskId, status, response, errorMessage } = payload.data;

    if (!taskId) {
      console.error('[Suno Callback] No taskId in payload');
      return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
    }

    // Find our task by Suno's taskId
    // We stored the mapping when we created the task
    const task = await getTask(taskId);

    if (!task) {
      console.error('[Suno Callback] Task not found:', taskId);
      // Return 200 anyway to acknowledge receipt
      return NextResponse.json({ received: true, taskFound: false });
    }

    if (status === 'SUCCESS' && response?.sunoData?.[0]) {
      const sunoData = response.sunoData[0];

      // Update task as completed
      await updateTask(taskId, {
        status: 'completed',
        audioUrl: sunoData.audioUrl,
        imageUrl: sunoData.imageUrl,
        duration: sunoData.duration,
      });

      // Save to public track library
      await saveTrack({
        id: taskId,
        audioUrl: sunoData.audioUrl,
        imageUrl: sunoData.imageUrl,
        prompt: task.prompt,
        title: task.title || sunoData.title,
        style: task.style,
        instrumental: task.instrumental,
        duration: sunoData.duration,
        createdAt: task.createdAt,
      });

      console.log('[Suno Callback] Task completed and track saved:', taskId);
    } else if (status === 'FAILED') {
      await updateTask(taskId, {
        status: 'failed',
        error: errorMessage || 'Generation failed',
      });

      console.log('[Suno Callback] Task failed:', taskId, errorMessage);
    } else if (status === 'IN_PROGRESS') {
      await updateTask(taskId, {
        status: 'processing',
      });

      console.log('[Suno Callback] Task still processing:', taskId);
    }

    return NextResponse.json({ received: true, status });
  } catch (error) {
    console.error('[Suno Callback] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support GET for verification
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Suno callback endpoint is active',
  });
}
