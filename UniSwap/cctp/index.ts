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
const SAVINGS_VAULT_ARC = "0xe85486A9253913d54f0D6EDB3b91f82a6829b892";
const TREASURY_MANAGER_SEPOLIA = "0x8C5963806f445BC5A7011A4072ed958767E90DB9";
const UNISWAP_V4_AGENT_SEPOLIA = "0x64Ba37d28dc1dfAf2E07670501abE4c4C7dC397a"; // Update after deployment

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
  "event DepositWithChallenge(address indexed caller, address indexed owner, uint256 assets, uint256 shares, string challengeType, uint256 lockDuration, uint256 sourceChainId)",
  "function confirmBridgeToSepolia(bytes32 bridgeRequestId, uint256 amount) external",
  "function transferForCCTPBridge(bytes32 bridgeRequestId, uint256 amount) external",
]);

const treasuryManagerAbi = parseAbi([
  "function receiveFunds(uint256 amount) external",
  "function setBackend(address _backend) external",
  "function backend() external view returns (address)",
]);

const usdcAbi = parseAbi([
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
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

// Track processed deposits
const PROCESSED_FILE = path.join(__dirname, "processed-deposits.json");

interface ProcessedDeposit {
  bridgeRequestId: string;
  user: string;
  amount: string;
  timestamp: number;
  arcTxHash: string;
  sepoliaTxHash?: string;
  status: "bridged" | "deployed" | "failed";
}

const loadProcessedDeposits = (): Set<string> => {
  try {
    if (fs.existsSync(PROCESSED_FILE)) {
      const data = fs.readFileSync(PROCESSED_FILE, "utf-8");
      const deposits: ProcessedDeposit[] = JSON.parse(data);
      return new Set(deposits.map((d) => d.bridgeRequestId));
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

let processedDeposits = loadProcessedDeposits();

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
 */
const bridgeUSDC = async (amount: string): Promise<any> => {
  try {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY is missing from environment variables");
    }

    const adapter = createViemAdapterFromPrivateKey({
      privateKey: process.env.PRIVATE_KEY,
    });

    console.log(`🌉 Bridging ${amount} USDC: Arc → Sepolia via CCTP`);

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

    console.log("✅ CCTP Bridge initiated successfully");
    console.log("   Bridge TX:", result);
    
    // Wait for attestation and minting on Sepolia
    console.log("\n⏳ Waiting for CCTP attestation and minting on Sepolia...");
    console.log("   This usually takes 10-20 minutes...");
    
    // Poll for attestation (in production, use Circle's attestation API)
    // For now, wait a reasonable time
    const ATTESTATION_WAIT = 15 * 60 * 1000; // 15 minutes
    console.log(`   Waiting ${ATTESTATION_WAIT / 60000} minutes...`);
    await new Promise((resolve) => setTimeout(resolve, ATTESTATION_WAIT));
    
    console.log("✅ CCTP bridge should be complete, proceeding with deployment...");

    return result;
  } catch (err) {
    console.error("❌ Bridge Error:", inspect(err, false, null, true));
    throw err;
  }
};

/**
 * Deploy bridged funds to Uniswap v4 via TreasuryManager
 */
const deployToUniswap = async (amount: bigint): Promise<string> => {
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

    const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Sepolia USDC

    console.log("📊 Deploying funds to Uniswap v4 via TreasuryManager...");
    
    // Step 1: Transfer USDC from backend to TreasuryManager
    console.log("💸 Transferring USDC to TreasuryManager...");
    const transferHash = await walletClient.writeContract({
      address: USDC_SEPOLIA as `0x${string}`,
      abi: usdcAbi,
      functionName: "transfer",
      args: [TREASURY_MANAGER_SEPOLIA as `0x${string}`, amount],
    });
    
    await sepoliaPublicClient.waitForTransactionReceipt({ hash: transferHash });
    console.log("✅ USDC transferred:", transferHash);

    // Step 2: Call receiveFunds on TreasuryManager (will deploy 100% to Uniswap, ignoring Aave)
    console.log("📞 Calling receiveFunds on TreasuryManager...");
    const hash = await walletClient.writeContract({
      address: TREASURY_MANAGER_SEPOLIA as `0x${string}`,
      abi: treasuryManagerAbi,
      functionName: "receiveFunds",
      args: [amount],
    });

    console.log("📝 Transaction sent:", hash);

    // Wait for confirmation
    const receipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash });

    console.log("✅ Funds deployed to Uniswap v4!");
    console.log("   Transaction:", receipt.transactionHash);
    console.log("   Block:", receipt.blockNumber);
    console.log("   Status:", receipt.status === "success" ? "✅ Success" : "❌ Failed");

    return receipt.transactionHash;
  } catch (err) {
    console.error("❌ Deploy Error:", err);
    throw err;
  }
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

    // Step 1: Withdraw USDC from vault to backend wallet
    console.log("🚀 Step 1: Withdrawing USDC from SavingsVault...");
    await withdrawFromVault(bridgeRequestId, amount || 0n);

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

    // Step 4: Deploy to Uniswap (USDC should now be on Sepolia in backend wallet)
    console.log("\n🚀 Step 4: Deploying to Uniswap v4...");
    const deployTx = await deployToUniswap(amount || 0n);

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

    console.log("\n✅ Complete Pipeline Executed!");
    console.log("   Arc Deposit → Vault Withdrawal → CCTP Bridge → Bridge Confirmed → Sepolia → Uniswap v4");
    console.log("   User can now earn yield on their deposit");
    console.log("   📝 Saved to processed-deposits.json\n");
  } catch (err) {
    console.error("❌ Error processing deposit:", err);
    saveProcessedDeposit({
      bridgeRequestId,
      user,
      amount: formatUnits(amount || 0n, 6),
      timestamp: Date.now(),
      arcTxHash: transactionHash,
      status: "failed",
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
 */
const watchDepositEvents = async (): Promise<void> => {
  console.log("👀 Watching for deposits on Arc SavingsVault...");
  console.log("   Contract:", SAVINGS_VAULT_ARC);
  console.log("   Chain: Arc Testnet (5042002)\n");

  // First, process any historical deposits from last 5000 blocks
  const currentBlock = await arcPublicClient.getBlockNumber();
  const fromBlock = currentBlock - 5000n > 0n ? currentBlock - 5000n : 0n;
  await processHistoricalDeposits(fromBlock);

  console.log("👂 Now listening for new deposits...\n");

  // Watch for BridgeToSepoliaRequested events
  arcPublicClient.watchContractEvent({
    address: SAVINGS_VAULT_ARC as `0x${string}`,
    abi: savingsVaultAbi,
    eventName: "BridgeToSepoliaRequested",
    onLogs: async (logs) => {
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
    },
    onError: (error) => {
      console.error("❌ Event listener error:", error);
    },
  });

  console.log("✅ Bridge service is running!");
  console.log("   Listening for deposits...");
  console.log("   Processed deposits saved to: processed-deposits.json");
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
    // Watch mode - listen for events
    await watchDepositEvents();
  } else if (mode === "test") {
    // Test mode - manual bridge
    const amount = process.argv[3] || "0.0005";
    await manualBridge(amount);
  } else {
    console.log("Usage:");
    console.log("  npm start          - Watch for deposit events and auto-bridge");
    console.log("  npm run test       - Manual bridge test (0.0005 USDC)");
    console.log("  npm run test 10    - Manual bridge test (custom amount)");
  }
};

void main();
