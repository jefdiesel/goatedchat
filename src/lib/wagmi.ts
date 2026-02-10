import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  phantomWallet,
  coinbaseWallet,
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { mainnet, base } from 'wagmi/chains';
import { http, fallback } from 'wagmi';

// Define appchain (Ethscriptions L2)
const appchain = {
  id: 7777777,
  name: 'Ethscriptions',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.ethscriptions.com'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.ethscriptions.com' },
  },
} as const;

export const config = getDefaultConfig({
  appName: 'Gated Chat',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains: [mainnet, base, appchain],
  transports: {
    [mainnet.id]: fallback([
      http('https://eth.llamarpc.com'),
      http('https://1rpc.io/eth'),
      http(),
    ]),
    [base.id]: fallback([
      http('https://mainnet.base.org'),
      http(),
    ]),
    [appchain.id]: http('https://mainnet.ethscriptions.com'),
  },
  ssr: false,
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [
        injectedWallet,
        phantomWallet,
        coinbaseWallet,
        rainbowWallet,
        walletConnectWallet,
      ],
    },
  ],
});
