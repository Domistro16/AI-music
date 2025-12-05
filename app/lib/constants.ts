// Example prompts for users to try
export const EXAMPLE_PROMPTS = [
  {
    label: 'Chill Lo-Fi',
    prompt: 'Relaxing lo-fi hip hop beat with soft piano, vinyl crackle, and mellow drums',
  },
  {
    label: 'Epic Cinematic',
    prompt: 'Epic orchestral cinematic music with dramatic strings, brass fanfare, and powerful percussion',
  },
  {
    label: 'Synthwave',
    prompt: '80s synthwave with pulsing bassline, arpeggiated synths, and retro drums',
  },
  {
    label: 'Acoustic Folk',
    prompt: 'Warm acoustic folk song with fingerpicked guitar, gentle vocals, and soft percussion',
  },
  {
    label: 'EDM Drop',
    prompt: 'High energy EDM buildup and drop with heavy bass, energetic synths, and punchy drums',
  },
  {
    label: 'Jazz Lounge',
    prompt: 'Smooth jazz lounge music with saxophone, piano chords, upright bass, and brushed drums',
  },
];

// Random prompt elements for "Surprise Me" feature
export const RANDOM_ELEMENTS = {
  genres: [
    'electronic', 'ambient', 'classical', 'jazz', 'rock', 'hip hop', 'folk',
    'pop', 'R&B', 'country', 'blues', 'reggae', 'funk', 'soul', 'metal',
  ],
  moods: [
    'uplifting', 'melancholic', 'energetic', 'peaceful', 'mysterious',
    'romantic', 'aggressive', 'dreamy', 'nostalgic', 'triumphant',
  ],
  instruments: [
    'piano', 'guitar', 'violin', 'synthesizer', 'drums', 'bass',
    'saxophone', 'trumpet', 'flute', 'cello', 'harp', 'organ',
  ],
  descriptors: [
    'with a driving beat', 'featuring lush harmonies', 'with atmospheric textures',
    'building to a climax', 'with subtle variations', 'featuring call and response',
    'with polyrhythmic patterns', 'layered with reverb', 'with punchy dynamics',
  ],
};

/**
 * Generate a random prompt
 */
export function generateRandomPrompt(): string {
  const { genres, moods, instruments, descriptors } = RANDOM_ELEMENTS;

  const genre = genres[Math.floor(Math.random() * genres.length)];
  const mood = moods[Math.floor(Math.random() * moods.length)];
  const instrument1 = instruments[Math.floor(Math.random() * instruments.length)];
  const instrument2 = instruments[Math.floor(Math.random() * instruments.length)];
  const descriptor = descriptors[Math.floor(Math.random() * descriptors.length)];

  return `${mood} ${genre} music featuring ${instrument1} and ${instrument2} ${descriptor}`;
}

// Duration options
export const DURATION_OPTIONS = [
  { value: 5, label: '5s', description: 'Quick sample' },
  { value: 10, label: '10s', description: 'Short clip' },
  { value: 15, label: '15s', description: 'Medium' },
  { value: 30, label: '30s', description: 'Full preview' },
];

// Access states
export enum AccessState {
  TRIALS_AVAILABLE = 'TRIALS_AVAILABLE',
  TRIALS_EXHAUSTED = 'TRIALS_EXHAUSTED',
  WALLET_CONNECTED_INSUFFICIENT = 'WALLET_CONNECTED_INSUFFICIENT',
  ACCESS_GRANTED = 'ACCESS_GRANTED',
}

// Buy LV token link (update with your DEX link)
export const BUY_LV_TOKEN_URL = 'https://raydium.io/swap/';
