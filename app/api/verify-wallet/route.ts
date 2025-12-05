import { NextRequest, NextResponse } from 'next/server';
import { checkTokenBalance, getRequiredBalance, getTokenMint } from '@/app/lib/solana';

interface VerifyRequest {
  walletAddress: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json();
    const { walletAddress } = body;

    // Validate wallet address
    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Basic validation for Solana public key format (base58, 32-44 chars)
    if (walletAddress.length < 32 || walletAddress.length > 44) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Check token balance
    const result = await checkTokenBalance(walletAddress);

    return NextResponse.json({
      walletAddress,
      hasAccess: result.hasAccess,
      balance: result.balance,
      formattedBalance: result.formattedBalance,
      requiredBalance: result.requiredBalance,
      shortfall: result.shortfall,
      tokenMint: getTokenMint(),
    });
  } catch (error) {
    console.error('Wallet verification error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: 'Failed to verify wallet', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return token requirements info
  return NextResponse.json({
    requiredBalance: getRequiredBalance(),
    tokenMint: getTokenMint(),
    message: 'Connect your wallet and hold at least 1,000,000 $LV tokens for unlimited access',
  });
}
