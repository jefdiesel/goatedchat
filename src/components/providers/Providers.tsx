'use client';

import { useState, useEffect } from 'react';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';

const queryClient = new QueryClient();

const theme = darkTheme({
  accentColor: '#c3ff00',
  accentColorForeground: '#000000',
  borderRadius: 'medium',
});

// Override specific tokens for a fully black background
theme.colors.modalBackground = '#000000';
theme.colors.profileForeground = '#0a0a0a';
theme.colors.connectButtonBackground = '#0a0a0a';
theme.colors.connectButtonInnerBackground = '#111111';
theme.colors.menuItemBackground = '#111111';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme}>
          {mounted ? children : null}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
