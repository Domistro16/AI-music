import { NextRequest, NextResponse } from 'next/server';
import { getTask } from '@/app/lib/redis';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const task = await getTask(taskId);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Return task status and data
    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      prompt: task.prompt,
      instrumental: task.instrumental,
      style: task.style,
      title: task.title,
      audioUrl: task.audioUrl,
      imageUrl: task.imageUrl,
      duration: task.duration,
      error: task.error,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    });
  } catch (error) {
    console.error('[Task Status] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
