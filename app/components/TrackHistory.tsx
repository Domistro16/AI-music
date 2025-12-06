'use client';

import { FC, useState } from 'react';
import { Clock, Trash2, Play, ChevronDown, ChevronUp, Music } from 'lucide-react';

export interface Track {
  id: string;
  audioUrl: string;
  prompt: string;
  duration: number;
  generatedAt: string;
  title?: string;
  style?: string;
  instrumental?: boolean;
}

interface TrackHistoryProps {
  tracks: Track[];
  onSelectTrack: (track: Track) => void;
  onDeleteTrack: (trackId: string) => void;
  onClearHistory: () => void;
  currentTrackId?: string;
}

export const TrackHistory: FC<TrackHistoryProps> = ({
  tracks,
  onSelectTrack,
  onDeleteTrack,
  onClearHistory,
  currentTrackId,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (tracks.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 text-gray-400 mb-4">
          <Clock className="w-5 h-5" />
          <h3 className="font-medium">History</h3>
        </div>
        <div className="text-center py-8">
          <Music className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            No tracks generated yet.
            <br />
            Your creations will appear here.
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 text-gray-300">
          <Clock className="w-5 h-5" />
          <h3 className="font-medium">History</h3>
          <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
            {tracks.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Tracks list */}
      {isExpanded && (
        <div className="border-t border-white/10">
          <div className="max-h-80 overflow-y-auto">
            {tracks.map((track) => (
              <div
                key={track.id}
                className={`group flex items-center gap-3 p-4 hover:bg-white/5 transition-colors
                          border-b border-white/5 last:border-0
                          ${currentTrackId === track.id ? 'bg-purple-500/10' : ''}`}
              >
                {/* Play button */}
                <button
                  onClick={() => onSelectTrack(track)}
                  className={`p-2 rounded-lg transition-all duration-200
                            ${currentTrackId === track.id
                              ? 'bg-purple-500 text-white'
                              : 'bg-white/5 text-gray-400 hover:bg-purple-500/50 hover:text-white'
                            }`}
                >
                  <Play className="w-4 h-4" />
                </button>

                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {track.title || track.prompt}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {track.style && (
                      <>
                        <span className="text-purple-400">{track.style}</span>
                        <span>•</span>
                      </>
                    )}
                    {track.instrumental && (
                      <>
                        <span>Instrumental</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{formatDate(track.generatedAt)}</span>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTrack(track.id);
                  }}
                  className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100
                            transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Clear all button */}
          <div className="p-3 border-t border-white/10">
            <button
              onClick={onClearHistory}
              className="w-full py-2 text-sm text-gray-400 hover:text-red-400
                        hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Clear all history
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
