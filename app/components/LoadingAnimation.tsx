'use client';

import { FC } from 'react';
import { Music, Sparkles } from 'lucide-react';

interface LoadingAnimationProps {
  progress?: number;
  message?: string;
}

export const LoadingAnimation: FC<LoadingAnimationProps> = ({
  progress,
  message = 'Creating your music...',
}) => {
  return (
    <div className="glass rounded-2xl p-8 text-center">
      {/* Animated icon */}
      <div className="relative w-24 h-24 mx-auto mb-6">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />

        {/* Spinning ring */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500
                       animate-spin" />

        {/* Pulse effect */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20
                       animate-pulse" />

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Music className="w-10 h-10 text-purple-400" />
        </div>

        {/* Sparkles */}
        <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-pink-400 animate-bounce" />
        <Sparkles className="absolute -bottom-1 -left-1 w-4 h-4 text-cyan-400 animate-bounce"
                 style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Message */}
      <h3 className="text-xl font-semibold text-white mb-2">{message}</h3>
      <p className="text-gray-400 text-sm mb-6">
        This may take up to a minute depending on duration
      </p>

      {/* Progress bar */}
      {progress !== undefined && (
        <div className="max-w-xs mx-auto">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500
                        rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Audio waveform animation */}
      <div className="flex items-end justify-center gap-1 mt-6 h-8">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="w-1.5 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full loading-bar"
            style={{
              height: `${20 + Math.random() * 80}%`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
