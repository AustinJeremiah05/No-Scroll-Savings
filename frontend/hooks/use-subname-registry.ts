import { useState } from 'react';
import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { Hash } from 'viem';

const SUBNAME_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_SUBNAME_REGISTRY_ADDRESS as `0x${string}`;

const SUBNAME_REGISTRY_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "label", "type": "string" },
      { "internalType": "string", "name": "parentEns", "type": "string" },
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "uint256", "name": "challengeId", "type": "uint256" },
      { "internalType": "uint256", "name": "durationInDays", "type": "uint256" }
    ],
    "name": "createSubname",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "label", "type": "string" },
      { "internalType": "string", "name": "parentEns", "type": "string" }
    ],
    "name": "subnameExists",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "subnameHash", "type": "bytes32" }
    ],
    "name": "getFullSubname",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "subnameHash", "type": "bytes32" }
    ],
    "name": "getSubname",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "label", "type": "string" },
          { "internalType": "string", "name": "parentEns", "type": "string" },
          { "internalType": "address", "name": "owner", "type": "address" },
          { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
          { "internalType": "uint256", "name": "expiresAt", "type": "uint256" },
          { "internalType": "uint256", "name": "linkedChallengeId", "type": "uint256" }
        ],
        "internalType": "struct SubnameRegistry.Subname",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "uint256", "name": "index", "type": "uint256" }
    ],
    "name": "getUserSubnames",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "challengeId", "type": "uint256" }
    ],
    "name": "getChallengeSubname",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "subnameHash", "type": "bytes32" },
      { "indexed": false, "internalType": "string", "name": "label", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "parentEns", "type": "string" },
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "challengeId", "type": "uint256" }
    ],
    "name": "SubnameCreated",
    "type": "event"
  }
] as const;

interface SubnameData {
  label: string;
  parentEns: string;
  owner: string;
  createdAt: bigint;
  expiresAt: bigint;
  linkedChallengeId: bigint;
}

export function useSubnameRegistry() {
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  /**
   * Create a new subname on Arc Testnet
   * @param label - The subname label (e.g., "daily")
   * @param parentEns - The parent ENS name (e.g., "sugan.eth")
   * @param challengeId - The challenge ID to link (0 if not linked yet)
   * @param durationInDays - How long the subname is valid (default 365 days)
   * @returns Transaction hash
   */
  const createSubname = async (
    label: string,
    parentEns: string,
    challengeId: number = 0,
    durationInDays: number = 365
  ): Promise<Hash> => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    if (!SUBNAME_REGISTRY_ADDRESS) {
      throw new Error('SubnameRegistry contract address not configured');
    }

    setIsCreating(true);
    setError(null);

    try {
      // Call createSubname on the contract
      const hash = await walletClient.writeContract({
        address: SUBNAME_REGISTRY_ADDRESS,
        abi: SUBNAME_REGISTRY_ABI,
        functionName: 'createSubname',
        args: [label, parentEns, address, BigInt(challengeId), BigInt(durationInDays)],
      });

      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      return hash;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to create subname';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Check if a subname already exists
   * @param label - The subname label
   * @param parentEns - The parent ENS name
   * @returns true if subname exists, false otherwise
   */
  const checkSubnameAvailability = async (
    label: string,
    parentEns: string
  ): Promise<boolean> => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    if (!SUBNAME_REGISTRY_ADDRESS) {
      throw new Error('SubnameRegistry contract address not configured');
    }

    setIsChecking(true);
    setError(null);

    try {
      const exists = await publicClient.readContract({
        address: SUBNAME_REGISTRY_ADDRESS,
        abi: SUBNAME_REGISTRY_ABI,
        functionName: 'subnameExists',
        args: [label, parentEns],
      });

      return exists as boolean;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to check subname availability';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * Get details of a subname by its hash
   * @param subnameHash - The keccak256 hash of the subname
   * @returns Subname data
   */
  const getSubnameDetails = async (subnameHash: Hash): Promise<SubnameData> => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    if (!SUBNAME_REGISTRY_ADDRESS) {
      throw new Error('SubnameRegistry contract address not configured');
    }

    try {
      const result = await publicClient.readContract({
        address: SUBNAME_REGISTRY_ADDRESS,
        abi: SUBNAME_REGISTRY_ABI,
        functionName: 'getSubname',
        args: [subnameHash],
      }) as any;

      return {
        label: result.label,
        parentEns: result.parentEns,
        owner: result.owner,
        createdAt: result.createdAt,
        expiresAt: result.expiresAt,
        linkedChallengeId: result.linkedChallengeId,
      };
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to get subname details';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Get all subnames owned by an address
   * @param ownerAddress - The owner's address (optional, defaults to connected wallet)
   * @returns Array of subname hashes
   */
  const getUserSubnames = async (ownerAddress?: string): Promise<Hash[]> => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    if (!SUBNAME_REGISTRY_ADDRESS) {
      throw new Error('SubnameRegistry contract address not configured');
    }

    const targetAddress = ownerAddress || address;
    if (!targetAddress) {
      throw new Error('No address provided');
    }

    try {
      const subnames: Hash[] = [];
      let index = 0;

      // Keep fetching until we get an error (no more subnames)
      while (true) {
        try {
          const subnameHash = await publicClient.readContract({
            address: SUBNAME_REGISTRY_ADDRESS,
            abi: SUBNAME_REGISTRY_ABI,
            functionName: 'getUserSubnames',
            args: [targetAddress as `0x${string}`, BigInt(index)],
          });
          subnames.push(subnameHash as Hash);
          index++;
        } catch {
          break; // No more subnames
        }
      }

      return subnames;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to get user subnames';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Get the subname linked to a challenge
   * @param challengeId - The challenge ID
   * @returns Subname hash (or zero hash if not linked)
   */
  const getChallengeSubname = async (challengeId: number): Promise<Hash> => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    if (!SUBNAME_REGISTRY_ADDRESS) {
      throw new Error('SubnameRegistry contract address not configured');
    }

    try {
      const subnameHash = await publicClient.readContract({
        address: SUBNAME_REGISTRY_ADDRESS,
        abi: SUBNAME_REGISTRY_ABI,
        functionName: 'getChallengeSubname',
        args: [BigInt(challengeId)],
      });

      return subnameHash as Hash;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to get challenge subname';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Get the full subname string (e.g., "daily.sugan.eth")
   * @param subnameHash - The subname hash
   * @returns Full subname string
   */
  const getFullSubname = async (subnameHash: Hash): Promise<string> => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    if (!SUBNAME_REGISTRY_ADDRESS) {
      throw new Error('SubnameRegistry contract address not configured');
    }

    try {
      const fullSubname = await publicClient.readContract({
        address: SUBNAME_REGISTRY_ADDRESS,
        abi: SUBNAME_REGISTRY_ABI,
        functionName: 'getFullSubname',
        args: [subnameHash],
      });

      return fullSubname as string;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to get full subname';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    createSubname,
    checkSubnameAvailability,
    getSubnameDetails,
    getUserSubnames,
    getChallengeSubname,
    getFullSubname,
    isCreating,
    isChecking,
    error,
  };
}
