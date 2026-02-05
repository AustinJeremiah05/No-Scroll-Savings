import { ethers } from "hardhat";

const SAVINGS_VAULT = "0xCB3E804A79BB7060A459b2f2D4E118cCA93a61eD";
const USDC_ARC = "0x3600000000000000000000000000000000000000";
const AMOUNT = ethers.parseUnits("7", 6); // 7 USDC

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("🧪 Making test deposit...");
  console.log("   Depositor:", signer.address);
  console.log("   Amount: 7 USDC\n");

  const usdc = await ethers.getContractAt("IERC20", USDC_ARC);
  const vault = await ethers.getContractAt("SavingsVault", SAVINGS_VAULT);

  // Check balance
  const balance = await usdc.balanceOf(signer.address);
  console.log("💰 Your USDC balance:", ethers.formatUnits(balance, 6), "USDC");

  if (balance < AMOUNT) {
    console.log("❌ Insufficient USDC balance!");
    return;
  }

  // Check if has active deposit
  const depositMeta = await vault.depositMetadata(signer.address);
  if (depositMeta.hasActiveDeposit) {
    console.log("⚠️  You already have an active deposit!");
    console.log("   Request redemption first using clear-deposit.ts");
    return;
  }

  // Approve USDC
  console.log("🔓 Approving USDC...");
  const approveTx = await usdc.approve(SAVINGS_VAULT, AMOUNT);
  await approveTx.wait();
  console.log("✅ Approved\n");

  // Deposit
  console.log("💸 Depositing 5 USDC with 2-minute challenge...");
  const depositTx = await vault.deposit(
    AMOUNT,
    signer.address,
    120, // 2 minutes = 120 seconds
    "two_minute_demo",
    5042002 // Arc chain
  );
  const receipt = await depositTx.wait();
  console.log("✅ Deposit successful!");
  console.log("   Transaction:", receipt.hash);
  console.log("   Block:", receipt.blockNumber);

  // Find BridgeToSepoliaRequested event
  const bridgeEvent = receipt.logs.find((log: any) => {
    try {
      const parsed = vault.interface.parseLog(log);
      return parsed?.name === "BridgeToSepoliaRequested";
    } catch {
      return false;
    }
  });

  if (bridgeEvent) {
    const parsed = vault.interface.parseLog(bridgeEvent);
    console.log("\n🌉 Bridge Request Created:");
    console.log("   Bridge Request ID:", parsed?.args.bridgeRequestId);
    console.log("   Amount:", ethers.formatUnits(parsed?.args.amount, 6), "USDC");
  }

  console.log("\n✅ Now the bridge service will automatically:");
  console.log("   1. Withdraw USDC from vault to backend");
  console.log("   2. Bridge via CCTP to Sepolia");
  console.log("   3. Deploy to Uniswap v4 via TreasuryManager");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
