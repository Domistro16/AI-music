'use client';

import { FC, useState } from 'react';
import { Wand2, Shuffle, Loader2, Music, Mic, MicOff } from 'lucide-react';
import { EXAMPLE_PROMPTS, STYLE_OPTIONS, generateRandomPrompt } from '@/app/lib/constants';

export interface GenerationOptions {
  prompt: string;
  instrumental: boolean;
  style: string;
  title: string;
}

interface PromptFormProps {
  onSubmit: (options: GenerationOptions) => void;
  isLoading: boolean;
  disabled: boolean;
}

export const PromptForm: FC<PromptFormProps> = ({ onSubmit, isLoading, disabled }) => {
  const [prompt, setPrompt] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  const [style, setStyle] = useState('');
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading && !disabled) {
      onSubmit({
        prompt: prompt.trim(),
        instrumental,
        style,
        title: title.trim(),
      });
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

      {/* Style and Options Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Style Selector */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Style / Genre
          </label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl
                      text-white appearance-none cursor-pointer
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                      transition-all duration-300"
            disabled={isLoading || disabled}
          >
            {STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-gray-900">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Title Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Title <span className="text-gray-500">(optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My awesome track"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl
                      text-white placeholder-gray-500
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                      transition-all duration-300"
            disabled={isLoading || disabled}
          />
        </div>
      </div>

      {/* Instrumental Toggle */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Track Type
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setInstrumental(false)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200
                      ${!instrumental
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
          >
            <Mic className="w-5 h-5" />
            <span>With Vocals</span>
          </button>
          <button
            type="button"
            onClick={() => setInstrumental(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200
                      ${instrumental
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
          >
            <MicOff className="w-5 h-5" />
            <span>Instrumental</span>
          </button>
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
