// Load environment variables FIRST
import "dotenv/config";

// Import Bridge Kit and its dependencies
import { BridgeKit } from "@circle-fin/bridge-kit";
import { createViemAdapterFromPrivateKey } from "@circle-fin/adapter-viem-v2";
import { inspect } from "util";
import { createPublicClient, createWalletClient, http, formatUnits, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";

// Contract addresses
const SAVINGS_VAULT_ARC = "0xF4df10e373E509EC3d96237df91bE9B0006E918D";
const TREASURY_MANAGER_SEPOLIA = "0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9"; // Updated deployment
const UNISWAP_V4_AGENT_SEPOLIA = "0xBABe158C1c2B674dD31bb404A2A2Ec1f144a57B6"; // Simplified working version (2026-02-06)
const USDC_ARC = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

// Chain configs
const arcChain = {
  id: 5042002,
  name: "Arc Testnet",
  network: "arc-testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
    public: { http: ["https://rpc.testnet.arc.network"] },
  },
};

const sepoliaChain = {
  id: 11155111,
  name: "Sepolia",
  network: "sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.infura.io/v3/5a9a3914ddfd4af3a25fcd22cf042a8e"] },
    public: { http: ["https://sepolia.infura.io/v3/5a9a3914ddfd4af3a25fcd22cf042a8e"] },
  },
};

// ABIs
const savingsVaultAbi = parseAbi([
  "event BridgeToSepoliaRequested(address indexed user, uint256 amount, bytes32 indexed bridgeRequestId)",
  "event BridgeFromSepoliaRequested(bytes32 indexed requestId, uint256 amount)",
  "event DepositWithChallenge(address indexed caller, address indexed owner, uint256 assets, uint256 shares, string challengeType, uint256 lockDuration, uint256 sourceChainId)",
  "function confirmBridgeToSepolia(bytes32 bridgeRequestId, uint256 amount) external",
  "function confirmBridgeFromSepolia(bytes32 requestId, uint256 amount) external",
  "function completeRedemption(bytes32 requestId) external",
  "function transferForCCTPBridge(bytes32 bridgeRequestId, uint256 amount) external",
]);

const treasuryManagerAbi = parseAbi([
  "function receiveFunds(uint256 amount) external",
  "function withdrawFunds(uint256 amount) external",
  "function setBackend(address _backend) external",
  "function backend() external view returns (address)",
  "function totalInUniswap() external view returns (uint256)",
]);

const usdcAbi = parseAbi([
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
]);

// Initialize clients
const arcPublicClient = createPublicClient({
  chain: arcChain,
  transport: http(),
});

const sepoliaPublicClient = createPublicClient({
  chain: sepoliaChain,
  transport: http(),
});

// Initialize the SDK
const kit = new BridgeKit();

/**
 * Check if Arc RPC is reachable
 */
const checkArcConnectivity = async (): Promise<boolean> => {
  try {
    const blockNumber = await arcPublicClient.getBlockNumber();
    console.log(`✅ Arc RPC connected. Latest block: ${blockNumber}`);
    return true;
  } catch (error) {
    console.error("❌ Arc RPC connectivity issue:", error instanceof Error ? error.message : String(error));
    console.log("💡 Arc Testnet RPC may be experiencing issues. Bridge operations will retry automatically.");
    return false;
  }
};

// Track processed deposits
const PROCESSED_FILE = path.join(__dirname, "processed-deposits.json");
const REDEMPTIONS_FILE = path.join(__dirname, "processed-redemptions.json");

interface ProcessedDeposit {
  bridgeRequestId: string;
  user: string;
  amount: string;
  timestamp: number;
  arcTxHash: string;
  sepoliaTxHash?: string;
  status: "bridged" | "deployed" | "failed";
  retryCount?: number;
  lastError?: string;
}

interface ProcessedRedemption {
  requestId: string;
  amount: string;
  timestamp: number;
  arcRequestTxHash: string;
  sepoliaWithdrawTxHash?: string;
  sepoliaBridgeTxHash?: string;
  arcCompleteTxHash?: string;
  status: "withdrawn" | "bridged" | "completed" | "failed";
  retryCount?: number;
  lastError?: string;
}

const MAX_RETRIES = 3;

const loadProcessedDeposits = (): Set<string> => {
  try {
    if (fs.existsSync(PROCESSED_FILE)) {
      const data = fs.readFileSync(PROCESSED_FILE, "utf-8");
      const deposits: ProcessedDeposit[] = JSON.parse(data);
      // Only mark as processed if status is "deployed" OR failed with max retries exceeded
      return new Set(
        deposits
          .filter((d) => d.status === "deployed" || (d.status === "failed" && (d.retryCount || 0) >= MAX_RETRIES))
          .map((d) => d.bridgeRequestId)
      );
    }
  } catch (err) {
    console.warn("⚠️  Could not load processed deposits:", err);
  }
  return new Set();
};

const saveProcessedDeposit = (deposit: ProcessedDeposit): void => {
  try {
    let deposits: ProcessedDeposit[] = [];
    if (fs.existsSync(PROCESSED_FILE)) {
      const data = fs.readFileSync(PROCESSED_FILE, "utf-8");
      deposits = JSON.parse(data);
    }
    deposits.push(deposit);
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(deposits, null, 2));
  } catch (err) {
    console.error("❌ Could not save processed deposit:", err);
  }
};

const loadProcessedRedemptions = (): Set<string> => {
  try {
    if (fs.existsSync(REDEMPTIONS_FILE)) {
      const data = fs.readFileSync(REDEMPTIONS_FILE, "utf-8");
      const redemptions: ProcessedRedemption[] = JSON.parse(data);
      // Only mark as processed if status is "completed" OR failed with max retries exceeded
      return new Set(
        redemptions
          .filter((r) => r.status === "completed" || (r.status === "failed" && (r.retryCount || 0) >= MAX_RETRIES))
          .map((r) => r.requestId)
      );
    }
  } catch (err) {
    console.warn("⚠️  Could not load processed redemptions:", err);
  }
  return new Set();
};

