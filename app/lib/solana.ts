import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, Account } from '@solana/spl-token';

// Configuration
const LV_TOKEN_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_LV_TOKEN_MINT || '11111111111111111111111111111111' // Placeholder
);
const REQUIRED_BALANCE = 1_000_000;
const TOKEN_DECIMALS = 9; // Adjust based on your token's decimals

// Create connection with RPC URL
function getConnection(): Connection {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

export interface TokenBalanceResult {
  hasAccess: boolean;
  balance: number;
  formattedBalance: string;
  requiredBalance: number;
  shortfall: number;
}

/**
 * Check if a wallet has sufficient LV token balance
 */
export async function checkTokenBalance(walletAddress: string): Promise<TokenBalanceResult> {
  const connection = getConnection();

  try {
    const wallet = new PublicKey(walletAddress);
    const ata = await getAssociatedTokenAddress(LV_TOKEN_MINT, wallet);

    let account: Account;
    try {
      account = await getAccount(connection, ata);
    } catch {
      // No token account exists = 0 balance
      return {
        hasAccess: false,
        balance: 0,
        formattedBalance: '0',
        requiredBalance: REQUIRED_BALANCE,
        shortfall: REQUIRED_BALANCE,
      };
    }

    const rawBalance = Number(account.amount);
    const balance = rawBalance / (10 ** TOKEN_DECIMALS);
    const hasAccess = balance >= REQUIRED_BALANCE;
    const shortfall = hasAccess ? 0 : REQUIRED_BALANCE - balance;

    return {
      hasAccess,
      balance,
      formattedBalance: formatTokenBalance(balance),
      requiredBalance: REQUIRED_BALANCE,
      shortfall,
    };
  } catch (error) {
    console.error('Error checking token balance:', error);
    return {
      hasAccess: false,
      balance: 0,
      formattedBalance: '0',
      requiredBalance: REQUIRED_BALANCE,
      shortfall: REQUIRED_BALANCE,
    };
  }
}

/**
 * Format token balance for display
 */
export function formatTokenBalance(balance: number): string {
  if (balance >= 1_000_000) {
    return `${(balance / 1_000_000).toFixed(2)}M`;
  } else if (balance >= 1_000) {
    return `${(balance / 1_000).toFixed(2)}K`;
  }
  return balance.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * Get the required balance
 */
export function getRequiredBalance(): number {
  return REQUIRED_BALANCE;
}

/**
 * Get the LV token mint address
 */
export function getTokenMint(): string {
  return LV_TOKEN_MINT.toString();
}
