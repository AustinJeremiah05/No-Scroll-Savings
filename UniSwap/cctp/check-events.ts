import "dotenv/config";
import { createPublicClient, http, parseAbi, formatUnits } from "viem";

const SAVINGS_VAULT_ARC = "0xF4df10e373E509EC3d96237df91bE9B0006E918D";

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

const savingsVaultAbi = parseAbi([
  "event BridgeToSepoliaRequested(address indexed user, uint256 amount, bytes32 indexed bridgeRequestId)",
  "event DepositWithChallenge(address indexed caller, address indexed owner, uint256 assets, uint256 shares, string challengeType, uint256 lockDuration, uint256 sourceChainId)",
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
]);

const arcPublicClient = createPublicClient({
  chain: arcChain,
  transport: http(),
});

async function checkEventsInChunks() {
  console.log("🔍 Scanning for all events from SavingsVault...\n");

  const currentBlock = await arcPublicClient.getBlockNumber();
  console.log(`Current block: ${currentBlock}\n`);

  // Search in chunks of 9999 blocks (Arc RPC limit is 10,000)
  const CHUNK_SIZE = 9999;
  const TOTAL_BLOCKS_TO_SCAN = 50000;
  const startBlock = currentBlock - BigInt(TOTAL_BLOCKS_TO_SCAN) > 0n 
    ? currentBlock - BigInt(TOTAL_BLOCKS_TO_SCAN) 
    : 0n;

  console.log(`Scanning from block ${startBlock} to ${currentBlock}`);
  console.log(`In chunks of ${CHUNK_SIZE} blocks\n`);

  let allBridgeEvents: any[] = [];
  let allDepositEvents: any[] = [];

  for (let from = startBlock; from <= currentBlock; from += BigInt(CHUNK_SIZE)) {
    const to = from + BigInt(CHUNK_SIZE - 1) > currentBlock 
      ? currentBlock 
      : from + BigInt(CHUNK_SIZE - 1);

    process.stdout.write(`Checking blocks ${from} to ${to}...`);

    try {
      // Check for BridgeToSepoliaRequested events
      const bridgeLogs = await arcPublicClient.getContractEvents({
        address: SAVINGS_VAULT_ARC as `0x${string}`,
        abi: savingsVaultAbi,
        eventName: "BridgeToSepoliaRequested",
        fromBlock: from,
        toBlock: to,
      });

      // Check for Deposit events
      const depositLogs = await arcPublicClient.getContractEvents({
        address: SAVINGS_VAULT_ARC as `0x${string}`,
        abi: savingsVaultAbi,
        eventName: "Deposit",
        fromBlock: from,
        toBlock: to,
      });

      if (bridgeLogs.length > 0 || depositLogs.length > 0) {
        console.log(` ✅ Found ${bridgeLogs.length} bridge + ${depositLogs.length} deposit events`);
        allBridgeEvents = allBridgeEvents.concat(bridgeLogs);
        allDepositEvents = allDepositEvents.concat(depositLogs);
      } else {
        console.log(` No events`);
      }
    } catch (err: any) {
      console.log(` ❌ Error: ${err.message}`);
    }
  }

  console.log(`\n📊 RESULTS:\n`);
  console.log(`Total BridgeToSepoliaRequested events: ${allBridgeEvents.length}`);
  console.log(`Total Deposit events: ${allDepositEvents.length}\n`);

  if (allBridgeEvents.length > 0) {
    console.log("🌉 BridgeToSepoliaRequested Events:");
    for (const log of allBridgeEvents) {
      const { user, amount, bridgeRequestId } = log.args;
      console.log(`\n  Block: ${log.blockNumber}`);
      console.log(`  User: ${user}`);
      console.log(`  Amount: ${formatUnits(amount || 0n, 6)} USDC`);
      console.log(`  Bridge ID: ${bridgeRequestId}`);
      console.log(`  TX: ${log.transactionHash}`);
    }
  } else {
    console.log("\n❌ No BridgeToSepoliaRequested events found!");
    console.log("This means deposits were NOT made through the function that emits this event.");
  }

  if (allDepositEvents.length > 0) {
    console.log("\n\n📥 Deposit Events:");
    for (const log of allDepositEvents) {
      const { sender, owner, assets, shares } = log.args;
      console.log(`\n  Block: ${log.blockNumber}`);
      console.log(`  Owner: ${owner}`);
      console.log(`  Assets: ${formatUnits(assets || 0n, 6)} USDC`);
      console.log(`  Shares: ${formatUnits(shares || 0n, 6)}`);
      console.log(`  TX: ${log.transactionHash}`);
    }
  }

  console.log("\n✅ Event scan complete!");
}

checkEventsInChunks()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
