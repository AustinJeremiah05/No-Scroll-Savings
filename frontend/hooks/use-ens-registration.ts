'use client'
import { useState, useCallback } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { getAddress, keccak256, toHex } from 'viem'
import { sepolia } from 'wagmi/chains'

// Official ENS Sepolia Addresses from https://docs.ens.domains/learn/deployments
const ETH_REGISTRAR_CONTROLLER = getAddress('0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968')
const PUBLIC_RESOLVER = getAddress('0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5')
const REGISTRATION_DURATION = 31536000 // 1 year

// ENS Registrar Controller ABI - Matches verified contract on Sepolia Etherscan
const ETH_REGISTRAR_ABI = [
  { inputs: [{ name: 'label', type: 'string' }], name: 'available', outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'label', type: 'string' }], name: 'valid', outputs: [{ name: '', type: 'bool' }], stateMutability: 'pure', type: 'function' },
  { 
    inputs: [{ name: 'label', type: 'string' }, { name: 'duration', type: 'uint256' }], 
    name: 'rentPrice', 
    outputs: [{ 
      components: [
        { name: 'base', type: 'uint256' },
        { name: 'premium', type: 'uint256' }
      ],
      name: 'price',
      type: 'tuple'
    }], 
    stateMutability: 'view', 
    type: 'function' 
  },
  { 
    inputs: [{
      components: [
        { name: 'label', type: 'string' },
        { name: 'owner', type: 'address' },
        { name: 'duration', type: 'uint256' },
        { name: 'secret', type: 'bytes32' },
        { name: 'resolver', type: 'address' },
        { name: 'data', type: 'bytes[]' },
        { name: 'reverseRecord', type: 'uint8' },
        { name: 'referrer', type: 'bytes32' }
      ],
      name: 'registration',
      type: 'tuple'
    }], 
    name: 'makeCommitment', 
    outputs: [{ name: 'commitment', type: 'bytes32' }], 
    stateMutability: 'pure', 
    type: 'function' 
  },
  { inputs: [{ name: 'commitment', type: 'bytes32' }], name: 'commit', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { 
    inputs: [{
      components: [
        { name: 'label', type: 'string' },
        { name: 'owner', type: 'address' },
        { name: 'duration', type: 'uint256' },
        { name: 'secret', type: 'bytes32' },
        { name: 'resolver', type: 'address' },
        { name: 'data', type: 'bytes[]' },
        { name: 'reverseRecord', type: 'uint8' },
        { name: 'referrer', type: 'bytes32' }
      ],
      name: 'registration',
      type: 'tuple'
    }], 
    name: 'register', 
    outputs: [], 
    stateMutability: 'payable', 
    type: 'function' 
  },
  { inputs: [], name: 'minCommitmentAge', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'MIN_REGISTRATION_DURATION', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as any

export function useEnsRegistration() {
  const { address } = useAccount()
  const publicClient = usePublicClient({ chainId: sepolia.id })
  const { data: walletClient } = useWalletClient({ chainId: sepolia.id })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registeredName, setRegisteredName] = useState<string | null>(null)
  const [registrationHash, setRegistrationHash] = useState<string | null>(null)
  const [commitmentTime, setCommitmentTime] = useState<number | null>(null)
  const [currentStep, setCurrentStep] = useState<'idle' | 'waiting' | 'registering'>('idle')

  const validateName = useCallback((name: string): boolean => {
    const cleanName = name.replace('.eth', '').toLowerCase()
    if (cleanName.length < 3) { setError('Too short'); return false }
    if (!/^[a-z0-9-]+$/.test(cleanName)) { setError('Invalid chars'); return false }
    if (cleanName.startsWith('-') || cleanName.endsWith('-')) { setError('No hyphens at start/end'); return false }
    setError(null)
    return true
  }, [])

  const checkAvailability = useCallback(async (name: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      if (!publicClient) { setError('Not connected'); setIsLoading(false); return false }
      const cleanName = name.replace('.eth', '').toLowerCase()
      if (!validateName(name)) { setIsLoading(false); return false }
      
      // Check if name is valid (min 3 chars)
      const isValid = await publicClient.readContract({
        address: ETH_REGISTRAR_CONTROLLER,
        abi: ETH_REGISTRAR_ABI,
        functionName: 'valid',
        args: [cleanName],
      } as any)
      
      if (!isValid) {
        setError('Domain name is invalid (min 3 characters)')
        setIsLoading(false)
        return false
      }
      
      // Check if name is available
      const available = await publicClient.readContract({
        address: ETH_REGISTRAR_CONTROLLER,
        abi: ETH_REGISTRAR_ABI,
        functionName: 'available',
        args: [cleanName],
      } as any)
      
      if (!available) {
        setError('Domain is not available')
        setIsLoading(false)
        return false
      }
      
      setError(null)
      setIsLoading(false)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Availability check failed'
      setError(msg)
      setIsLoading(false)
      return false
    }
  }, [publicClient, validateName])

  const getPrice = useCallback(async (name: string): Promise<bigint | null> => {
    try {
      if (!publicClient) return null
      const cleanName = name.replace('.eth', '').toLowerCase()
      
      const priceData = await publicClient.readContract({
        address: ETH_REGISTRAR_CONTROLLER,
        abi: ETH_REGISTRAR_ABI,
        functionName: 'rentPrice',
        args: [cleanName, BigInt(REGISTRATION_DURATION)],
      } as any) as { base: bigint; premium: bigint }
      
      // Return total price (base + premium)
      return priceData.base + priceData.premium
    } catch (err) {
      setError('Price fetch failed')
      return null
    }
  }, [publicClient])

  const submitCommitment = useCallback(async (name: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      if (!address || !walletClient || !publicClient) { setError('Wallet not connected'); setIsLoading(false); return false }
      
      const cleanName = name.replace('.eth', '').toLowerCase()
      if (!validateName(name)) { setIsLoading(false); return false }

      // Generate random 32-byte secret
      const secretBytes = crypto.getRandomValues(new Uint8Array(32))
      const secret = `0x${Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`

      // Create Registration struct
      const registration = {
        label: cleanName,
        owner: address,
        duration: BigInt(REGISTRATION_DURATION),
        secret: secret,
        resolver: PUBLIC_RESOLVER,
        data: [],
        reverseRecord: 0, // 0 = no reverse record
        referrer: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
      }

      // Get commitment hash
      const commitment = await publicClient!.readContract({
        address: ETH_REGISTRAR_CONTROLLER,
        abi: ETH_REGISTRAR_ABI,
        functionName: 'makeCommitment',
        args: [registration],
      } as any)

      // Submit commit transaction
      const commitTxHash = await (walletClient as any).writeContract({
        account: address,
        address: ETH_REGISTRAR_CONTROLLER,
        abi: ETH_REGISTRAR_ABI,
        functionName: 'commit',
        args: [commitment],
      })

      // Wait for confirmation
      await publicClient!.waitForTransactionReceipt({ hash: commitTxHash as `0x${string}` })

      // Store registration data for reveal phase (convert BigInt to string for localStorage)
      localStorage.setItem(`ens-${cleanName}`, JSON.stringify({
        name: cleanName,
        label: cleanName,
        owner: address,
        duration: REGISTRATION_DURATION.toString(),
        secret,
        resolver: PUBLIC_RESOLVER,
        commitment: commitment as string,
        timestamp: Date.now(),
      }))

      setCommitmentTime(Date.now())
      setCurrentStep('waiting')
      setIsLoading(false)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Commit failed'
      setError(msg)
      setIsLoading(false)
      return false
    }
  }, [address, walletClient, publicClient, validateName])

  const registerDomain = useCallback(async (name: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      if (!address || !walletClient || !publicClient) { setError('Wallet not connected'); setIsLoading(false); return false }
      
      const cleanName = name.replace('.eth', '').toLowerCase()
      
      const stored = localStorage.getItem(`ens-${cleanName}`)
      if (!stored) { setError('No commitment found'); setIsLoading(false); return false }

      const storedData = JSON.parse(stored)
      
      // Check 60 second wait (MIN_COMMITMENT_AGE)
      if (Date.now() - storedData.timestamp < 60000) {
        const wait = Math.ceil((60000 - (Date.now() - storedData.timestamp)) / 1000)
        setError(`Wait ${wait}s more`)
        setIsLoading(false)
        return false
      }

      setCurrentStep('registering')

      // Get price
      const price = await getPrice(name)
      if (!price) { setError('Price fetch failed'); setIsLoading(false); return false }
      
      const priceWithBuffer = price + (price / BigInt(10)) // 10% buffer

      // Reconstruct Registration struct for register call
      const registration = {
        label: storedData.label,
        owner: storedData.owner as `0x${string}`,
        duration: BigInt(storedData.duration),
        secret: storedData.secret as `0x${string}`,
        resolver: storedData.resolver as `0x${string}`,
        data: [],
        reverseRecord: 0,
        referrer: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
      }

      // Register with same Registration struct
      const registerTxHash = await (walletClient as any).writeContract({
        account: address,
        address: ETH_REGISTRAR_CONTROLLER,
        abi: ETH_REGISTRAR_ABI,
        functionName: 'register',
        args: [registration],
        value: priceWithBuffer,
      })

      // Wait for confirmation
      await publicClient!.waitForTransactionReceipt({ hash: registerTxHash as `0x${string}` })

      localStorage.removeItem(`ens-${cleanName}`)
      
      setRegisteredName(`${cleanName}.eth`)
      setRegistrationHash(registerTxHash)
      setCurrentStep('idle')
      setIsLoading(false)

      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      setError(msg)
      setIsLoading(false)
      return false
    }
  }, [address, walletClient, publicClient, getPrice])

  const getTimeRemaining = useCallback(() => {
    if (!commitmentTime) return 0
    const elapsed = Date.now() - commitmentTime
    return Math.ceil(Math.max(0, 60000 - elapsed) / 1000)
  }, [commitmentTime])

  const getEnsExplorerUrl = (ensName: string) => `https://sepolia.app.ens.domains/${ensName}`
  const getSepoliaExplorerUrl = (txHash: string) => `https://sepolia.etherscan.io/tx/${txHash}`

  return {
    isLoading,
    error,
    registeredName,
    registrationHash,
    currentStep,
    commitmentTime,
    getTimeRemaining,
    checkAvailability,
    getPrice,
    submitCommitment,
    registerDomain,
    validateName,
    getEnsExplorerUrl,
    getSepoliaExplorerUrl,
  }
}
