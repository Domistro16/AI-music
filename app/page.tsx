'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Header } from './components/Header';
import { PromptForm, GenerationOptions } from './components/PromptForm';
import { MusicPlayer } from './components/MusicPlayer';
import { TrackHistory, Track } from './components/TrackHistory';
import { AccessGate } from './components/AccessGate';
import { LoadingAnimation } from './components/LoadingAnimation';
import { AccessState } from './lib/constants';
import { Zap, Shield, Music, Sparkles } from 'lucide-react';

interface TrialStatus {
  remaining: number;
  used: number;
  limit: number;
  hasTrialsLeft: boolean;
}

interface WalletVerification {
  hasAccess: boolean;
  balance: number;
  formattedBalance: string;
  requiredBalance: number;
  shortfall: number;
}

interface GeneratedTrack {
  audioUrl: string;
  prompt: string;
  duration: number;
  generatedAt: string;
  title?: string;
  style?: string;
  instrumental?: boolean;
}

interface TaskStatus {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audioUrl?: string;
  imageUrl?: string;
  duration?: number;
  error?: string;
  prompt: string;
  title?: string;
  style?: string;
  instrumental?: boolean;
  createdAt: string;
}

const HISTORY_STORAGE_KEY = 'lv-music-history';
const POLL_INTERVAL = 3000; // 3 seconds
const MAX_POLL_TIME = 5 * 60 * 1000; // 5 minutes

