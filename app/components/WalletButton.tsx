'use client';

import { FC, useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Wallet, LogOut, Copy, ExternalLink, Check } from 'lucide-react';
import { useState } from 'react';

interface WalletButtonProps {
  balance?: number;
  formattedBalance?: string;
  hasAccess?: boolean;
}

export const WalletButton: FC<WalletButtonProps> = ({
  balance,
  formattedBalance,
  hasAccess,
}) => {
  const { publicKey, disconnect, connected, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const shortAddress = useMemo(() => {
    if (!publicKey) return '';
    const address = publicKey.toBase58();
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, [publicKey]);

  const handleConnect = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
    setShowDropdown(false);
  }, [disconnect]);

  const handleCopyAddress = useCallback(async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [publicKey]);

  const handleViewExplorer = useCallback(() => {
    if (publicKey) {
      window.open(`https://solscan.io/account/${publicKey.toBase58()}`, '_blank');
    }
  }, [publicKey]);

  if (!connected) {
    return (
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600
                   rounded-xl font-semibold text-white hover:from-purple-500 hover:to-pink-500
                   transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <Wallet className="w-5 h-5" />
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium
                   transition-all duration-300 border
                   ${hasAccess
                     ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30'
                     : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                   }`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hasAccess ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
          <span>{shortAddress}</span>
        </div>
        {formattedBalance && (
          <span className="text-sm text-gray-400">
            {formattedBalance} $LV
          </span>
        )}
      </button>

      {/* Dropdown menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 py-2 bg-gray-900/95 backdrop-blur-xl
                         rounded-xl border border-white/10 shadow-xl z-20">
            {/* Balance info */}
            {balance !== undefined && (
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-xs text-gray-400 mb-1">$LV Balance</p>
                <p className="text-lg font-bold text-white">
                  {balance.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
                {hasAccess ? (
                  <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                    <Check className="w-3 h-3" /> Access granted
                  </p>
                ) : (
                  <p className="text-xs text-yellow-400 mt-1">
                    Need 1M for access
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <button
              onClick={handleCopyAddress}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-300
                        hover:bg-white/5 transition-colors text-left"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? 'Copied!' : 'Copy address'}
            </button>

            <button
              onClick={handleViewExplorer}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-300
                        hover:bg-white/5 transition-colors text-left"
            >
              <ExternalLink className="w-4 h-4" />
              View on Solscan
            </button>

            <div className="border-t border-white/10 mt-2 pt-2">
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400
                          hover:bg-red-500/10 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
