'use client';

import { FC, useState, useCallback } from 'react';
import { Play, Pause, Download, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { WaveformVisualizer } from './WaveformVisualizer';

interface MusicPlayerProps {
  audioUrl: string;
  prompt: string;
  duration: number;
  generatedAt: string;
  onNewGeneration?: () => void;
}

export const MusicPlayer: FC<MusicPlayerProps> = ({
  audioUrl,
  prompt,
  duration,
  generatedAt,
  onNewGeneration,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleTimeUpdate = useCallback((current: number, total: number) => {
    setCurrentTime(current);
    setTotalDuration(total);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-music-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const formattedDate = new Date(generatedAt).toLocaleString();

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate mb-1">
            Generated Track
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2">{prompt}</p>
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {formattedDate}
        </span>
      </div>

      {/* Waveform */}
      <WaveformVisualizer
        audioUrl={audioUrl}
        isPlaying={isPlaying && !isMuted}
        onReady={() => setIsReady(true)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Play/Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={!isReady}
          className={`p-3 rounded-full transition-all duration-300
                     ${isReady
                       ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/30'
                       : 'bg-gray-700 cursor-not-allowed'
                     }`}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-0.5" />
          )}
        </button>

        {/* Time */}
        <div className="flex-1">
          <div className="flex justify-between text-sm text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-100"
              style={{ width: `${(currentTime / totalDuration) * 100 || 0}%` }}
            />
          </div>
        </div>

        {/* Volume */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>

        {/* Download */}
        <button
          onClick={handleDownload}
          className="p-2 text-gray-400 hover:text-green-400 transition-colors"
          title="Download track"
        >
          <Download className="w-5 h-5" />
        </button>

        {/* Generate new */}
        {onNewGeneration && (
          <button
            onClick={onNewGeneration}
            className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
            title="Generate new"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
