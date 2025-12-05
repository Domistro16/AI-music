import type { Metadata } from 'next';
import './globals.css';
import { WalletProviderWrapper } from './providers/WalletProvider';

export const metadata: Metadata = {
  title: 'LV Music Generator | AI-Powered Music Creation',
  description: 'Create unique AI-generated music with text prompts. Powered by MusicGen and gated by $LV tokens.',
  keywords: ['AI', 'music', 'generator', 'Solana', 'Web3', 'MusicGen'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <WalletProviderWrapper>
          {children}
        </WalletProviderWrapper>
      </body>
    </html>
  );
}
