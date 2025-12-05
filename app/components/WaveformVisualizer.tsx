'use client';

import { FC, useEffect, useRef, useState } from 'react';
import type WaveSurferType from 'wavesurfer.js';

interface WaveformVisualizerProps {
  audioUrl: string;
  isPlaying: boolean;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onSeek?: (time: number) => void;
}

export const WaveformVisualizer: FC<WaveformVisualizerProps> = ({
  audioUrl,
  isPlaying,
  onReady,
  onPlay,
  onPause,
  onTimeUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurferType | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Dynamic import for WaveSurfer
  useEffect(() => {
    let ws: WaveSurferType | null = null;

    const initWaveSurfer = async () => {
      if (!containerRef.current) return;

      const WaveSurfer = (await import('wavesurfer.js')).default;

      // Destroy existing instance
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }

      ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: 'rgba(139, 92, 246, 0.5)',
        progressColor: 'rgba(236, 72, 153, 0.8)',
        cursorColor: 'rgba(34, 211, 238, 0.8)',
        cursorWidth: 2,
        barWidth: 3,
        barGap: 2,
        barRadius: 3,
        height: 80,
        normalize: true,
      });

      ws.on('ready', () => {
        setIsLoaded(true);
        onReady?.();
      });

      ws.on('play', () => {
        onPlay?.();
      });

      ws.on('pause', () => {
        onPause?.();
      });

      ws.on('audioprocess', () => {
        if (ws) {
          onTimeUpdate?.(ws.getCurrentTime(), ws.getDuration());
        }
      });

      ws.on('seeking', () => {
        if (ws) {
          onTimeUpdate?.(ws.getCurrentTime(), ws.getDuration());
        }
      });

      ws.load(audioUrl);
      wavesurferRef.current = ws;
    };

    initWaveSurfer();

    return () => {
      if (ws) {
        ws.destroy();
      }
    };
  }, [audioUrl, onPause, onPlay, onReady, onTimeUpdate]);

  // Handle play/pause
  useEffect(() => {
    if (!wavesurferRef.current || !isLoaded) return;

    if (isPlaying) {
      wavesurferRef.current.play();
    } else {
      wavesurferRef.current.pause();
    }
  }, [isPlaying, isLoaded]);

  return (
    <div className="waveform-container relative">
      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-end gap-1 h-16">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-2 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full loading-bar"
                style={{ height: `${30 + Math.random() * 50}%` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Waveform container */}
      <div
        ref={containerRef}
        className={`w-full transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};
