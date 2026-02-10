import { NextRequest, NextResponse } from 'next/server';

const RPC_URLS: Record<string, string> = {
  eth: 'https://eth.llamarpc.com',
  base: 'https://mainnet.base.org',
  appchain: 'https://mainnet.ethscriptions.com',
};

async function checkBalanceOf(
  wallet: string,
  contractAddress: string,
  chain: string
): Promise<number> {
  const rpcUrl = RPC_URLS[chain];
  if (!rpcUrl) return 0;

  try {
    // balanceOf(address) selector = 0x70a08231
    const paddedWallet = wallet.slice(2).padStart(64, '0');

    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          { to: contractAddress, data: '0x70a08231' + paddedWallet },
          'latest',
        ],
      }),
    });

    const json = await res.json();
    if (json.result && json.result !== '0x') {
      return parseInt(json.result, 16);
    }
    return 0;
  } catch (error) {
    console.error(`Error checking balance for ${chain}:`, error);
    return 0;
  }
}

// GET - Check if wallet meets token gate requirements
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet')?.toLowerCase();
  const contractAddress = searchParams.get('contract')?.toLowerCase();
  const chain = searchParams.get('chain') || 'eth';
  const minBalance = parseInt(searchParams.get('min_balance') || '1');

  if (!wallet || !contractAddress) {
    return NextResponse.json({ error: 'Missing wallet or contract' }, { status: 400 });
  }

  const balance = await checkBalanceOf(wallet, contractAddress, chain);
  const hasAccess = balance >= minBalance;

  return NextResponse.json({
    hasAccess,
    balance,
    required: minBalance,
  });
}

// POST - Check multiple token gates
export async function POST(request: NextRequest) {
  try {
    const { wallet, gates } = await request.json();

    if (!wallet || !gates || !Array.isArray(gates)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const results = await Promise.all(
      gates.map(async (gate: { contract_address: string; chain: string; min_balance: number }) => {
        const balance = await checkBalanceOf(
          wallet.toLowerCase(),
          gate.contract_address.toLowerCase(),
          gate.chain
        );
        return {
          contract_address: gate.contract_address,
          chain: gate.chain,
          hasAccess: balance >= gate.min_balance,
          balance,
        };
      })
    );

    // User has access if they pass ALL gates
    const hasAccess = results.every(r => r.hasAccess);

    return NextResponse.json({
      hasAccess,
      results,
    });
  } catch (error) {
    console.error('Token gate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
