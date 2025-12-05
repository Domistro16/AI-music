'use client';

import { FC } from 'react';
import { Music2, Github, Twitter } from 'lucide-react';
import { WalletButton } from './WalletButton';

interface HeaderProps {
  walletBalance?: number;
  formattedBalance?: string;
  hasAccess?: boolean;
}

export const Header: FC<HeaderProps> = ({
  walletBalance,
  formattedBalance,
  hasAccess,
}) => {
  return (
    <header className="sticky top-0 z-50 glass-dark border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Music2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg">LV Music</h1>
              <p className="text-xs text-gray-400 hidden sm:block">AI-Powered Generation</p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Social links */}
            <div className="hidden sm:flex items-center gap-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-8 bg-white/10" />

            {/* Wallet */}
            <WalletButton
              balance={walletBalance}
              formattedBalance={formattedBalance}
              hasAccess={hasAccess}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
