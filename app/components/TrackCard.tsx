'use client';

import { FC, useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Music, Headphones, BarChart3 } from 'lucide-react';

interface TrackCardProps {
  id: string;
  audioUrl: string;
  imageUrl?: string;
  title?: string;
  prompt: string;
  style?: string;
  instrumental?: boolean;
  plays: number;
  downloads: number;
  createdAt: string;
  onPlay?: () => void;
}

export const TrackCard: FC<TrackCardProps> = ({
  id,
  audioUrl,
  imageUrl,
  title,
  prompt,
  style,
  instrumental,
  plays,
  downloads,
  createdAt,
  onPlay,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio(audioUrl);

    audioRef.current.addEventListener('ended', () => {
      setIsPlaying(false);
    });

    audioRef.current.addEventListener('canplaythrough', () => {
      setIsLoading(false);
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  const handlePlayPause = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);

      // Track play
      try {
        await fetch(`/api/tracks/${id}/stats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'play' }),
        });
      } catch (e) {
        console.error('Failed to track play:', e);
      }

      try {
        await audioRef.current.play();
        setIsPlaying(true);
        onPlay?.();
      } catch (e) {
        console.error('Failed to play:', e);
      }
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    // Track download
    try {
      await fetch(`/api/tracks/${id}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download' }),
      });
    } catch (e) {
      console.error('Failed to track download:', e);
    }

    // Download the file
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'track'}-${id.slice(0, 8)}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Failed to download:', e);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="glass rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-300 group">
      {/* Image/Artwork */}
      <div className="relative aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title || 'Track artwork'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-16 h-16 text-purple-400/50" />
          </div>
        )}

        {/* Play button overlay */}
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center
                         transform hover:scale-110 transition-transform">
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </div>
        </button>

        {/* Playing indicator */}
        {isPlaying && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-purple-500 rounded-full flex items-center gap-1">
            <div className="flex items-end gap-0.5 h-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-white rounded-full animate-pulse"
                  style={{
                    height: `${40 + Math.random() * 60}%`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-white font-medium">Playing</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-white truncate">
          {title || prompt.slice(0, 50)}
        </h3>

        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
          {style && <span className="text-purple-400">{style}</span>}
          {style && instrumental && <span>•</span>}
          {instrumental && (
            <span className="flex items-center gap-1">
              <Headphones className="w-3 h-3" />
              Instrumental
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
          {prompt}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Play className="w-3.5 h-3.5" />
              {formatNumber(plays)}
            </span>
            <span className="flex items-center gap-1">
              <Download className="w-3.5 h-3.5" />
              {formatNumber(downloads)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          {formatDate(createdAt)}
        </p>
      </div>
    </div>
  );
};
