"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
  CONTRACTS,
  SAVINGS_VAULT_ABI,
  CHALLENGE_TRACKER_ABI,
  ERC20_ABI,
  ARC_TESTNET_ID,
} from "@/lib/contracts";

export function useDepositUSDC() {
  const { writeContractAsync } = useWriteContract();

  const deposit = async (
    amount: string,
    receiver: string,
    lockDuration: number,
    challengeType: string
  ) => {
    const amountWei = parseUnits(amount, 6);

    // Approve USDC first
    const approveTx = await writeContractAsync({
      address: CONTRACTS.USDC_ARC as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.SAVINGS_VAULT as `0x${string}`, amountWei],
    });

    // Then deposit
    const depositTx = await writeContractAsync({
      address: CONTRACTS.SAVINGS_VAULT as `0x${string}`,
      abi: SAVINGS_VAULT_ABI,
      functionName: "deposit",
      args: [amountWei, receiver as `0x${string}`, BigInt(lockDuration), challengeType, BigInt(ARC_TESTNET_ID)],
    });

    return depositTx;
  };

  return { deposit };
}

export function useRecordCompliance() {
  const { writeContractAsync } = useWriteContract();

  const recordCompliance = async (user: string, isCompliant: boolean) => {
    const tx = await writeContractAsync({
      address: CONTRACTS.CHALLENGE_TRACKER as `0x${string}`,
      abi: CHALLENGE_TRACKER_ABI,
      functionName: "recordDailyCompliance",
      args: [user as `0x${string}`, isCompliant],
    });

    return tx;
  };

  return { recordCompliance };
}

export function useRequestRedeem() {
  const { writeContractAsync } = useWriteContract();

  const requestRedeem = async (
    shares: string,
    receiver: string,
    owner: string,
    destinationChainId: number
  ) => {
    const sharesWei = parseUnits(shares, 18);

    const tx = await writeContractAsync({
      address: CONTRACTS.SAVINGS_VAULT as `0x${string}`,
      abi: SAVINGS_VAULT_ABI,
      functionName: "requestRedeem",
      args: [sharesWei, receiver as `0x${string}`, owner as `0x${string}`, BigInt(destinationChainId)],
    });

    return tx;
  };

  return { requestRedeem };
}

export function useClaimRedemption() {
  const { writeContractAsync } = useWriteContract();

  const claimRedemption = async (requestId: string) => {
    const tx = await writeContractAsync({
      address: CONTRACTS.SAVINGS_VAULT as `0x${string}`,
      abi: SAVINGS_VAULT_ABI,
      functionName: "claimRedemption",
      args: [requestId as `0x${string}`],
    });

    return tx;
  };

  return { claimRedemption };
}

export function useGetStreak(user?: string) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.CHALLENGE_TRACKER as `0x${string}`,
    abi: CHALLENGE_TRACKER_ABI,
    functionName: "getCurrentStreak",
    args: user ? [user as `0x${string}`] : undefined,
    query: { enabled: !!user },
  });

  return {
    streak: data ? Number(data) : 0,
    isLoading,
    error,
  };
}

export function useGetLotteryEntries(user?: string) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.CHALLENGE_TRACKER as `0x${string}`,
    abi: CHALLENGE_TRACKER_ABI,
    functionName: "getLotteryEntries",
    args: user ? [user as `0x${string}`] : undefined,
    query: { enabled: !!user },
  });

  return {
    entries: data ? Number(data) : 0,
    isLoading,
    error,
  };
}

export function useGetChallenge(user?: string) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.CHALLENGE_TRACKER as `0x${string}`,
    abi: CHALLENGE_TRACKER_ABI,
    functionName: "challenges",
    args: user ? [user as `0x${string}`] : undefined,
    query: { enabled: !!user },
  });

  return {
    challenge: data
      ? {
          type: data[0],
          startTime: Number(data[1]),
          duration: Number(data[2]),
          streak: Number(data[3]),
          longestStreak: Number(data[4]),
          missedDays: Number(data[5]),
          active: data[6],
        }
      : null,
    isLoading,
    error,
  };
}

export function useGetBalance(user?: string) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.SAVINGS_VAULT as `0x${string}`,
    abi: SAVINGS_VAULT_ABI,
    functionName: "balanceOf",
    args: user ? [user as `0x${string}`] : undefined,
    query: { enabled: !!user },
  });

  return {
    balance: data ? formatUnits(data, 18) : "0",
    isLoading,
    error,
  };
}

export function useGetUserDeposit(user?: string) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.SAVINGS_VAULT as `0x${string}`,
    abi: SAVINGS_VAULT_ABI,
    functionName: "getUserDeposit",
    args: user ? [user as `0x${string}`] : undefined,
    query: { enabled: !!user },
  });

  return {
    deposit: data
      ? {
          shares: data[0],
          assets: data[1],
          depositTime: Number(data[2]),
          unlockTime: Number(data[3]),
          challengeType: data[4],
          active: data[5],
        }
      : null,
    isLoading,
    error,
    refetch,
  };
}
