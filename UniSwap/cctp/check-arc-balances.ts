import { createPublicClient, http, formatUnits, parseUnits } from "viem";
import { arbitrumSepolia } from "viem/chains";
import * as dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";

dotenv.config();

const arcChain = {
  ...arbitrumSepolia,
  id: 23011913,
  name: "ARC Testnet",
  rpcUrls: {
    default: { http: ["https://rpc.arcpay.io/"] },
    public: { http: ["https://rpc.arcpay.io/"] },
  },
};

const USDC_ARC = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
const SAVINGS_VAULT_ARC = "0xF4df10e373E509EC3d96237df91bE9B0006E918D";

const usdcAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

async function main() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is required");
  }

  console.log("\n🔍 Diagnostic: Checking Arc Balances");
  console.log("=====================================\n");

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  console.log("Backend Wallet:", account.address);

  const arcPublicClient = createPublicClient({
    chain: arcChain,
    transport: http(),
  });

  // Check backend wallet USDC balance on Arc
  console.log("\n📊 Backend Wallet on Arc:");
  const backendBalance = await arcPublicClient.readContract({
    address: USDC_ARC as `0x${string}`,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: [account.address],
  });
  console.log(`   USDC Balance: ${formatUnits(backendBalance, 6)} USDC`);

  // Check vault USDC balance
  console.log("\n📊 Savings Vault on Arc:");
  const vaultBalance = await arcPublicClient.readContract({
    address: USDC_ARC as `0x${string}`,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: [SAVINGS_VAULT_ARC as `0x${string}`],
  });
  console.log(`   USDC Balance: ${formatUnits(vaultBalance, 6)} USDC`);

  // Analysis
  console.log("\n📋 Analysis:");
  if (backendBalance === 0n) {
    console.log("   ❌ Backend wallet has no USDC on Arc!");
    console.log("   💡 This is the issue: After withdrawing from vault, there's no USDC to bridge.");
    console.log("   💡 The withdrawal transaction succeeded but USDC didn't arrive in backend wallet.");
  } else {
    console.log(`   ✅ Backend wallet has sufficient USDC: ${formatUnits(backendBalance, 6)} USDC`);
  }

  if (vaultBalance === 0n) {
    console.log("   ⚠️  Vault has no USDC left");
  } else {
    console.log(`   ✅ Vault has USDC: ${formatUnits(vaultBalance, 6)} USDC`);
  }

  // Check a recent transaction
  console.log("\n📜 Recent Block Number:");
  const blockNumber = await arcPublicClient.getBlockNumber();
  console.log(`   ${blockNumber}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
