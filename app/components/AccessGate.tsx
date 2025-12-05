'use client';

import { FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Wallet, Coins, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { AccessState, BUY_LV_TOKEN_URL } from '@/app/lib/constants';

interface AccessGateProps {
  accessState: AccessState;
  trialsRemaining?: number;
  trialsLimit?: number;
  tokenBalance?: number;
  formattedBalance?: string;
  requiredBalance?: number;
}

export const AccessGate: FC<AccessGateProps> = ({
  accessState,
  trialsRemaining = 0,
  trialsLimit = 2,
  tokenBalance = 0,
  formattedBalance = '0',
  requiredBalance = 1_000_000,
}) => {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  const handleConnectWallet = () => {
    setVisible(true);
  };

  // Trials available badge
  if (accessState === AccessState.TRIALS_AVAILABLE) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20
                     border border-blue-500/30">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-blue-300">
          {trialsRemaining}/{trialsLimit} free trials
        </span>
      </div>
    );
  }

  // Trials exhausted - prompt wallet connection
  if (accessState === AccessState.TRIALS_EXHAUSTED) {
    return (
      <div className="glass-dark rounded-2xl p-6 max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-yellow-500/20">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Free trials exhausted</h3>
            <p className="text-sm text-gray-400">Connect wallet to continue</p>
          </div>
        </div>

        <p className="text-gray-300 text-sm mb-4">
          You&apos;ve used all {trialsLimit} free generations. Connect your Solana wallet
          and hold at least <span className="text-purple-400 font-semibold">1M $LV tokens</span> for
          unlimited access.
        </p>

        <button
          onClick={handleConnectWallet}
          className="w-full flex items-center justify-center gap-2 px-4 py-3
                    bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl
                    font-semibold text-white hover:from-purple-500 hover:to-pink-500
                    transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/30"
        >
          <Wallet className="w-5 h-5" />
          Connect Wallet
        </button>
      </div>
    );
  }

  // Wallet connected but insufficient balance
  if (accessState === AccessState.WALLET_CONNECTED_INSUFFICIENT) {
    const shortfall = requiredBalance - tokenBalance;

    return (
      <div className="glass-dark rounded-2xl p-6 max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-orange-500/20">
            <Coins className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Insufficient $LV Balance</h3>
            <p className="text-sm text-gray-400">You need more tokens</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">Your balance:</span>
            <span className="text-white font-semibold">{formattedBalance} $LV</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">Required:</span>
            <span className="text-purple-400 font-semibold">
              {requiredBalance.toLocaleString()} $LV
            </span>
          </div>
          <div className="border-t border-white/10 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Need:</span>
              <span className="text-orange-400 font-semibold">
                {shortfall.toLocaleString()} more $LV
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (tokenBalance / requiredBalance) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-center">
            {((tokenBalance / requiredBalance) * 100).toFixed(1)}% of required balance
          </p>
        </div>

        <a
          href={BUY_LV_TOKEN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-3
                    bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl
                    font-semibold text-white hover:from-orange-400 hover:to-amber-400
                    transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/30"
        >
          <Coins className="w-5 h-5" />
          Buy $LV Tokens
        </a>
      </div>
    );
  }

  // Full access granted
  if (accessState === AccessState.ACCESS_GRANTED) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20
                     border border-green-500/30">
        <Check className="w-4 h-4 text-green-400" />
        <span className="text-sm font-medium text-green-300">
          Access Granted - Unlimited generations
        </span>
      </div>
    );
  }

  return null;
};
