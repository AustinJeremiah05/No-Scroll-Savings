'use client'

import { useAccount, useEnsName } from 'wagmi'
import { sepolia, mainnet } from 'wagmi/chains'
import { normalize } from 'viem/ens'

/**
 * Component to display user's ENS name below wallet connection
 * Works on both Sepolia (for testing) and Mainnet (for production)
 */
export function EnsNameDisplay() {
  const { address, isConnected, chain } = useAccount()
  
  // Try to fetch ENS name from mainnet first (most common)
  const { data: mainnetEnsName, isLoading: mainnetLoading } = useEnsName({
    address: address,
    chainId: mainnet.id,
    query: {
      enabled: !!address && isConnected,
    }
  })

  // Also check Sepolia for testnet registrations
  const { data: sepoliaEnsName, isLoading: sepoliaLoading } = useEnsName({
    address: address,
    chainId: sepolia.id,
    query: {
      enabled: !!address && isConnected && !mainnetEnsName,
    }
  })

  if (!isConnected || !address) {
    return null
  }

  const isLoading = mainnetLoading || sepoliaLoading
  const ensName = mainnetEnsName || sepoliaEnsName

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 animate-pulse">
        <div className="h-4 w-32 bg-muted-foreground/20 rounded"></div>
      </div>
    )
  }

  if (!ensName) {
    return null // No ENS name found
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
      <svg 
        className="w-4 h-4 text-blue-500" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
        />
      </svg>
      <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
        {ensName}
      </span>
      {sepoliaEnsName && (
        <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
          Sepolia
        </span>
      )}
    </div>
  )
}
