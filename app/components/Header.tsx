'use client';

import { FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Music2, Github, Twitter, Library, Sparkles } from 'lucide-react';
import { WalletButton } from './WalletButton';

interface HeaderProps {
  walletBalance?: number;
  formattedBalance?: string;
  hasAccess?: boolean;
}

const NAV_LINKS = [
  { href: '/', label: 'Create', icon: Sparkles },
  { href: '/library', label: 'Library', icon: Library },
];

export const Header: FC<HeaderProps> = ({
  walletBalance,
  formattedBalance,
  hasAccess,
}) => {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 glass-dark border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                <Music2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg">LV Music</h1>
                <p className="text-xs text-gray-400 hidden sm:block">AI-Powered Generation</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden sm:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                               transition-all duration-200
                               ${isActive
                                 ? 'bg-purple-500/20 text-purple-300'
                                 : 'text-gray-400 hover:text-white hover:bg-white/5'
                               }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Mobile nav */}
            <nav className="flex sm:hidden items-center gap-1">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`p-2 rounded-lg transition-colors
                               ${isActive
                                 ? 'bg-purple-500/20 text-purple-300'
                                 : 'text-gray-400 hover:text-white'
                               }`}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                );
              })}
            </nav>

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
