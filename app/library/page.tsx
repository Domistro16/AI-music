'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { TrackCard } from '../components/TrackCard';
import { Music, TrendingUp, Clock, Download, Loader2 } from 'lucide-react';

interface StoredTrack {
  id: string;
  audioUrl: string;
  imageUrl?: string;
  prompt: string;
  title?: string;
  style?: string;
  instrumental?: boolean;
  duration?: number;
  createdAt: string;
  plays: number;
  downloads: number;
}

type SortOption = 'recent' | 'plays' | 'downloads';

const SORT_OPTIONS: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'recent', label: 'Recent', icon: <Clock className="w-4 h-4" /> },
  { value: 'plays', label: 'Most Played', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'downloads', label: 'Most Downloaded', icon: <Download className="w-4 h-4" /> },
];

export default function LibraryPage() {
  const [tracks, setTracks] = useState<StoredTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchTracks = useCallback(async (sort: SortOption, offset = 0, append = false) => {
    try {
      if (offset === 0) {
        setIsLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(`/api/tracks?sort=${sort}&limit=20&offset=${offset}`);
      const data = await response.json();

      if (append) {
        setTracks(prev => [...prev, ...data.tracks]);
      } else {
        setTracks(data.tracks);
      }
      setHasMore(data.pagination.hasMore);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('Failed to fetch tracks:', error);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchTracks(sortBy);
  }, [sortBy, fetchTracks]);

  const handleLoadMore = () => {
    fetchTracks(sortBy, tracks.length, true);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Music className="w-6 h-6 text-purple-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">Music Library</h1>
            </div>
            <p className="text-gray-400">
              Explore {total > 0 ? `${total} ` : ''}AI-generated tracks created by the community
            </p>
          </div>

          {/* Sort options */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm
                           transition-all duration-200 whitespace-nowrap
                           ${sortBy === option.value
                             ? 'bg-purple-500 text-white'
                             : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                           }`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
              <p className="text-gray-400">Loading tracks...</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && tracks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 glass rounded-2xl">
              <Music className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No tracks yet</h3>
              <p className="text-gray-400 text-center max-w-md">
                Be the first to create an AI-generated track! Head to the home page to generate music.
              </p>
              <a
                href="/"
                className="mt-6 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
              >
                Create Music
              </a>
            </div>
          )}

          {/* Tracks grid */}
          {!isLoading && tracks.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {tracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    id={track.id}
                    audioUrl={track.audioUrl}
                    imageUrl={track.imageUrl}
                    title={track.title}
                    prompt={track.prompt}
                    style={track.style}
                    instrumental={track.instrumental}
                    plays={track.plays}
                    downloads={track.downloads}
                    createdAt={track.createdAt}
                  />
                ))}
              </div>

              {/* Load more button */}
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10
                             text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>Load More</>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Powered by Suno AI • Gated by $LV Token
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <a href="/" className="hover:text-white transition-colors">
              Create Music
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