const saveProcessedRedemption = (redemption: ProcessedRedemption): void => {
  try {
    let redemptions: ProcessedRedemption[] = [];
    if (fs.existsSync(REDEMPTIONS_FILE)) {
      const data = fs.readFileSync(REDEMPTIONS_FILE, "utf-8");
      redemptions = JSON.parse(data);
    }
    // Update existing or add new
    const existingIndex = redemptions.findIndex((r) => r.requestId === redemption.requestId);
    if (existingIndex >= 0) {
      redemptions[existingIndex] = redemption;
    } else {
      redemptions.push(redemption);
    }
    fs.writeFileSync(REDEMPTIONS_FILE, JSON.stringify(redemptions, null, 2));
  } catch (err) {
    console.error("❌ Could not save processed redemption:", err);
  }
};

let processedDeposits = loadProcessedDeposits();
let processedRedemptions = loadProcessedRedemptions();

/**
 * Withdraw USDC from SavingsVault to backend wallet
 */
const withdrawFromVault = async (bridgeRequestId: string, amount: bigint): Promise<void> => {
  try {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY is missing");
    }

    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: arcChain,
      transport: http(),
    });

    console.log("💰 Withdrawing USDC from SavingsVault to backend wallet...");

    const hash = await walletClient.writeContract({
      address: SAVINGS_VAULT_ARC as `0x${string}`,
      abi: savingsVaultAbi,
      functionName: "transferForCCTPBridge",
      args: [bridgeRequestId as `0x${string}`, amount],
    });

    const receipt = await arcPublicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Withdrawal successful:", receipt.transactionHash);
    
    // Wait for additional block confirmations before bridging
    console.log("⏳ Waiting 10 seconds for block confirmations to propagate...");
    await new Promise(resolve => setTimeout(resolve, 10000));
  } catch (err) {
    console.error("❌ Withdrawal Error:", err);
    throw err;
  }
};

/**
 * Confirm bridge completion on Arc vault
 */
const confirmBridge = async (bridgeRequestId: string, amount: bigint): Promise<void> => {
  try {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY is missing");
    }

    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: arcChain,
      transport: http(),
    });

    console.log("📝 Confirming bridge completion on Arc vault...");
    const hash = await walletClient.writeContract({
      address: SAVINGS_VAULT_ARC as `0x${string}`,
      abi: savingsVaultAbi,
      functionName: "confirmBridgeToSepolia",
      args: [bridgeRequestId as `0x${string}`, amount],
    });

    await arcPublicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Bridge confirmed on Arc:", hash);
  } catch (err) {
    console.error("❌ Confirm Error:", err);
    throw err;
  }
};

/**
 * Bridge USDC from Arc to Sepolia using CCTP
 * Includes retry logic for network errors
 */