export default function Home() {
  const { publicKey, connected } = useWallet();

  // State
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [walletVerification, setWalletVerification] = useState<WalletVerification | null>(null);
  const [accessState, setAccessState] = useState<AccessState>(AccessState.TRIALS_AVAILABLE);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [currentTrack, setCurrentTrack] = useState<GeneratedTrack | null>(null);
  const [trackHistory, setTrackHistory] = useState<Track[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs for polling
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollStartTimeRef = useRef<number>(0);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (savedHistory) {
      try {
        setTrackHistory(JSON.parse(savedHistory));
      } catch {
        console.error('Failed to parse track history');
      }
    }
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((tracks: Track[]) => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(tracks));
    setTrackHistory(tracks);
  }, []);

  // Fetch trial status
  const fetchTrialStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/generate');
      const data = await response.json();
      setTrialStatus(data);
    } catch (error) {
      console.error('Failed to fetch trial status:', error);
    }
  }, []);

  // Verify wallet balance
  const verifyWallet = useCallback(async (address: string) => {
    try {
      const response = await fetch('/api/verify-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await response.json();
      setWalletVerification(data);
      return data;
    } catch (error) {
      console.error('Failed to verify wallet:', error);
      return null;
    }
  }, []);

  // Update access state based on trial status and wallet verification
  useEffect(() => {
    if (connected && walletVerification) {
      if (walletVerification.hasAccess) {
        setAccessState(AccessState.ACCESS_GRANTED);
      } else {
        setAccessState(AccessState.WALLET_CONNECTED_INSUFFICIENT);
      }
    } else if (trialStatus) {
      if (trialStatus.hasTrialsLeft) {
        setAccessState(AccessState.TRIALS_AVAILABLE);
      } else {
        setAccessState(AccessState.TRIALS_EXHAUSTED);
      }
    }
  }, [connected, walletVerification, trialStatus]);

  // Fetch trial status on mount
  useEffect(() => {
    fetchTrialStatus();
  }, [fetchTrialStatus]);

  // Verify wallet when connected
  useEffect(() => {
    if (connected && publicKey) {
      verifyWallet(publicKey.toBase58());
    } else {
      setWalletVerification(null);
    }
  }, [connected, publicKey, verifyWallet]);

  // Check if user can generate
  const canGenerate = accessState === AccessState.TRIALS_AVAILABLE ||
                       accessState === AccessState.ACCESS_GRANTED;

  // Poll for task status
  const pollTaskStatus = useCallback(async (taskId: string, options: GenerationOptions): Promise<void> => {
    const elapsed = Date.now() - pollStartTimeRef.current;

    if (elapsed > MAX_POLL_TIME) {
      setError('Generation timed out. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/task/${taskId}`);
      const task: TaskStatus = await response.json();

      if (task.status === 'completed' && task.audioUrl) {
        // Success! Create the track
        const newTrack: GeneratedTrack = {
          audioUrl: task.audioUrl,
          prompt: task.prompt,
          duration: task.duration || 0,
          generatedAt: task.createdAt,
          title: task.title,
          style: task.style,
          instrumental: task.instrumental,
        };
        setCurrentTrack(newTrack);

        // Add to history
        const historyTrack: Track = {
          id: taskId,
          ...newTrack,
        };
        setTrackHistory(prev => {
          const updated = [historyTrack, ...prev].slice(0, 20);
          localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });

        setIsLoading(false);
        setLoadingMessage('');
      } else if (task.status === 'failed') {
        setError(task.error || 'Generation failed. Please try again.');
        setIsLoading(false);
        setLoadingMessage('');
      } else {
        // Still processing, update message and poll again
        const seconds = Math.floor(elapsed / 1000);
        if (task.status === 'processing') {
          setLoadingMessage(`Creating your music... (${seconds}s)`);
        } else {
          setLoadingMessage(`Starting generation... (${seconds}s)`);
        }

        pollTimeoutRef.current = setTimeout(() => {
          pollTaskStatus(taskId, options);
        }, POLL_INTERVAL);
      }
    } catch (err) {
      console.error('Poll error:', err);
      // Retry on network errors
      pollTimeoutRef.current = setTimeout(() => {
        pollTaskStatus(taskId, options);
      }, POLL_INTERVAL);
    }
  }, []);

  // Generate music
  const handleGenerate = async (options: GenerationOptions) => {
    setIsLoading(true);
    setError(null);
    setLoadingMessage('Starting generation...');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: options.prompt,
          instrumental: options.instrumental,
          style: options.style,
          title: options.title,
          walletAddress: connected ? publicKey?.toBase58() : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresWallet) {
          setAccessState(AccessState.TRIALS_EXHAUSTED);
          throw new Error('Free trials exhausted. Please connect your wallet.');
        }
        throw new Error(data.error || 'Failed to generate music');
      }

      // Update trial status if applicable
      if (data.trialStatus) {
        setTrialStatus(data.trialStatus);
      }

      // Start polling for task completion
      const taskId = data.taskId;
      pollStartTimeRef.current = Date.now();
      setLoadingMessage('Generation started...');

      // Start polling
      pollTimeoutRef.current = setTimeout(() => {
        pollTaskStatus(taskId, options);
      }, POLL_INTERVAL);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // Handle track selection from history
  const handleSelectTrack = (track: Track) => {
    setCurrentTrack({
      audioUrl: track.audioUrl,
      prompt: track.prompt,
      duration: track.duration,
      generatedAt: track.generatedAt,
      title: track.title,
      style: track.style,
      instrumental: track.instrumental,
    });
  };

  // Handle track deletion
  const handleDeleteTrack = (trackId: string) => {
    const updatedHistory = trackHistory.filter((t) => t.id !== trackId);
    saveHistory(updatedHistory);

    // Clear current track if it was deleted
    if (currentTrack && trackHistory.find((t) => t.id === trackId)?.audioUrl === currentTrack.audioUrl) {
      setCurrentTrack(null);
    }
  };

  // Clear all history
  const handleClearHistory = () => {
    saveHistory([]);
    setCurrentTrack(null);
  };

  // Reset for new generation
  const handleNewGeneration = () => {
    setCurrentTrack(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header
        walletBalance={walletVerification?.balance}
        formattedBalance={walletVerification?.formattedBalance}
        hasAccess={walletVerification?.hasAccess}
      />

      {/* Main content */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-4">
              Create Music with AI
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Describe the music you want to hear and let AI bring it to life.
              Powered by Suno AI, gated by $LV tokens.
            </p>

            {/* Feature badges */}
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <div className="flex items-center gap-2 px-4 py-2 glass rounded-full">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300">Fast generation</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 glass rounded-full">
                <Music className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">High quality audio</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 glass rounded-full">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">Token gated access</span>
              </div>
            </div>
          </div>

          {/* Access status badge */}
          <div className="flex justify-center mb-8">
            <AccessGate
              accessState={accessState}
              trialsRemaining={trialStatus?.remaining}
              trialsLimit={trialStatus?.limit}
              tokenBalance={walletVerification?.balance}
              formattedBalance={walletVerification?.formattedBalance}
              requiredBalance={walletVerification?.requiredBalance}
            />
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column - Form and Player */}
            <div className="lg:col-span-2 space-y-6">
              {/* Show access gate modal if trials exhausted */}
              {(accessState === AccessState.TRIALS_EXHAUSTED ||
                accessState === AccessState.WALLET_CONNECTED_INSUFFICIENT) && (
                <div className="flex justify-center">
                  <AccessGate
                    accessState={accessState}
                    trialsRemaining={trialStatus?.remaining}
                    trialsLimit={trialStatus?.limit}
                    tokenBalance={walletVerification?.balance}
                    formattedBalance={walletVerification?.formattedBalance}
                    requiredBalance={walletVerification?.requiredBalance}
                  />
                </div>
              )}

              {/* Form card */}
              {canGenerate && !isLoading && (
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h2 className="text-xl font-semibold text-white">Generate Music</h2>
                  </div>
                  <PromptForm
                    onSubmit={handleGenerate}
                    isLoading={isLoading}
                    disabled={!canGenerate}
                  />
                </div>
              )}

              {/* Loading state */}
              {isLoading && <LoadingAnimation message={loadingMessage} />}

              {/* Error message */}
              {error && (
                <div className="glass rounded-2xl p-4 border border-red-500/30 bg-red-500/10">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {/* Current track player */}
              {currentTrack && !isLoading && (
                <MusicPlayer
                  audioUrl={currentTrack.audioUrl}
                  prompt={currentTrack.prompt}
                  duration={currentTrack.duration}
                  generatedAt={currentTrack.generatedAt}
                  onNewGeneration={canGenerate ? handleNewGeneration : undefined}
                />
              )}
            </div>

            {/* Right column - History */}
            <div className="lg:col-span-1">
              <TrackHistory
                tracks={trackHistory}
                onSelectTrack={handleSelectTrack}
                onDeleteTrack={handleDeleteTrack}
                onClearHistory={handleClearHistory}
                currentTrackId={trackHistory.find(
                  (t) => t.audioUrl === currentTrack?.audioUrl
                )?.id}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Powered by Suno AI • Gated by $LV Token
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Documentation
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
