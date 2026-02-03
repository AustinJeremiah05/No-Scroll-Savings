"use client"

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { sepolia, baseSepolia, optimismSepolia, arbitrumSepolia } from 'wagmi/chains';
import { defineChain } from 'viem';

// Arc Testnet custom chain
const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc-arc-testnet.gelato.digital'],
    },
  },
  blockExplorers: {
    default: { 
      name: 'Arc Testnet Explorer', 
      url: 'https://arc-testnet-explorer.gelato.digital' 
    },
  },
  testnet: true,
});

// RainbowKit config
const config = getDefaultConfig({
  appName: 'No-Scroll Savings',
  projectId: '7a6e6a1f7934519391a590f1b17504df',
  chains: [arcTestnet, sepolia, baseSepolia, optimismSepolia, arbitrumSepolia],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}