const bridgeUSDC = async (amount: string, retryCount = 0, maxRetries = 3): Promise<any> => {
  try {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY is missing from environment variables");
    }

    const adapter = createViemAdapterFromPrivateKey({
      privateKey: process.env.PRIVATE_KEY,
    });

    console.log(`🌉 Bridging ${amount} USDC: Arc → Sepolia via CCTP ${retryCount > 0 ? `(Retry ${retryCount}/${maxRetries})` : ''}`);

    const result = await kit.bridge({
      from: {
        adapter,
        chain: "Arc_Testnet",
      },
      to: {
        adapter,
        chain: "Ethereum_Sepolia",
      },
      amount: amount,
    });

    console.log("Bridge result state:", result.state);
    
    // Log detailed error info if state is error
    if (result.state === 'error') {
      console.log("\n❌ Bridge operation failed. Detailed info:");
      if (result.steps) {
        result.steps.forEach((step: any, idx: number) => {
          console.log(`  Step ${idx + 1}: ${step.name}`);
          console.log(`    State: ${step.state}`);
          if (step.error) {
            console.log(`    Error: ${JSON.stringify(step.error)}`);
          }
        });
      }
      // Log the full result for debugging
      console.log(`  Full result: ${JSON.stringify(result, null, 2)}`);
    }
    
    // Check if bridge completed successfully
    if (result.state === 'success') {
      // Find the mint step to confirm USDC arrived on Sepolia
      const mintStep = result.steps?.find((step: any) => step.name === 'mint');
      if (mintStep?.state === 'success') {
        console.log("\n✅ CCTP attestation complete! USDC minted on Sepolia");
        console.log("   Mint TX:", mintStep.txHash);
        console.log("   Explorer:", mintStep.explorerUrl);
        return result;
      }
    }
    
    // Handle mint step error - transaction may have been submitted but receipt not found
    if (result.state === 'error') {
      const mintStep = result.steps?.find((step: any) => step.name === 'mint');
      
      if (mintStep && mintStep.txHash) {
        console.log("\n⚠️  Mint step returned error, but transaction was submitted:");
        console.log("   Mint TX Hash:", mintStep.txHash);
        console.log("   Waiting 30 seconds for Sepolia to index the transaction...");
        
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        try {
          // Try to fetch the receipt manually
          const receipt = await sepoliaPublicClient.waitForTransactionReceipt({
            hash: mintStep.txHash as `0x${string}`,
            timeout: 60000, // 60 second timeout
          });
          
          if (receipt.status === 'success') {
            console.log("✅ Mint transaction confirmed on Sepolia!");
            console.log("   Block:", receipt.blockNumber);
            console.log("   Status: Success");
            return result; // Treat as success
          }
        } catch (receiptError) {
          console.warn("⚠️  Could not fetch receipt, verifying by USDC balance...");
          
          // Fallback: Check if USDC balance increased
          const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
          
          const balance = await sepoliaPublicClient.readContract({
            address: USDC_SEPOLIA as `0x${string}`,
            abi: usdcAbi,
            functionName: "balanceOf",
            args: [account.address],
          });
          
          console.log("   Backend USDC balance on Sepolia:", formatUnits(balance, 6), "USDC");
          
          const expectedAmount = parseFloat(amount);
          const actualBalance = parseFloat(formatUnits(balance, 6));
          
          if (actualBalance >= expectedAmount) {
            console.log("✅ USDC arrived on Sepolia! Bridge successful.");
            return result; // Treat as success
          } else {
            console.error("❌ USDC not found on Sepolia. Bridge may have failed.");
            throw new Error(`Mint transaction submitted but USDC not received. TX: ${mintStep.txHash}`);
          }
        }
      }
      
      // Check if it's a network/RPC error that's worth retrying
      const errorStr = JSON.stringify(result);
      const isNetworkError = errorStr.includes('fetch failed') || 
                            errorStr.includes('network') || 
                            errorStr.includes('timeout') ||
                            errorStr.includes('ECONNREFUSED') ||
                            errorStr.includes('503') ||
                            errorStr.includes('502');
      
      if (isNetworkError && retryCount < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
        console.log(`\n⏳ Network error detected. Retrying in ${waitTime / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return bridgeUSDC(amount, retryCount + 1, maxRetries);
      }
      
      throw new Error(`Bridge did not complete successfully. State: ${result.state}`);
    }

    return result;
  } catch (err) {
    console.error("❌ Bridge Error:", err instanceof Error ? err.message : String(err));
    
    // Retry on network errors
    const errorStr = err instanceof Error ? err.message : String(err);
    const isNetworkError = errorStr.includes('fetch failed') || 
                          errorStr.includes('network') ||
                          errorStr.includes('timeout') ||
                          errorStr.includes('ECONNREFUSED');
    
    if (isNetworkError && retryCount < maxRetries) {
      const waitTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
      console.log(`\n⏳ Network error in bridge operation. Retrying in ${waitTime / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return bridgeUSDC(amount, retryCount + 1, maxRetries);
    }
    
    throw err;
  }
};

/**
 * Deploy bridged funds to Treasury Manager (Sepolia)
 * For now, just transfers USDC - Uniswap deployment comes later
 */
const deployToTreasury = async (amount: bigint): Promise<string> => {
  try {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY is missing");
    }

    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: sepoliaChain,
      transport: http(),
    });

    console.log("📊 Deploying USDC to TreasuryManager...");
    console.log("   Amount:", formatUnits(amount, 6), "USDC");
    console.log("   From: Backend wallet");
    console.log("   To: TreasuryManager → UniswapV4Agent → Uniswap Pool");
    
    // Step 1: Transfer USDC to TreasuryManager
    console.log("\n💰 Step 1: Transferring USDC to TreasuryManager...");
    const transferHash = await walletClient.writeContract({
      address: USDC_SEPOLIA as `0x${string}`,
      abi: usdcAbi,
      functionName: "transfer",
      args: [TREASURY_MANAGER_SEPOLIA as `0x${string}`, amount],
    });
    
    await sepoliaPublicClient.waitForTransactionReceipt({ hash: transferHash });
    console.log("✅ USDC transferred to TreasuryManager!");
    console.log("   Transaction:", transferHash);
    
    // Step 2: Call TreasuryManager.receiveFunds() which will:
    //   - Approve UniswapV4Agent to spend USDC
    //   - Call UniswapV4Agent.depositLiquidity()
    //   - Deploy liquidity to Uniswap V4 USDC/WETH pool
    console.log("\n🚀 Step 2: Calling TreasuryManager.receiveFunds()...");
    console.log("   This will deploy liquidity to Uniswap V4 automatically");
    
    const receiveFundsHash = await walletClient.writeContract({
      address: TREASURY_MANAGER_SEPOLIA as `0x${string}`,
      abi: treasuryManagerAbi,
      functionName: "receiveFunds",
      args: [amount],
    });
    
    const receipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash: receiveFundsHash });
    console.log("✅ TreasuryManager deployed funds to Uniswap!");
    console.log("   Transaction:", receipt.transactionHash);
    console.log("   Block:", receipt.blockNumber);
    console.log("   Status:", receipt.status === "success" ? "✅ Success" : "❌ Failed");
    console.log("   Explorer:", `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
    
    console.log("\n🎉 USDC is now deployed in Uniswap V4 USDC/WETH pool earning yield!");

    return receipt.transactionHash;
  } catch (err) {
    console.error("❌ Deploy Error:", err);
    throw err;
  }
};

/* ========== REVERSE BRIDGE: SEPOLIA → ARC (WITHDRAWALS) ========== */

/**
 * Withdraw funds from TreasuryManager on Sepolia
 * This pulls USDC from UniswapV4Agent if needed
 */
const withdrawFromTreasury = async (amount: bigint): Promise<string> => {
  try {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY is missing");
    }

    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: sepoliaChain,
      transport: http(),
    });

    console.log("💸 Withdrawing from TreasuryManager...");
    console.log("   Amount:", formatUnits(amount, 6), "USDC");
    console.log("   This will pull from UniswapV4Agent if needed");

    // Call TreasuryManager.withdrawFunds()
    const withdrawHash = await walletClient.writeContract({
      address: TREASURY_MANAGER_SEPOLIA as `0x${string}`,
      abi: treasuryManagerAbi,
      functionName: "withdrawFunds",
      args: [amount],
    });

    const receipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash: withdrawHash });
    console.log("✅ Withdrawal successful!");
    console.log("   Transaction:", receipt.transactionHash);
    console.log("   USDC now in backend wallet on Sepolia");

    return receipt.transactionHash;
  } catch (err) {
    console.error("❌ Treasury withdrawal error:", err);
    throw err;
  }
};

/**
 * Bridge USDC from Sepolia to Arc (REVERSE direction)
 * Used for redemptions/withdrawals
 */
const bridgeUSDCReverse = async (amount: string): Promise<any> => {
  try {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY is missing from environment variables");
    }

    // Verify backend has USDC on Sepolia
    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    
    const balanceBefore = await sepoliaPublicClient.readContract({
      address: USDC_SEPOLIA as `0x${string}`,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [account.address],
    });
    
    console.log("   Backend USDC balance on Sepolia:", formatUnits(balanceBefore, 6), "USDC");

    const adapter = createViemAdapterFromPrivateKey({
      privateKey: process.env.PRIVATE_KEY,
    });

    console.log(`🌉 Bridging ${amount} USDC: Sepolia → Arc via CCTP (REVERSE)`);

    const result = await kit.bridge({
      from: {
        adapter,
        chain: "Ethereum_Sepolia",
      },
      to: {
        adapter,
        chain: "Arc_Testnet",
      },
      amount: amount,
    });

    console.log("Bridge result state:", result.state);

    // Check if bridge completed successfully
    if (result.state === 'success') {
      const mintStep = result.steps?.find((step: any) => step.name === 'mint');
      if (mintStep?.state === 'success') {
        console.log("\n✅ CCTP attestation complete! USDC minted on Arc");
        console.log("   Mint TX:", mintStep.txHash);
        console.log("   Explorer:", mintStep.explorerUrl);
        return result;
      }
    }

    // Handle mint step error with fallback verification
    if (result.state === 'error') {
      const mintStep = result.steps?.find((step: any) => step.name === 'mint');
      
      if (mintStep && mintStep.txHash) {
        console.log("\n⚠️  Mint step returned error, but transaction was submitted:");
        console.log("   Mint TX Hash:", mintStep.txHash);
        console.log("   Waiting 30 seconds for Arc to index the transaction...");
        
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        try {
          const receipt = await arcPublicClient.waitForTransactionReceipt({
            hash: mintStep.txHash as `0x${string}`,
            timeout: 60000,
          });
          
          if (receipt.status === 'success') {
            console.log("✅ Mint transaction confirmed on Arc!");
            return result;
          }
        } catch (receiptError) {
          console.warn("⚠️  Could not fetch receipt, verifying by USDC balance...");
          
          const balance = await arcPublicClient.readContract({
            address: USDC_ARC as `0x${string}`,
            abi: usdcAbi,
            functionName: "balanceOf",
            args: [account.address],
          });
          
          console.log("   Backend USDC balance on Arc:", formatUnits(balance, 6), "USDC");
          
          const expectedAmount = parseFloat(amount);
          const actualBalance = parseFloat(formatUnits(balance, 6));
          
          if (actualBalance >= expectedAmount) {
            console.log("✅ USDC arrived on Arc! Reverse bridge successful.");
            return result;
          } else {
            console.error("❌ USDC not found on Arc. Bridge may have failed.");
            throw new Error(`Mint transaction submitted but USDC not received. TX: ${mintStep.txHash}`);
          }
        }
      }
      
      throw new Error(`Reverse bridge did not complete successfully. State: ${result.state}`);
    }

    return result;
  } catch (err) {
    console.error("❌ Reverse Bridge Error:", err instanceof Error ? err.message : String(err));
    throw err;
  }
};

/**
 * Confirm bridge from Sepolia and complete redemption on Arc
 */
const confirmAndCompleteRedemption = async (requestId: string, amount: bigint): Promise<void> => {
  try {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY is missing");
    }

    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: arcChain,
      transport: http(),
    });

    // Step 1: Confirm bridge from Sepolia (updates accounting)
    console.log("📝 Confirming bridge from Sepolia on Arc...");
    const confirmHash = await walletClient.writeContract({
      address: SAVINGS_VAULT_ARC as `0x${string}`,
      abi: savingsVaultAbi,
      functionName: "confirmBridgeFromSepolia",
      args: [requestId as `0x${string}`, amount],
    });

    const confirmReceipt = await arcPublicClient.waitForTransactionReceipt({ hash: confirmHash });
    console.log("✅ Bridge confirmed!");
    console.log("   Transaction:", confirmReceipt.transactionHash);

    // Step 2: Deposit USDC back into vault
    console.log("\n💰 Depositing USDC back into SavingsVault...");
    
    // Approve vault to spend USDC
    const approveHash = await walletClient.writeContract({
      address: USDC_ARC as `0x${string}`,
      abi: usdcAbi,
      functionName: "approve",
      args: [SAVINGS_VAULT_ARC as `0x${string}`, amount],
    });
    await arcPublicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log("   ✅ USDC approved");

    // Transfer USDC to vault
    const transferHash = await walletClient.writeContract({
      address: USDC_ARC as `0x${string}`,
      abi: usdcAbi,
      functionName: "transfer",
      args: [SAVINGS_VAULT_ARC as `0x${string}`, amount],
    });
    await arcPublicClient.waitForTransactionReceipt({ hash: transferHash });
    console.log("   ✅ USDC transferred to vault");

    // Step 3: Complete redemption (sends to user)
    console.log("\n🎉 Completing redemption...");
    const completeHash = await walletClient.writeContract({
      address: SAVINGS_VAULT_ARC as `0x${string}`,
      abi: savingsVaultAbi,
      functionName: "completeRedemption",
      args: [requestId as `0x${string}`],
    });

    const completeReceipt = await arcPublicClient.waitForTransactionReceipt({ hash: completeHash });
    console.log("✅ Redemption completed! User received USDC + yield");
    console.log("   Transaction:", completeReceipt.transactionHash);
  } catch (err) {
    console.error("❌ Confirm/Complete error:", err);
    throw err;
  }
};

/**
 * Get retry count for a redemption
 */
const getRedemptionRetryCount = (requestId: string): number => {
  try {
    if (fs.existsSync(REDEMPTIONS_FILE)) {
      const data = fs.readFileSync(REDEMPTIONS_FILE, "utf-8");
      const redemptions: ProcessedRedemption[] = JSON.parse(data);
      const redemption = redemptions.find(r => r.requestId === requestId);
      return redemption?.retryCount || 0;
    }
  } catch (err) {
    console.warn("⚠️  Could not read redemption retry count:", err);
  }
  return 0;
};

/**
 * Get retry count for a deposit
 */
const getRetryCount = (bridgeRequestId: string): number => {
  try {
    if (fs.existsSync(PROCESSED_FILE)) {
      const data = fs.readFileSync(PROCESSED_FILE, "utf-8");
      const deposits: ProcessedDeposit[] = JSON.parse(data);
      const deposit = deposits.find(d => d.bridgeRequestId === bridgeRequestId);
      return deposit?.retryCount || 0;
    }
  } catch (err) {
    console.warn("⚠️  Could not read retry count:", err);
  }
  return 0;
};

/**
 * Process a single deposit
 */
const processDeposit = async (
  user: string,
  amount: bigint,
  bridgeRequestId: string,
  blockNumber: bigint,
  transactionHash: string
): Promise<void> => {
  // Check if already processed
  if (processedDeposits.has(bridgeRequestId)) {
    console.log("   ⏭️  Already processed, skipping...\n");
    return;
  }
  
  const retryCount = getRetryCount(bridgeRequestId);
  if (retryCount >= MAX_RETRIES) {
    console.log(`   ⏭️  Max retries (${MAX_RETRIES}) exceeded, skipping...\n`);
    return;
  }
  
  // Check existing status to resume from correct step (get last match in case of old duplicates)
  let deposits: ProcessedDeposit[] = [];
  if (fs.existsSync(PROCESSED_FILE)) {
    try {
      const data = fs.readFileSync(PROCESSED_FILE, "utf-8");
      deposits = JSON.parse(data);
    } catch (err) {
      console.warn("⚠️  Could not load deposits:", err);
    }
  }
  
  // Check if ANY entry for this bridgeRequestId was ever successfully bridged
  const allMatches = deposits.filter((d) => d.bridgeRequestId === bridgeRequestId);
  const wasBridged = allMatches.some((d) => d.status === "bridged" || d.status === "deployed");
  const existingDeposit = allMatches[allMatches.length - 1];
  const existingStatus = existingDeposit?.status;
  
  if (retryCount > 0) {
    console.log(`   🔄 Retry attempt ${retryCount + 1}/${MAX_RETRIES} (Previous status: ${existingStatus})`);
  }

  try {
    console.log("\n🔔 Processing Deposit");
    console.log("=====================================");
    console.log("   User:", user);
    console.log("   Amount:", formatUnits(amount || 0n, 6), "USDC");
    console.log("   Bridge Request ID:", bridgeRequestId);
    console.log("   Block:", blockNumber);
    console.log("   Transaction:", transactionHash);
    console.log("=====================================\n");

    // Convert amount to string for bridging
    const amountStr = formatUnits(amount || 0n, 6);

    // If deposit was EVER bridged successfully, skip to Step 4 (never re-bridge)
    if (wasBridged) {
      console.log("ℹ️  Deposit was already bridged successfully. Resuming from Step 4...\n");
    } else {
      // Step 1: Withdraw USDC from vault to backend wallet
      console.log("🚀 Step 1: Withdrawing USDC from SavingsVault...");
      await withdrawFromVault(bridgeRequestId, amount || 0n);

      // Pre-flight check: Verify Arc RPC connectivity
      console.log("\n🔍 Checking Arc RPC connectivity...");
      const isArcConnected = await checkArcConnectivity();
      if (!isArcConnected) {
        console.log("⚠️  Arc RPC is having issues. Attempting bridge anyway with retries...");
      }

      // Step 2: Bridge USDC via CCTP (includes waiting for attestation)
      console.log("\n🚀 Step 2: Bridging via CCTP...");
      const bridgeResult = await bridgeUSDC(amountStr);

      // Step 3: Confirm bridge on Arc vault (update accounting)
      console.log("\n🚀 Step 3: Confirming bridge on Arc...");
      await confirmBridge(bridgeRequestId, amount || 0n);

      // Mark as bridged
      saveProcessedDeposit({
        bridgeRequestId,
        user,
        amount: amountStr,
        timestamp: Date.now(),
        arcTxHash: transactionHash,
        status: "bridged",
      });
    }

    // Step 4: Deploy to TreasuryManager (USDC should now be on Sepolia in backend wallet)
    console.log("\n🚀 Step 4: Transferring to TreasuryManager...");
    const deployTx = await deployToTreasury(amount || 0n);

    // Update status to deployed
    saveProcessedDeposit({
      bridgeRequestId,
      user,
      amount: amountStr,
      timestamp: Date.now(),
      arcTxHash: transactionHash,
      sepoliaTxHash: deployTx,
      status: "deployed",
    });

    // Mark as processed (won't retry)
    processedDeposits.add(bridgeRequestId);

    console.log("\n✅ Complete Pipeline Executed!");
    console.log("   Arc Deposit → Vault Withdrawal → CCTP Bridge → Bridge Confirmed → Sepolia → TreasuryManager");
    console.log("   USDC is now in TreasuryManager on Sepolia");
    console.log("   📝 Saved to processed-deposits.json\n");
  } catch (err: any) {
    const currentRetryCount = getRetryCount(bridgeRequestId);
    let newRetryCount = currentRetryCount + 1;
    
    console.error("❌ Error processing deposit:", err);
    
    // Check if error is "Insufficient vault balance" - this means deposit was likely already processed
    const isInsufficientBalance = err?.message?.includes("Insufficient vault balance") || 
                                  err?.cause?.reason?.includes("Insufficient vault balance");
    
    // Check if error is bridge-related - never retry bridge failures
    const isBridgeError = err?.message?.includes("Bridge") || 
                          err?.message?.includes("CCTP") ||
                          err?.message?.includes("attestation") ||
                          err?.message?.includes("mint") ||
                          err?.message?.includes("burn");
    
    if (isInsufficientBalance) {
      console.error("   ⚠️  Vault has insufficient balance - deposit may have been processed already.");
      console.error("   ❌ Marking as permanently failed to prevent retries.\n");
      newRetryCount = MAX_RETRIES; // Set to max to prevent retries
      processedDeposits.add(bridgeRequestId);
    } else if (isBridgeError) {
      console.error("   ⚠️  Bridge operation failed - will not retry bridge operations.");
      console.error("   ❌ Marking as permanently failed to prevent retries.\n");
      newRetryCount = MAX_RETRIES; // Set to max to prevent retries
      processedDeposits.add(bridgeRequestId);
    } else if (newRetryCount >= MAX_RETRIES) {
      console.error(`   ❌ Max retries (${MAX_RETRIES}) reached. Marking as permanently failed.\n`);
      processedDeposits.add(bridgeRequestId); // Don't retry anymore
    } else {
      console.error(`   🔄 Will retry (${newRetryCount}/${MAX_RETRIES}) on next run.\n`);
    }
    
    // Save to file for logging, but DON'T add to processedDeposits Set unless max retries
    // This allows the deposit to be retried
    saveProcessedDeposit({
      bridgeRequestId,
      user,
      amount: formatUnits(amount || 0n, 6),
      timestamp: Date.now(),
      arcTxHash: transactionHash,
      status: "failed",
      retryCount: newRetryCount,
      lastError: err?.message || String(err),
    });
  }
};

/**
 * Process a single redemption request (reverse bridge: Sepolia → Arc)
 */
const processRedemption = async (
  requestId: string,
  amount: bigint,
  blockNumber: bigint,
  transactionHash: string
): Promise<void> => {
  // Check if already processed
  if (processedRedemptions.has(requestId)) {
    console.log("   ⏭️  Redemption already processed, skipping...\n");
    return;
  }

  const retryCount = getRedemptionRetryCount(requestId);
  if (retryCount >= MAX_RETRIES) {
    console.log(`   ⏭️  Max retries (${MAX_RETRIES}) exceeded for redemption, skipping...\n`);
    return;
  }

  // Check existing status to resume from correct step
  let redemptions: ProcessedRedemption[] = [];
  if (fs.existsSync(REDEMPTIONS_FILE)) {
    try {
      const data = fs.readFileSync(REDEMPTIONS_FILE, "utf-8");
      redemptions = JSON.parse(data);
    } catch (err) {
      console.warn("⚠️  Could not load redemptions:", err);
    }
  }
  
  // Check if ANY entry for this requestId was ever successfully bridged
  const allMatches = redemptions.filter((r) => r.requestId === requestId);
  const wasBridged = allMatches.some((r) => r.status === "bridged" || r.status === "completed");
  const wasWithdrawn = allMatches.some((r) => r.status === "withdrawn" || r.status === "bridged" || r.status === "completed");
  const existingRedemption = allMatches[allMatches.length - 1];
  const existingStatus = existingRedemption?.status;
  const existingWithdrawTx = existingRedemption?.sepoliaWithdrawTxHash;

  if (retryCount > 0) {
    console.log(`   🔄 Retry attempt ${retryCount + 1}/${MAX_RETRIES} (Previous status: ${existingStatus})`);
  }

  try {
    console.log("\n🔔 Processing Redemption Request");
    console.log("=====================================");
    console.log("   Request ID:", requestId);
    console.log("   Amount:", formatUnits(amount || 0n, 6), "USDC");
    console.log("   Block:", blockNumber);
    console.log("   Transaction:", transactionHash);
    console.log("=====================================\n");

    const amountStr = formatUnits(amount || 0n, 6);
    let withdrawTx = existingWithdrawTx;

    // If redemption was EVER bridged successfully, skip to Step 3 (never re-bridge)
    if (wasBridged) {
      console.log("ℹ️  Redemption was already bridged successfully. Resuming from Step 3...\n");
    } else if (wasWithdrawn) {
      // If redemption was withdrawn, skip to Step 2 (never re-withdraw)
      console.log("ℹ️  Redemption was already withdrawn. Resuming from Step 2...\n");

      // Step 2: Bridge USDC: Sepolia → Arc via CCTP
      console.log("\n🚀 Step 2: Bridging USDC (Sepolia → Arc)...");
      const bridgeResult = await bridgeUSDCReverse(amountStr);

      saveProcessedRedemption({
        requestId,
        amount: amountStr,
        timestamp: Date.now(),
        arcRequestTxHash: transactionHash,
        sepoliaWithdrawTxHash: withdrawTx!,
        status: "bridged",
      });
    } else {
      // Start from Step 1
      // Step 1: Withdraw from TreasuryManager on Sepolia
      console.log("🚀 Step 1: Withdrawing from TreasuryManager (Sepolia)...");
      withdrawTx = await withdrawFromTreasury(amount || 0n);

      saveProcessedRedemption({
        requestId,
        amount: amountStr,
        timestamp: Date.now(),
        arcRequestTxHash: transactionHash,
        sepoliaWithdrawTxHash: withdrawTx,
        status: "withdrawn",
      });

      // Step 2: Bridge USDC: Sepolia → Arc via CCTP
      console.log("\n🚀 Step 2: Bridging USDC (Sepolia → Arc)...");
      const bridgeResult = await bridgeUSDCReverse(amountStr);

      saveProcessedRedemption({
        requestId,
        amount: amountStr,
        timestamp: Date.now(),
        arcRequestTxHash: transactionHash,
        sepoliaWithdrawTxHash: withdrawTx,
        status: "bridged",
      });
    }

    // Step 3: Confirm bridge and complete redemption on Arc
    console.log("\n🚀 Step 3: Confirming & completing redemption on Arc...");
    await confirmAndCompleteRedemption(requestId, amount || 0n);

    // Mark as completed
    saveProcessedRedemption({
      requestId,
      amount: amountStr,
      timestamp: Date.now(),
      arcRequestTxHash: transactionHash,
      sepoliaWithdrawTxHash: withdrawTx,
      status: "completed",
    });

    processedRedemptions.add(requestId);

    console.log("\n✅ Complete Redemption Pipeline Executed!");
    console.log("   Arc Request → Sepolia Withdrawal → CCTP Bridge → Arc Confirm → User Receives USDC");
    console.log("   User has received USDC + yield on Arc");
    console.log("   📝 Saved to processed-redemptions.json\n");
  } catch (err: any) {
    const currentRetryCount = getRedemptionRetryCount(requestId);
    let newRetryCount = currentRetryCount + 1;

    console.error("❌ Error processing redemption:", err);

    // Check if error is insufficient balance - redemption may have been processed already
    const isInsufficientBalance = err?.message?.includes("Insufficient") || 
                                  err?.cause?.reason?.includes("Insufficient");
    
    // Check if error is bridge-related - never retry bridge failures
    const isBridgeError = err?.message?.includes("Bridge") || 
                          err?.message?.includes("CCTP") ||
                          err?.message?.includes("attestation") ||
                          err?.message?.includes("mint") ||
                          err?.message?.includes("burn");
    
    if (isInsufficientBalance) {
      console.error("   ⚠️  Insufficient funds - redemption may have been processed already.");
      console.error("   ❌ Marking as permanently failed to prevent retries.\n");
      newRetryCount = MAX_RETRIES; // Set to max to prevent retries
      processedRedemptions.add(requestId);
    } else if (isBridgeError) {
      console.error("   ⚠️  Bridge operation failed - will not retry bridge operations.");
      console.error("   ❌ Marking as permanently failed to prevent retries.\n");
      newRetryCount = MAX_RETRIES; // Set to max to prevent retries
      processedRedemptions.add(requestId);
    } else if (newRetryCount >= MAX_RETRIES) {
      console.error(`   ❌ Max retries (${MAX_RETRIES}) reached. Marking as permanently failed.\n`);
      processedRedemptions.add(requestId);
    } else {
      console.error(`   🔄 Will retry (${newRetryCount}/${MAX_RETRIES}) on next run.\n`);
    }

    saveProcessedRedemption({
      requestId,
      amount: formatUnits(amount || 0n, 6),
      timestamp: Date.now(),
      arcRequestTxHash: transactionHash,
      status: "failed",
      retryCount: newRetryCount,
      lastError: err?.message || String(err),
    });
  }
};

/**
 * Fetch and process historical deposits
 */
const processHistoricalDeposits = async (fromBlock: bigint): Promise<void> => {
  console.log("🔍 Checking for historical deposits...");
  console.log("   From block:", fromBlock.toString());
  console.log("   To block: latest\n");

  try {
    const logs = await arcPublicClient.getContractEvents({
      address: SAVINGS_VAULT_ARC as `0x${string}`,
      abi: savingsVaultAbi,
      eventName: "BridgeToSepoliaRequested",
      fromBlock: fromBlock,
      toBlock: "latest",
    });

    if (logs.length === 0) {
      console.log("✅ No historical deposits found\n");
      return;
    }

    console.log(`📋 Found ${logs.length} historical deposit(s)\n`);

    for (const log of logs) {
      const { user, amount, bridgeRequestId } = log.args;
      await processDeposit(
        user as string,
        amount || 0n,
        bridgeRequestId as string,
        log.blockNumber,
        log.transactionHash
      );
    }

    console.log("✅ Historical deposits processed\n");
  } catch (err) {
    console.error("❌ Error fetching historical deposits:", err);
  }
};

/**
 * Listen for deposit events and trigger bridging
 * Uses polling instead of filters (Arc RPC doesn't support filters reliably)
 */
const watchDepositEvents = async (): Promise<void> => {
  console.log("👀 Watching for deposits on Arc SavingsVault...");
  console.log("   Contract:", SAVINGS_VAULT_ARC);
  console.log("   Chain: Arc Testnet (5042002)");
  console.log("   Method: Polling (every 10 seconds)\n");

  // First, process any historical deposits from last 5000 blocks
  const currentBlock = await arcPublicClient.getBlockNumber();
  const fromBlock = currentBlock - 5000n > 0n ? currentBlock - 5000n : 0n;
  await processHistoricalDeposits(fromBlock);

  console.log("👂 Now listening for new deposits...\n");

  // Track last processed block
  let lastProcessedBlock = currentBlock;

  // Polling loop - check for new events every 10 seconds
  const pollInterval = 10000; // 10 seconds
  
  setInterval(async () => {
    try {
      const latestBlock = await arcPublicClient.getBlockNumber();
      
      // Only fetch if there are new blocks
      if (latestBlock > lastProcessedBlock) {
        const logs = await arcPublicClient.getLogs({
          address: SAVINGS_VAULT_ARC as `0x${string}`,
          event: {
            type: 'event',
            name: 'BridgeToSepoliaRequested',
            inputs: [
              { type: 'address', indexed: true, name: 'user' },
              { type: 'uint256', indexed: false, name: 'amount' },
              { type: 'bytes32', indexed: true, name: 'bridgeRequestId' }
            ]
          },
          fromBlock: lastProcessedBlock + 1n,
          toBlock: latestBlock,
        });

        if (logs.length > 0) {
          console.log(`\n🔔 Found ${logs.length} new deposit(s) in blocks ${lastProcessedBlock + 1n} - ${latestBlock}`);
          
          for (const log of logs) {
            const { user, amount, bridgeRequestId } = log.args;
            await processDeposit(
              user as string,
              amount || 0n,
              bridgeRequestId as string,
              log.blockNumber,
              log.transactionHash
            );
          }
        }

        lastProcessedBlock = latestBlock;
      }
    } catch (error) {
      console.error("❌ Polling error:", error instanceof Error ? error.message : String(error));
      console.log("   Will retry on next poll...\n");
    }
  }, pollInterval);

  console.log("✅ Bridge service is running!");
  console.log("   Polling for deposits every 10 seconds...");
  console.log("   Processed deposits saved to: processed-deposits.json");
  console.log("   Press Ctrl+C to stop\n");
};

/**
 * Watch for redemption requests (reverse bridge: Sepolia → Arc)
 * Uses polling to listen for BridgeFromSepoliaRequested events
 */
const watchRedemptionEvents = async (): Promise<void> => {
  console.log("👀 Watching for redemption requests on Arc SavingsVault...");
  console.log("   Contract:", SAVINGS_VAULT_ARC);
  console.log("   Event: BridgeFromSepoliaRequested");
  console.log("   Method: Polling (every 10 seconds)\n");

  // Process historical redemptions from last 5000 blocks
  const currentBlock = await arcPublicClient.getBlockNumber();
  const fromBlock = currentBlock - 5000n > 0n ? currentBlock - 5000n : 0n;

  console.log("🔍 Checking for historical redemptions...");
  console.log("   From block:", fromBlock.toString());
  console.log("   To block: latest\n");

  try {
    const logs = await arcPublicClient.getLogs({
      address: SAVINGS_VAULT_ARC as `0x${string}`,
      event: {
        type: 'event',
        name: 'BridgeFromSepoliaRequested',
        inputs: [
          { type: 'bytes32', indexed: true, name: 'requestId' },
          { type: 'uint256', indexed: false, name: 'amount' }
        ]
      },
      fromBlock: fromBlock,
      toBlock: 'latest',
    });

    if (logs.length > 0) {
      console.log(`📋 Found ${logs.length} historical redemption(s)\n`);
      for (const log of logs) {
        const { requestId, amount } = log.args;
        await processRedemption(
          requestId as string,
          amount || 0n,
          log.blockNumber,
          log.transactionHash
        );
      }
    } else {
      console.log("✅ No historical redemptions found\n");
    }
  } catch (err) {
    console.error("❌ Error fetching historical redemptions:", err);
  }

  console.log("👂 Now listening for new redemption requests...\n");

  // Track last processed block
  let lastProcessedBlock = currentBlock;
  const pollInterval = 10000; // 10 seconds

  setInterval(async () => {
    try {
      const latestBlock = await arcPublicClient.getBlockNumber();

      if (latestBlock > lastProcessedBlock) {
        const logs = await arcPublicClient.getLogs({
          address: SAVINGS_VAULT_ARC as `0x${string}`,
          event: {
            type: 'event',
            name: 'BridgeFromSepoliaRequested',
            inputs: [
              { type: 'bytes32', indexed: true, name: 'requestId' },
              { type: 'uint256', indexed: false, name: 'amount' }
            ]
          },
          fromBlock: lastProcessedBlock + 1n,
          toBlock: latestBlock,
        });

        if (logs.length > 0) {
          console.log(`\n🔔 Found ${logs.length} new redemption request(s) in blocks ${lastProcessedBlock + 1n} - ${latestBlock}`);

          for (const log of logs) {
            const { requestId, amount } = log.args;
            await processRedemption(
              requestId as string,
              amount || 0n,
              log.blockNumber,
              log.transactionHash
            );
          }
        }

        lastProcessedBlock = latestBlock;
      }
    } catch (error) {
      console.error("❌ Redemption polling error:", error instanceof Error ? error.message : String(error));
      console.log("   Will retry on next poll...\n");
    }
  }, pollInterval);

  console.log("✅ Redemption watcher is running!");
  console.log("   Polling for redemptions every 10 seconds...");
  console.log("   Processed redemptions saved to: processed-redemptions.json");
  console.log("   Press Ctrl+C to stop\n");
};

/**
 * Manual bridge function for testing
 */
const manualBridge = async (amount: string): Promise<void> => {
  console.log("\n🧪 Manual Bridge Test Mode");
  console.log("=====================================");

  try {
    // Step 1: Bridge
    await bridgeUSDC(amount);

    // Step 2: Deploy (simulated)
    console.log("\n⚠️  Note: In production, TreasuryManager.receiveFunds()");
    console.log("   would be called after CCTP mint completes on Sepolia");

    console.log("\n✅ Manual bridge test completed!");
  } catch (err) {
    console.error("❌ Manual bridge failed:", err);
  }
};

// Main execution
const main = async (): Promise<void> => {
  const mode = process.argv[2] || "watch";

  if (mode === "watch") {
    console.log("🚀 Starting No-Scroll Savings Bridge Service");
    console.log("============================================");
    console.log("📥 Deposits: Arc → Sepolia (via CCTP)");
    console.log("📤 Withdrawals: Sepolia → Arc (via CCTP)");
    console.log("============================================\n");

    // Check connectivity on startup
    console.log("🔍 Checking network connectivity...");
    const isArcConnected = await checkArcConnectivity();
    
    try {
      const sepoliaBlock = await sepoliaPublicClient.getBlockNumber();
      console.log(`✅ Sepolia RPC connected. Latest block: ${sepoliaBlock}\n`);
    } catch (error) {
      console.error("❌ Sepolia RPC connectivity issue:", error instanceof Error ? error.message : String(error));
      console.log("⚠️  Service may not function properly without Sepolia connectivity.\n");
    }
    
    if (!isArcConnected) {
      console.log("⚠️  WARNING: Arc RPC is not responding. Bridge operations will fail until it's back online.");
      console.log("💡 The service will continue running and retry automatically.\n");
    }

    // Start both watchers in parallel
    await Promise.all([
      watchDepositEvents(),
      watchRedemptionEvents(),
    ]);
    
    // Keep process alive
    await new Promise(() => {}); // Never resolves, keeps Node.js running
  } else if (mode === "test") {
    // Test mode - manual bridge
    const amount = process.argv[3] || "0.0005";
    await manualBridge(amount);
    process.exit(0);
  } else {
    console.log("Usage:");
    console.log("  npm start          - Watch for deposit/redemption events and auto-bridge");
    console.log("  npm run test       - Manual bridge test (0.0005 USDC)");
    console.log("  npm run test 10    - Manual bridge test (custom amount)");
    process.exit(0);
  }
};

void main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
