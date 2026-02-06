"use client";

import { useState, useEffect } from "react";
import { useAccount, useEnsName } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { SentientSphere } from "@/components/sentient-sphere";
import { CONTRACTS } from "@/lib/contracts";
import {
  useDepositUSDC,
  useRecordCompliance,
  useRequestRedeem,
  useClaimRedemption,
  useGetStreak,
  useGetLotteryEntries,
  useGetChallenge,
  useGetBalance,
  useGetUserDeposit,
} from "@/hooks/useContract";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_KEY || ""
);

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("challenge");
  const [showDepositDetails, setShowDepositDetails] = useState(false);
  const { challenge, isLoading: challengeLoading } = useGetChallenge(address);
  const { deposit: userDeposit, isLoading: depositLoading, refetch: refetchDeposit } = useGetUserDeposit(address);

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  if (!isConnected) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-[#050505] text-foreground">
      {/* Hero Background */}
      <div className="fixed inset-0 z-0">
        <SentientSphere />
      </div>

      {/* Deposit Details Modal */}
      {showDepositDetails && userDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowDepositDetails(false)}>
          <div className="bg-black border border-accent/30 p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-mono text-sm tracking-wider uppercase text-accent">Deposit Details</h3>
              <button onClick={() => setShowDepositDetails(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="font-mono text-[10px] text-muted-foreground uppercase mb-1">Challenge</p>
                <p className="font-mono text-lg text-foreground">{userDeposit.challengeType}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase mb-1">Amount</p>
                  <p className="font-mono text-xl text-accent">{(Number(userDeposit.assets) / 1e6).toFixed(2)} USDC</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase mb-1">Shares</p>
                  <p className="font-mono text-lg text-foreground">{(Number(userDeposit.shares) / 1e6).toFixed(6)}</p>
                </div>
              </div>

              <div className="border-t border-border/20 pt-4 space-y-2">
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-muted-foreground">Deposited</span>
                  <span className="text-foreground">{new Date(userDeposit.depositTime * 1000).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-muted-foreground">Unlocks</span>
                  <span className={`${Date.now() >= userDeposit.unlockTime * 1000 ? 'text-accent' : 'text-muted-foreground'}`}>
                    {new Date(userDeposit.unlockTime * 1000).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`${Date.now() >= userDeposit.unlockTime * 1000 ? 'text-accent' : 'text-yellow-500'}`}>
                    {Date.now() >= userDeposit.unlockTime * 1000 ? '✅ Unlocked' : '🔒 Locked'}
                  </span>
                </div>
              </div>

              {challenge?.active && (
                <div className="border-t border-border/20 pt-4">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase mb-2">Challenge Stats</p>
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-xs">
                      <span className="text-muted-foreground">Current Streak</span>
                      <span className="text-accent">{challenge.streak || 0} days</span>
                    </div>
                    <div className="flex justify-between font-mono text-xs">
                      <span className="text-muted-foreground">Longest Streak</span>
                      <span className="text-foreground">{challenge.longestStreak || 0} days</span>
                    </div>
                    <div className="flex justify-between font-mono text-xs">
                      <span className="text-muted-foreground">Missed Days</span>
                      <span className="text-destructive">{challenge.missedDays || 0} days</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header - Fixed on side */}
        <div className="fixed top-8 left-8 z-20 max-w-[280px]">
          <div className="mb-2">
            <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase mb-1">Dashboard</p>
            <h1 className="font-sans text-2xl font-light tracking-tight">No-Scroll Savings</h1>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground mt-2 tracking-wide break-all">
            {address}
          </p>

          {/* Active Challenges */}
          <div className="mt-8">
            <p className="font-mono text-[9px] tracking-[0.3em] text-muted-foreground uppercase mb-3">Active Challenges</p>
            {challengeLoading || depositLoading ? (
              <div className="border border-border/20 bg-black/60 backdrop-blur-sm p-4">
                <p className="font-mono text-[10px] text-muted-foreground">Loading...</p>
              </div>
            ) : userDeposit?.active && Number(userDeposit.shares) > 0 ? (
              <button
                onClick={() => setShowDepositDetails(true)}
                className="w-full border border-accent/30 bg-accent/5 backdrop-blur-sm p-4 text-left hover:bg-accent/10 transition-colors group"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-mono text-xs text-foreground group-hover:text-accent transition-colors">{userDeposit.challengeType}</p>
                    <p className="font-mono text-[10px] text-muted-foreground mt-1">
                      {(Number(userDeposit.assets) / 1e6).toFixed(2)} USDC • Click for details
                    </p>
                  </div>
                  <span className="font-mono text-[8px] px-2 py-1 border border-accent/40 text-accent uppercase">Active</span>
                </div>
              </button>
            ) : (
              <div className="border border-border/20 bg-black/60 backdrop-blur-sm p-4">
                <p className="font-mono text-[10px] text-muted-foreground">No active challenges</p>
                <p className="font-mono text-[9px] text-muted-foreground/60 mt-1">Create one to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Container - Centered */}
        <div className="flex items-start justify-center min-h-screen pt-8 pb-12 px-4">
          <div className="w-full max-w-4xl bg-black/80 backdrop-blur-sm border border-border/20 mt-24">
            {/* Tabs */}
            <div className="border-b border-border/30 px-8 pt-8">
              <div className="flex gap-6 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("launch")}
                  className={`pb-3 font-mono text-xs tracking-[0.2em] uppercase transition-colors whitespace-nowrap ${
                    activeTab === "launch"
                      ? "border-b-2 border-accent text-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Launch
                </button>
                <button
                  onClick={() => setActiveTab("monitor")}
                  className={`pb-3 font-mono text-xs tracking-[0.2em] uppercase transition-colors whitespace-nowrap ${
                    activeTab === "monitor"
                      ? "border-b-2 border-accent text-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monitor
                </button>
                <button
                  onClick={() => setActiveTab("withdraw")}
                  className={`pb-3 font-mono text-xs tracking-[0.2em] uppercase transition-colors whitespace-nowrap ${
                    activeTab === "withdraw"
                      ? "border-b-2 border-accent text-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Withdraw
                </button>
                <button
                  onClick={() => setActiveTab("stats")}
                  className={`pb-3 font-mono text-xs tracking-[0.2em] uppercase transition-colors whitespace-nowrap ${
                    activeTab === "stats"
                      ? "border-b-2 border-accent text-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Stats
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-8">
              {activeTab === "launch" && <LaunchChallengeTab address={address} refetchDeposit={refetchDeposit} />}
              {activeTab === "monitor" && <MonitorTab address={address} />}
              {activeTab === "withdraw" && <WithdrawTab address={address} />}
              {activeTab === "stats" && <StatsTab address={address} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LaunchChallengeTab({ address, refetchDeposit }: { address?: string; refetchDeposit?: () => void }) {
  const [challengeType, setChallengeType] = useState("Instagram");
  const [durationValue, setDurationValue] = useState("2");
  const [durationUnit, setDurationUnit] = useState("minutes");
  const [depositAmount, setDepositAmount] = useState("");
  const [ensAddress, setEnsAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const { deposit } = useDepositUSDC();

  // Fetch ENS name from blockchain using wallet address
  const { data: mainnetEnsName, isLoading: mainnetLoading } = useEnsName({
    address: address as `0x${string}` | undefined,
    chainId: mainnet.id,
    query: {
      enabled: !!address,
    }
  });

  const { data: sepoliaEnsName, isLoading: sepoliaLoading } = useEnsName({
    address: address as `0x${string}` | undefined,
    chainId: sepolia.id,
    query: {
      enabled: !!address && !mainnetEnsName,
    }
  });

  const isLoadingEns = mainnetLoading || sepoliaLoading;
  const blockchainEnsName = mainnetEnsName || sepoliaEnsName;

  // Load ENS from blockchain or localStorage and listen for updates
  useEffect(() => {
    // Priority 1: Use blockchain-fetched ENS name (most reliable)
    if (blockchainEnsName && !isLoadingEns) {
      setEnsAddress(blockchainEnsName);
      localStorage.setItem("userEnsAddress", blockchainEnsName);
      console.log('🔗 ENS fetched from blockchain:', blockchainEnsName);
      return;
    }

    // Priority 2: Load from localStorage (if no blockchain ENS found)
    const savedEns = localStorage.getItem("userEnsAddress");
    if (savedEns && !blockchainEnsName && !isLoadingEns) {
      setEnsAddress(savedEns);
      console.log('📥 Loaded ENS from localStorage:', savedEns);
    }
  }, [blockchainEnsName, isLoadingEns]);

  // Listen for real-time updates from ENS registration modal
  useEffect(() => {
    // Listen for storage events (when localStorage is updated from another tab/component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userEnsAddress' && e.newValue) {
        setEnsAddress(e.newValue);
        console.log('🔄 ENS updated from storage event:', e.newValue);
      }
    };

    // Custom event listener for same-tab updates
    const handleCustomUpdate = (e: CustomEvent) => {
      if (e.detail) {
        setEnsAddress(e.detail);
        console.log('🔄 ENS updated from custom event:', e.detail);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ensRegistered', handleCustomUpdate as EventListener);

    // Periodic check as fallback
    const interval = setInterval(() => {
      const currentEns = localStorage.getItem("userEnsAddress");
      if (currentEns && currentEns !== ensAddress) {
        setEnsAddress(currentEns);
        console.log('🔄 ENS updated from periodic check:', currentEns);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ensRegistered', handleCustomUpdate as EventListener);
      clearInterval(interval);
    };
  }, [ensAddress]);

  const socialMediaApps = [
    "Instagram",
    "Snapchat",
    "TikTok",
    "Twitter",
    "Facebook",
    "LinkedIn",
    "YouTube",
  ];

  const timeUnits = [
    { label: "Seconds", value: "seconds", multiplier: 1 },
    { label: "Minutes", value: "minutes", multiplier: 60 },
    { label: "Hours", value: "hours", multiplier: 3600 },
    { label: "Days", value: "days", multiplier: 86400 },
    { label: "Weeks", value: "weeks", multiplier: 604800 },
    { label: "Months", value: "months", multiplier: 2592000 },
  ];

  const calculateDurationInSeconds = () => {
    const unit = timeUnits.find(u => u.value === durationUnit);
    const value = parseFloat(durationValue) || 0;
    return Math.floor(value * (unit?.multiplier || 1));
  };

  const durationInSeconds = calculateDurationInSeconds();

  const formatDurationDisplay = () => {
    if (durationInSeconds === 0) return "0 seconds";
    
    const days = Math.floor(durationInSeconds / 86400);
    const hours = Math.floor((durationInSeconds % 86400) / 3600);
    const mins = Math.floor((durationInSeconds % 3600) / 60);
    const secs = durationInSeconds % 60;

    let result = [];
    if (days > 0) result.push(`${days}d`);
    if (hours > 0) result.push(`${hours}h`);
    if (mins > 0) result.push(`${mins}m`);
    if (secs > 0) result.push(`${secs}s`);
    
    return result.join(" ") || "0s";
  };

  const handleCreateAndDeposit = async () => {
    if (!address || !depositAmount || durationInSeconds === 0) {
      setStatus("❌ Please fill in all fields");
      return;
    }

    if (!ensAddress || ensAddress.trim() === "") {
      setStatus("❌ Please enter your ENS address or username for mobile app tracking");
      return;
    }

    setLoading(true);
    setStatus("🚀 Creating challenge and depositing USDC...");
    
    try {
      // Save ENS address to localStorage for Monitor tab
      localStorage.setItem("userEnsAddress", ensAddress.trim());
      
      // Call deposit which will create challenge + deposit in vault
      const tx = await deposit(depositAmount, address, durationInSeconds, `No ${challengeType}`);
      setStatus(`SUCCESS\n\nChallenge created and funds deposited.\nTransaction: ${tx?.slice(0, 10)}...\n\nYour ENS/Username: ${ensAddress}\nMake sure your mobile app uses this same identifier.\n\nSwitch to Monitor tab to verify tracking.`);
      
      // Refetch deposit data to update UI
      if (refetchDeposit) {
        setTimeout(() => refetchDeposit(), 2000); // Wait 2s for block confirmation
      }
      
      // Reset form (but keep ENS)
      setDepositAmount("");
      setDurationValue("5");
      setDurationUnit("minutes");
    } catch (error: any) {
      setStatus(`ERROR\n\n${error?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const durationDisplay = formatDurationDisplay();

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase mb-2">01 — Challenge</p>
        <h2 className="font-sans text-2xl font-light tracking-tight mb-3">Launch Challenge & Deposit</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">Configure your challenge parameters and deposit USDC in a single transaction. Once deposited, opening {challengeType} during the challenge period will result in failure.</p>
      </div>

      {/* Social Media App Selection */}
      <div className="mb-8">
        <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">Target Application</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {socialMediaApps.map((app) => (
            <button
              key={app}
              onClick={() => setChallengeType(app)}
              className={`px-4 py-3 border transition-all font-mono text-xs tracking-wider ${
                challengeType === app
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border/30 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {app}
            </button>
          ))}
        </div>
      </div>

      {/* Duration Selection */}
      <div className="mb-8">
        <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">Duration</label>
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="number"
              value={durationValue}
              onChange={(e) => setDurationValue(e.target.value)}
              placeholder="Enter duration"
              min="0.1"
              step="0.1"
              className="w-full bg-background border border-border/30 px-4 py-3 text-foreground font-mono text-sm focus:outline-none focus:border-accent transition-colors"
              disabled={loading}
            />
          </div>

          <div className="flex-1">
            <select
              value={durationUnit}
              onChange={(e) => setDurationUnit(e.target.value)}
              className="w-full bg-background border border-border/30 px-4 py-3 text-foreground font-mono text-sm focus:outline-none focus:border-accent transition-colors"
              disabled={loading}
            >
              {timeUnits.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <p className="font-mono text-[9px] tracking-wider text-muted-foreground mb-3 uppercase">Quick Presets</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setDurationValue("2");
                setDurationUnit("minutes");
              }}
              disabled={loading}
              className="px-3 py-2 border border-border/30 hover:border-accent hover:text-accent disabled:opacity-30 text-xs font-mono tracking-wide transition-all"
            >
              2 Min
            </button>
            <button
              onClick={() => {
                setDurationValue("6");
                setDurationUnit("minutes");
              }}
              disabled={loading}
              className="px-3 py-2 border border-border/30 hover:border-accent hover:text-accent disabled:opacity-30 text-xs font-mono tracking-wide transition-all"
            >
              6 Min
            </button>
            <button
              onClick={() => {
                setDurationValue("1");
                setDurationUnit("hours");
              }}
              disabled={loading}
              className="px-3 py-2 border border-border/30 hover:border-accent hover:text-accent disabled:opacity-30 text-xs font-mono tracking-wide transition-all"
            >
              1 Hour
            </button>
            <button
              onClick={() => {
                setDurationValue("1");
                setDurationUnit("days");
              }}
              disabled={loading}
              className="px-3 py-2 border border-border/30 hover:border-accent hover:text-accent disabled:opacity-30 text-xs font-mono tracking-wide transition-all"
            >
              1 Day
            </button>
            <button
              onClick={() => {
                setDurationValue("1");
                setDurationUnit("weeks");
              }}
              disabled={loading}
              className="px-3 py-2 border border-border/30 hover:border-accent hover:text-accent disabled:opacity-30 text-xs font-mono tracking-wide transition-all"
            >
              1 Week
            </button>
            <button
              onClick={() => {
                setDurationValue("1");
                setDurationUnit("months");
              }}
              disabled={loading}
              className="px-3 py-2 border border-border/30 hover:border-accent hover:text-accent disabled:opacity-30 text-xs font-mono tracking-wide transition-all"
            >
              1 Month
            </button>
            <button
              onClick={() => {
                setDurationValue("3");
                setDurationUnit("months");
              }}
              disabled={loading}
              className="px-3 py-2 border border-border/30 hover:border-accent hover:text-accent disabled:opacity-30 text-xs font-mono tracking-wide transition-all"
            >
              3 Months
            </button>
          </div>
        </div>
      </div>

      {/* ENS Address / Username */}
      <div className="mb-8">
        <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
          ENS Address / Mobile App Username
          {isLoadingEns && (
            <span className="ml-2 text-accent animate-pulse">Fetching from blockchain...</span>
          )}
          {blockchainEnsName && !isLoadingEns && (
            <span className="ml-2 text-green-500">✓ Found on blockchain</span>
          )}
        </label>
        <input
          type="text"
          value={ensAddress}
          onChange={(e) => setEnsAddress(e.target.value)}
          placeholder={
            isLoadingEns 
              ? "Checking blockchain for your ENS..." 
              : "yourname.eth or unique username"
          }
          className="w-full bg-background border border-border/30 px-4 py-3 text-foreground font-mono text-sm focus:outline-none focus:border-accent transition-colors"
          disabled={loading || isLoadingEns}
        />
        <p className="text-xs text-muted-foreground mt-2">
          This must match the <span className="font-mono text-accent">user_id</span> field configured in your mobile app.
          {blockchainEnsName && (
            <span className="block mt-1 text-green-500">
              ✓ ENS fetched from blockchain: <span className="font-mono">{blockchainEnsName}</span>
              {sepoliaEnsName && " (Sepolia Testnet)"}
            </span>
          )}
        </p>
      </div>

      {/* Deposit Amount */}
      <div className="mb-8">
        <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">Deposit Amount (USDC)</label>
        <div className="flex gap-3">
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="10"
            min="10"
            step="1"
            className="flex-1 bg-background border border-border/30 px-4 py-3 text-foreground font-mono text-sm focus:outline-none focus:border-accent transition-colors"
            disabled={loading}
          />
          <button
            onClick={() => setDepositAmount("100")}
            disabled={loading}
            className="px-6 py-3 border border-border/30 hover:border-accent hover:text-accent disabled:opacity-30 font-mono text-xs tracking-wide transition-all"
          >
            100
          </button>
          <button
            onClick={() => setDepositAmount("500")}
            disabled={loading}
            className="px-6 py-3 border border-border/30 hover:border-accent hover:text-accent disabled:opacity-30 font-mono text-xs tracking-wide transition-all"
          >
            500
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="border border-border/20 p-6 mb-8">
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-4">Summary</p>
        <div className="space-y-3 font-mono text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Target</span>
            <span className="text-foreground">{challengeType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span className="text-foreground">{durationDisplay} ({durationInSeconds}s)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deposit</span>
            <span className="text-foreground">{depositAmount || "0"} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="text-accent">Ready</span>
          </div>
        </div>
      </div>

      {/* Yield Info */}
      <div className="border border-accent/20 bg-accent/5 p-6 mb-8">
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3">Yield Distribution</p>
        <div className="space-y-2 font-mono text-xs text-muted-foreground">
          <div>60% Aave (3% APY)</div>
          <div>30% Uniswap (swap fees)</div>
          <div>10% Buffer</div>
        </div>
      </div>

      {/* Launch Button */}
      <button
        onClick={handleCreateAndDeposit}
        disabled={loading || durationInSeconds === 0 || !depositAmount}
        className="w-full border border-accent bg-accent/10 hover:bg-accent/20 disabled:opacity-30 disabled:cursor-not-allowed px-6 py-4 font-mono text-sm tracking-wider uppercase text-accent transition-all"
      >
        {loading ? "Processing..." : "Create Challenge & Deposit"}
      </button>

      {status && (
        <div className={`mt-6 p-4 border whitespace-pre-line font-mono text-xs ${
          status.includes("SUCCESS") ? "border-accent/30 bg-accent/5 text-accent" : "border-destructive/30 bg-destructive/5 text-destructive"
        }`}>
          {status}
        </div>
      )}
    </div>
  );
}

function MonitorTab({ address }: { address?: string }) {
  const [checking, setChecking] = useState(false);
  const [appUsage, setAppUsage] = useState<any[]>([]);
  const [lastCheck, setLastCheck] = useState<string>("");
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [forbiddenApps, setForbiddenApps] = useState<string[]>([]);
  const [isCompliant, setIsCompliant] = useState<boolean | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [userEnsAddress, setUserEnsAddress] = useState<string>("");
  const { challenge } = useGetChallenge(address);

  // Load ENS from localStorage
  useEffect(() => {
    const savedEns = localStorage.getItem("userEnsAddress");
    if (savedEns) {
      setUserEnsAddress(savedEns);
    }
  }, []);

  const handleCheckCompliance = async () => {
    if (!address) return;

    if (!userEnsAddress || userEnsAddress.trim() === "") {
      alert("Please set your ENS address in the Launch tab first");
      return;
    }
    
    setChecking(true);
    try {
      // Get challenge time window
      const challengeStartTime = challenge?.startTime 
        ? new Date(challenge.startTime * 1000) 
        : new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const challengeEndTime = challenge?.startTime && challenge?.duration
        ? new Date((challenge.startTime + challenge.duration) * 1000)
        : new Date();

      console.log("🔍 Querying Supabase...");
      console.log("📍 URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log("👤 ENS/User ID:", userEnsAddress);
      console.log("👤 Wallet:", address.toLowerCase());
      console.log("⏰ Challenge Window:", challengeStartTime.toLocaleString(), "to", challengeEndTime.toLocaleString());

      // First, test connection with a simple query (no filters)
      const { data: testData, error: testError } = await supabase
        .from("usage_records")
        .select("*", { count: 'exact', head: false })
        .limit(1);

      if (testError) {
        console.error("❌ Supabase connection error:", testError);
        setSupabaseConnected(false);
        throw new Error(`Supabase connection failed: ${testError.message}`);
      }

      console.log("✅ Supabase connection successful!");
      setSupabaseConnected(true);

      // Query by user_id field (matches ENS/username from mobile app)
      // Convert dates to Unix timestamps (milliseconds) for bigint comparison
      const startTimestamp = challengeStartTime.getTime();
      const endTimestamp = challengeEndTime.getTime();
      
      console.log("📅 Timestamp range:", startTimestamp, "to", endTimestamp);

      const { data, error } = await supabase
        .from("usage_records")
        .select("*")
        .eq("user_id", userEnsAddress.trim())
        .gte("timestamp", startTimestamp)
        .lte("timestamp", endTimestamp);

      if (error) {
        console.error("❌ Query error:", error);
        // Connection is fine, just the query had issues
        setAppUsage([]);
        setLastCheck(new Date().toLocaleTimeString());
        setIsCompliant(true); // Default to compliant if no data
        return;
      }

      console.log("📊 Records found:", data?.length || 0);
      
      if (!data || data.length === 0) {
        console.log("⚠️ No records found for ENS/User ID:", userEnsAddress);
        console.log("💡 Make sure your mobile app is:");
        console.log("   1. Sending data to Supabase");
        console.log("   2. Using user_id field with value:", userEnsAddress.trim());
      }

      setAppUsage(data || []);
      setLastCheck(new Date().toLocaleTimeString());

      // Check for forbidden social media apps
      const forbiddenAppsToCheck = ["Instagram", "Snapchat", "TikTok", "Twitter", "Facebook", "LinkedIn", "YouTube"];
      const foundForbidden: string[] = [];

      const hasForbiddenApp = data?.some((record: any) => {
        const appName = record.app_name?.toLowerCase() || "";
        const packageName = record.package_name?.toLowerCase() || "";
        
        const found = forbiddenAppsToCheck.find(app => 
          appName.includes(app.toLowerCase()) || 
          packageName.includes(app.toLowerCase())
        );

        if (found && !foundForbidden.includes(found)) {
          foundForbidden.push(found);
        }

        return found;
      });

      setForbiddenApps(foundForbidden);
      setIsCompliant(!hasForbiddenApp);
    } catch (error) {
      console.error("❌ Compliance check failed:", error);
      setSupabaseConnected(false);
    } finally {
      setChecking(false);
    }
  };

  // Auto-refresh every 10 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      handleCheckCompliance();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, address]);

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase mb-2">02 — Monitor</p>
        <h2 className="font-sans text-2xl font-light tracking-tight mb-3">Compliance Check</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">Real-time monitoring of application usage through Supabase integration.</p>
      </div>

      {/* Supabase Connection Status */}
      <div className={`p-6 border mb-8 ${
        supabaseConnected === true ? "border-accent/30 bg-accent/5" : 
        supabaseConnected === false ? "border-destructive/30 bg-destructive/5" : 
        "border-border/20"
      }`}>
        <p className="font-mono text-xs tracking-wider uppercase mb-2">
          {supabaseConnected === true ? "CONNECTED" : 
           supabaseConnected === false ? "CONNECTION FAILED" : 
           "PENDING"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {supabaseConnected === true ? "Successfully querying app usage data" :
           supabaseConnected === false ? "Cannot connect to Supabase - check credentials" :
           "Click Check Compliance to test connection"}
        </p>
        
        <div className="mt-4 text-[10px] font-mono border border-border/10 p-3 space-y-1">
          <p className="text-muted-foreground">URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET"}</p>
          <p className="text-muted-foreground">Key: {process.env.NEXT_PUBLIC_SUPABASE_KEY ? "Set" : "NOT SET"}</p>
          <p className="text-muted-foreground">Table: usage_records</p>
          <p className="text-muted-foreground">Query Field: user_id</p>
          <p className="text-accent">ENS/User ID: {userEnsAddress || "Not set - configure in Launch tab"}</p>
          <p className="text-muted-foreground">Wallet: {address?.toLowerCase() || "No wallet"}</p>
          {challenge?.active && (
            <>
              <p className="text-accent mt-2">Challenge: {challenge.type}</p>
              <p className="text-accent">Duration: {Math.floor(challenge.duration / 60)} minutes</p>
              <p className="text-accent">Started: {new Date(challenge.startTime * 1000).toLocaleString()}</p>
            </>
          )}
        </div>
      </div>

      {/* Check Button & Auto-Refresh */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleCheckCompliance}
          disabled={checking}
          className="flex-1 border border-accent bg-accent/10 hover:bg-accent/20 disabled:opacity-30 px-6 py-3 font-mono text-sm tracking-wider uppercase text-accent transition-all"
        >
          {checking ? "Checking..." : "Check Compliance"}
        </button>

        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-6 py-3 border font-mono text-sm tracking-wider uppercase transition-all ${
            autoRefresh 
              ? "border-accent bg-accent/10 text-accent" 
              : "border-border/30 text-muted-foreground hover:border-border hover:text-foreground"
          }`}
        >
          {autoRefresh ? "Stop Auto" : "Auto (10s)"}
        </button>
      </div>

      {lastCheck && (
        <p className="text-xs font-mono text-muted-foreground mb-6">Last checked: {lastCheck}</p>
      )}

      {/* Compliance Status */}
      {isCompliant !== null && (
        <div className={`p-6 border mb-8 ${
          isCompliant 
            ? "border-accent/30 bg-accent/5"
            : "border-destructive/30 bg-destructive/5"
        }`}>
          <p className="font-mono text-xs tracking-wider uppercase mb-3">
            {isCompliant ? "COMPLIANT" : "FAILED"}
          </p>
          {isCompliant ? (
            <p className="text-sm text-muted-foreground">No forbidden apps detected in the last 24 hours.</p>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Forbidden apps detected:</p>
              <div className="space-y-1 font-mono text-xs">
                {forbiddenApps.map(app => (
                  <div key={app}>{app}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* App Usage Details from Supabase */}
      {appUsage.length > 0 && (
        <div className="border border-border/20 p-6 mb-8">
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-4">Recent App Usage (24h)</p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {appUsage.slice(0, 20).map((record: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center pb-2 border-b border-border/10">
                <span className="font-mono text-xs text-foreground">{record.app_name || record.package_name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{new Date(record.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
          {appUsage.length > 20 && (
            <p className="font-mono text-[10px] text-muted-foreground mt-3">+{appUsage.length - 20} more records</p>
          )}
        </div>
      )}

      {supabaseConnected === true && appUsage.length === 0 && lastCheck && (
        <div className="border border-border/20 bg-black/40 p-6 mb-8">
          <p className="font-mono text-xs tracking-wider uppercase text-muted-foreground mb-3">NO DATA FOUND</p>
          <p className="text-sm text-muted-foreground mb-4">No app usage records found for ENS: <span className="font-mono text-accent">{userEnsAddress}</span></p>
          <div className="text-xs text-muted-foreground space-y-2 border-l-2 border-border/20 pl-4">
            <p>💡 To enable tracking:</p>
            <p>1. Install the No-Scroll mobile app on your phone</p>
            <p>2. Configure the app to use user_id: <span className="font-mono text-accent">{userEnsAddress}</span></p>
            <p>3. Grant app usage permissions</p>
            <p>4. The app will automatically send data to Supabase</p>
            <p className="mt-2 text-muted-foreground/70">📝 Your wallet: <span className="font-mono">{address?.toLowerCase()}</span></p>
          </div>
        </div>
      )}

      {/* Record On-Chain Button (if compliant check done) */}
      {isCompliant !== null && (
        <button
          disabled={checking}
          className="w-full border border-accent bg-accent/10 hover:bg-accent/20 disabled:opacity-30 px-6 py-3 font-mono text-sm tracking-wider uppercase text-accent transition-all"
        >
          Record Compliance On-Chain
        </button>
      )}
    </div>
  );
}

function WithdrawTab({ address }: { address?: string }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [shares, setShares] = useState("");
  const [requestId, setRequestId] = useState("");
  const { requestRedeem } = useRequestRedeem();
  const { claimRedemption } = useClaimRedemption();

  const handleRedeem = async () => {
    if (!address || !shares) return;
    setLoading(true);
    setStatus("Requesting redemption...");
    try {
      const hash = await requestRedeem(shares, address, address, 11155111); // Sepolia
      setStatus(`SUCCESS\n\nRedemption requested.\nTransaction: ${hash?.slice(0, 10)}...`);
      setShares("");
    } catch (error: any) {
      setStatus(`ERROR\n\n${error?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!requestId) return;
    setLoading(true);
    setStatus("Claiming redemption...");
    try {
      const hash = await claimRedemption(requestId);
      setStatus(`SUCCESS\n\nClaim successful.\nTransaction: ${hash?.slice(0, 10)}...`);
      setRequestId("");
    } catch (error: any) {
      setStatus(`ERROR\n\n${error?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase mb-2">03 — Withdraw</p>
        <h2 className="font-sans text-2xl font-light tracking-tight mb-3">Redemption</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">Request redemption of your shares or claim after unlock period.</p>
      </div>

      <div className="space-y-8">
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">Shares to Redeem</label>
          <input
            type="text"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="0"
            className="w-full bg-background border border-border/30 px-4 py-3 text-foreground font-mono text-sm focus:outline-none focus:border-accent transition-colors mb-4"
            disabled={loading}
          />
          <button
            onClick={handleRedeem}
            disabled={loading || !shares}
            className="w-full border border-accent bg-accent/10 hover:bg-accent/20 disabled:opacity-30 px-6 py-3 font-mono text-sm tracking-wider uppercase text-accent transition-all"
          >
            Request Redemption
          </button>
        </div>

        <div className="border-t border-border/20 pt-8">
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">Request ID (to claim after unlock)</label>
          <input
            type="text"
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
            placeholder="0x..."
            className="w-full bg-background border border-border/30 px-4 py-3 text-foreground font-mono text-xs focus:outline-none focus:border-accent transition-colors mb-4"
            disabled={loading}
          />
          <button
            onClick={handleClaim}
            disabled={loading || !requestId}
            className="w-full border border-accent bg-accent/10 hover:bg-accent/20 disabled:opacity-30 px-6 py-3 font-mono text-sm tracking-wider uppercase text-accent transition-all"
          >
            Claim (After Unlock)
          </button>
        </div>
      </div>

      {status && (
        <div className={`mt-6 p-4 border whitespace-pre-line font-mono text-xs ${
          status.includes("SUCCESS") ? "border-accent/30 bg-accent/5 text-accent" : "border-destructive/30 bg-destructive/5 text-destructive"
        }`}>
          {status}
        </div>
      )}
    </div>
  );
}

function StatsTab({ address }: { address?: string }) {
  const { streak, isLoading: streakLoading } = useGetStreak(address);
  const { entries, isLoading: entriesLoading } = useGetLotteryEntries(address);
  const { challenge, isLoading: challengeLoading } = useGetChallenge(address);
  const { balance, isLoading: balanceLoading } = useGetBalance(address);

  const loading = streakLoading || entriesLoading || challengeLoading || balanceLoading;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase mb-2">04 — Statistics</p>
        <h2 className="font-sans text-2xl font-light tracking-tight mb-3">Your Performance</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">Overview of your challenge statistics and progress.</p>
      </div>

      {loading ? (
        <p className="font-mono text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <div className="border border-border/20 p-6">
            <p className="font-mono text-[9px] tracking-wider uppercase text-muted-foreground mb-3">Balance (Shares)</p>
            <p className="font-sans text-3xl font-light tracking-tight">{parseFloat(balance).toFixed(2)}</p>
          </div>
          <div className="border border-border/20 p-6">
            <p className="font-mono text-[9px] tracking-wider uppercase text-muted-foreground mb-3">Current Streak</p>
            <p className="font-sans text-3xl font-light tracking-tight">{streak} days</p>
          </div>
          <div className="border border-border/20 p-6">
            <p className="font-mono text-[9px] tracking-wider uppercase text-muted-foreground mb-3">Lottery Entries</p>
            <p className="font-sans text-3xl font-light tracking-tight">{entries}</p>
          </div>
          <div className="border border-border/20 p-6">
            <p className="font-mono text-[9px] tracking-wider uppercase text-muted-foreground mb-3">Challenge</p>
            <p className="font-mono text-sm">{challenge?.active ? challenge.type : "No active challenge"}</p>
          </div>
          {challenge?.active && (
            <>
              <div className="border border-border/20 p-6">
                <p className="font-mono text-[9px] tracking-wider uppercase text-muted-foreground mb-3">Longest Streak</p>
                <p className="font-sans text-3xl font-light tracking-tight">{challenge.longestStreak} days</p>
              </div>
              <div className="border border-border/20 p-6">
                <p className="font-mono text-[9px] tracking-wider uppercase text-muted-foreground mb-3">Missed Days</p>
                <p className="font-sans text-3xl font-light tracking-tight">{challenge.missedDays}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
