# LV Music Generator

AI-powered music generation app with Solana token gating. Create unique tracks using text prompts, powered by Meta's MusicGen model.

## Features

- **AI Music Generation**: Describe the music you want and AI creates it
- **Token Gating**: Access controlled by $LV token balance
- **Free Trials**: 2 free generations per IP address
- **Waveform Visualization**: Beautiful audio visualizer using Wavesurfer.js
- **Track History**: Local storage for your generated tracks
- **Wallet Integration**: Phantom, Solflare, and Backpack support

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **AI**: Replicate API (MusicGen model)
- **Audio**: Wavesurfer.js for waveform visualization
- **Web3**: @solana/wallet-adapter-react, @solana/web3.js, @solana/spl-token
- **Database**: Upstash Redis (for IP tracking)

## Access Control

1. **Free Trial**: Users get 2 free generations tracked by IP address
2. **Token Gating**: After trials, users must hold 1,000,000+ $LV tokens

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Replicate API key
- Upstash Redis account
- Solana wallet for testing

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd ai-music
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Configure environment variables in `.env.local`:
   - `REPLICATE_API_TOKEN`: Get from [Replicate](https://replicate.com)
   - `UPSTASH_REDIS_REST_URL`: Get from [Upstash](https://upstash.com)
   - `UPSTASH_REDIS_REST_TOKEN`: Get from Upstash
   - `NEXT_PUBLIC_LV_TOKEN_MINT`: Your SPL token mint address

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REPLICATE_API_TOKEN` | Replicate API key for MusicGen | Yes |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | Yes |
| `SOLANA_RPC_URL` | Solana RPC endpoint | Yes |
| `NEXT_PUBLIC_LV_TOKEN_MINT` | $LV token mint address | Yes |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Public Solana RPC | Yes |

## Project Structure

```
app/
├── api/
│   ├── generate/route.ts    # Music generation endpoint
│   └── verify-wallet/route.ts # Wallet verification endpoint
├── components/
│   ├── AccessGate.tsx       # Access control UI
│   ├── Header.tsx           # App header
│   ├── LoadingAnimation.tsx # Generation loading state
│   ├── MusicPlayer.tsx      # Audio player with controls
│   ├── PromptForm.tsx       # Music prompt input
│   ├── TrackHistory.tsx     # Generated tracks history
│   ├── WalletButton.tsx     # Wallet connection button
│   └── WaveformVisualizer.tsx # Audio waveform display
├── lib/
│   ├── constants.ts         # App constants and prompts
│   ├── redis.ts             # Upstash Redis client
│   └── solana.ts            # Solana token checking
├── providers/
│   └── WalletProvider.tsx   # Solana wallet adapter setup
├── globals.css              # Global styles
├── layout.tsx               # Root layout
└── page.tsx                 # Main page
```

## API Endpoints

### POST /api/generate
Generate music from a text prompt.

**Request:**
```json
{
  "prompt": "Upbeat electronic music with synths",
  "duration": 10,
  "walletAddress": "optional_wallet_address"
}
```

**Response:**
```json
{
  "success": true,
  "audioUrl": "https://...",
  "prompt": "...",
  "duration": 10,
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "trialStatus": { ... }
}
```

### POST /api/verify-wallet
Verify wallet token balance.

**Request:**
```json
{
  "walletAddress": "wallet_public_key"
}
```

**Response:**
```json
{
  "hasAccess": true,
  "balance": 1500000,
  "formattedBalance": "1.5M",
  "requiredBalance": 1000000
}
```

## License

MIT
