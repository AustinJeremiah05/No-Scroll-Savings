'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { ENSRegistrationModal } from './ens-registration-modal'

/**
 * This component monitors wallet connection and shows ENS registration modal
 * when user first connects their wallet
 */
export function ENSRegistrationTrigger() {
  const { address, isConnected, chain } = useAccount()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hasSeenPrompt, setHasSeenPrompt] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Only run effect after component mounts (prevents hydration mismatch)
  useEffect(() => {
    setMounted(true)
    console.log('ENS Registration Trigger mounted')
  }, [])

  useEffect(() => {
    if (!mounted) return

    console.log('ENS Trigger Effect - isConnected:', isConnected, 'address:', address, 'hasSeenPrompt:', hasSeenPrompt, 'chain:', chain?.name)

    // Show modal when user connects for the first time (in this session)
    if (isConnected && address && !hasSeenPrompt) {
      console.log('Conditions met - showing modal!')
      // Small delay to ensure modal renders properly
      const timer = setTimeout(() => {
        console.log('Opening ENS Registration Modal')
        setIsModalOpen(true)
        setHasSeenPrompt(true)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [isConnected, address, hasSeenPrompt, mounted])

  if (!mounted) return null

  console.log('ENS Trigger rendering - isModalOpen:', isModalOpen)

  return (
    <ENSRegistrationModal
      isOpen={isModalOpen}
      onClose={() => {
        console.log('Closing ENS Registration Modal')
        setIsModalOpen(false)
      }}
    />
  )
}
