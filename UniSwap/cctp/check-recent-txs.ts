import "dotenv/config";
import { createPublicClient, http, parseAbi, formatUnits } from "viem";

const SAVINGS_VAULT_ARC = "0xF4df10e373E509EC3d96237df91bE9B0006E918D";

const arcChain = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
};

const savingsVaultAbi = parseAbi([
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
  "event RedeemRequested(address indexed sender, address indexed owner, uint256 shares, uint256 assets, uint256 destinationChainId)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

const arcPublicClient = createPublicClient({
  chain: arcChain,
  transport: http(),
});

async function checkRecentTransactions() {
  console.log("🔍 Checking recent SavingsVault transactions...\n");

  const currentBlock = await arcPublicClient.getBlockNumber();
  const fromBlock = currentBlock - 1000n;

  console.log(`Scanning blocks ${fromBlock} to ${currentBlock}\n`);

  // Check Deposit events
  const depositLogs = await arcPublicClient.getContractEvents({
    address: SAVINGS_VAULT_ARC as `0x${string}`,
    abi: savingsVaultAbi,
    eventName: "Deposit",
    fromBlock: fromBlock,
    toBlock: currentBlock,
  });

  console.log(`📥 Deposit Events: ${depositLogs.length}`);
  for (const log of depositLogs) {
    const { sender, owner, assets, shares } = log.args;
    console.log(`\n  Block: ${log.blockNumber}`);
    console.log(`  Owner: ${owner}`);
    console.log(`  Assets: ${formatUnits(assets || 0n, 6)} USDC`);
    console.log(`  Shares: ${formatUnits(shares || 0n, 6)}`);
    console.log(`  TX: ${log.transactionHash}`);
  }

  // Check RedeemRequested events
  const redeemLogs = await arcPublicClient.getContractEvents({
    address: SAVINGS_VAULT_ARC as `0x${string}`,
    abi: savingsVaultAbi,
    eventName: "RedeemRequested",
    fromBlock: fromBlock,
    toBlock: currentBlock,
  });

  console.log(`\n📤 RedeemRequested Events: ${redeemLogs.length}`);
  for (const log of redeemLogs) {
    const { sender, owner, shares, assets, destinationChainId } = log.args;
    console.log(`\n  Block: ${log.blockNumber}`);
    console.log(`  Owner: ${owner}`);
    console.log(`  Assets: ${formatUnits(assets || 0n, 6)} USDC`);
    console.log(`  Shares: ${formatUnits(shares || 0n, 6)}`);
    console.log(`  TX: ${log.transactionHash}`);
  }

  // Check Transfer events (share transfers)
  const transferLogs = await arcPublicClient.getContractEvents({
    address: SAVINGS_VAULT_ARC as `0x${string}`,
    abi: savingsVaultAbi,
    eventName: "Transfer",
    fromBlock: fromBlock,
    toBlock: currentBlock,
  });

  console.log(`\n🔄 Transfer Events: ${transferLogs.length}`);
  let recentTransfers = transferLogs.slice(-10);
  for (const log of recentTransfers) {
    const { from, to, value } = log.args;
    console.log(`\n  Block: ${log.blockNumber}`);
    console.log(`  From: ${from}`);
    console.log(`  To: ${to}`);
    console.log(`  Shares: ${formatUnits(value || 0n, 6)}`);
    console.log(`  TX: ${log.transactionHash}`);
  }
}

checkRecentTransactions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
