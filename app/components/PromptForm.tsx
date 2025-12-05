'use client';

import { FC, useState } from 'react';
import { Wand2, Shuffle, Loader2, Music } from 'lucide-react';
import { EXAMPLE_PROMPTS, DURATION_OPTIONS, generateRandomPrompt } from '@/app/lib/constants';

interface PromptFormProps {
  onSubmit: (prompt: string, duration: number) => void;
  isLoading: boolean;
  disabled: boolean;
}

export const PromptForm: FC<PromptFormProps> = ({ onSubmit, isLoading, disabled }) => {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading && !disabled) {
      onSubmit(prompt.trim(), duration);
    }
  };

  const handleExampleClick = (examplePrompt: string) => {
    setPrompt(examplePrompt);
  };

  const handleSurpriseMe = () => {
    setPrompt(generateRandomPrompt());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Prompt Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Describe your music
        </label>
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., Upbeat electronic dance music with energetic synths and a driving beat..."
            className="w-full h-32 px-4 py-3 bg-white/5 border border-white/10 rounded-xl
                      text-white placeholder-gray-500 resize-none
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                      transition-all duration-300"
            disabled={isLoading || disabled}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">{prompt.length}/500</span>
          </div>
        </div>
      </div>

      {/* Example Prompts */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-300">
            Try an example
          </label>
          <button
            type="button"
            onClick={handleSurpriseMe}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                      text-purple-300 hover:text-purple-200 bg-purple-500/10
                      hover:bg-purple-500/20 rounded-lg transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Surprise me
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleExampleClick(example.prompt)}
              className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10
                        border border-white/10 hover:border-purple-500/50
                        rounded-lg text-gray-300 hover:text-white
                        transition-all duration-200"
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration Selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Duration
        </label>
        <div className="flex gap-2">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDuration(option.value)}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200
                        ${duration === option.value
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                        }`}
            >
              <span className="block text-lg">{option.label}</span>
              <span className="block text-xs opacity-70">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        type="submit"
        disabled={!prompt.trim() || isLoading || disabled}
        className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl
                   font-semibold text-lg transition-all duration-300
                   ${!prompt.trim() || isLoading || disabled
                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                     : 'bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 text-white hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/30 active:scale-[0.98]'
                   }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Generating music...
          </>
        ) : (
          <>
            <Wand2 className="w-6 h-6" />
            Generate Music
          </>
        )}
      </button>

      {disabled && (
        <p className="text-center text-sm text-gray-400">
          Connect your wallet or use free trials to generate music
        </p>
      )}
    </form>
  );
};
