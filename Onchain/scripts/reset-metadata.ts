import { ethers } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();
  const SAVINGS_VAULT = "0xCB3E804A79BB7060A459b2f2D4E118cCA93a61eD";
  const USER_ADDRESS = "0xe01Add0c3640a8314132bAF491d101A38ffEF4f0";

  console.log("=== Resetting Stale Deposit Metadata ===");
  console.log("Owner address:", owner.address);
  console.log("User address:", USER_ADDRESS);

  const savingsVault = await ethers.getContractAt("SavingsVault", SAVINGS_VAULT);

  // Check current status
  const metadata = await savingsVault.depositMetadata(USER_ADDRESS);
  const shares = await savingsVault.balanceOf(USER_ADDRESS);
  
  console.log("\nBefore reset:");
  console.log("  hasActiveDeposit:", metadata.hasActiveDeposit);
  console.log("  shares:", shares.toString());
  console.log("  challengeType:", metadata.challengeType);

  if (!metadata.hasActiveDeposit) {
    console.log("\n✅ No active deposit flag set. Nothing to reset.");
    return;
  }

  if (shares > 0n) {
    console.log("\n⚠️  User still has shares. Use requestRedeem instead.");
    return;
  }

  console.log("\n🔧 Resetting deposit metadata...");
  
  const tx = await savingsVault.resetDepositMetadata(USER_ADDRESS, {
    gasLimit: 200000
  });
  
  const receipt = await tx.wait();
  console.log("✅ Metadata reset successfully!");
  console.log("Transaction:", receipt?.hash);

  // Verify reset
  const newMetadata = await savingsVault.depositMetadata(USER_ADDRESS);
  console.log("\nAfter reset:");
  console.log("  hasActiveDeposit:", newMetadata.hasActiveDeposit);
  
  const hubMetrics = await savingsVault.getHubMetrics();
  console.log("  activeDeposits:", hubMetrics.activeDeposits.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
