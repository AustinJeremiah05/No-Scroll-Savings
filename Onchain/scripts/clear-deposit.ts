import { ethers } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();
  const SAVINGS_VAULT = "0xF4df10e373E509EC3d96237df91bE9B0006E918D"; // Latest vault address
  const USER_TO_RESET = "0xe01Add0c3640a8314132bAF491d101A38ffEF4f0"; // Backend wallet address

  console.log("=== Clearing Active Deposit ===");
  console.log("Owner address:", owner.address);
  console.log("Resetting deposit for:", USER_TO_RESET);

  const savingsVault = await ethers.getContractAt("SavingsVault", SAVINGS_VAULT);

  // Check deposit metadata first
  const metadata = await savingsVault.depositMetadata(USER_TO_RESET);
  console.log("\nCurrent deposit status:");
  console.log("  hasActiveDeposit:", metadata.hasActiveDeposit);
  console.log("  challengeType:", metadata.challengeType);
  console.log("  unlockTime:", new Date(Number(metadata.unlockTime) * 1000).toLocaleString());

  if (!metadata.hasActiveDeposit) {
    console.log("\n✅ No active deposit. User can make a new deposit now.");
    return;
  }

  // Get user's share balance
  const shares = await savingsVault.balanceOf(USER_TO_RESET);
  console.log("\nCurrent shares:", ethers.formatUnits(shares, 6));

  if (shares === 0n) {
    console.log("\n⚠️  User has an active deposit flag but 0 shares.");
    console.log("🔧 Using resetDepositMetadata() to fix this...");
    
    try {
      const tx = await savingsVault.resetDepositMetadata(USER_TO_RESET, { gasLimit: 200000 });
      console.log("\n📝 Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed in block:", receipt?.blockNumber);

      // Verify the flag was cleared
      const newMetadata = await savingsVault.depositMetadata(USER_TO_RESET);
      console.log("\n📊 Updated deposit status:");
      console.log("  hasActiveDeposit:", newMetadata.hasActiveDeposit);

      if (!newMetadata.hasActiveDeposit) {
        console.log("\n✅ Active deposit cleared! User can now make a new deposit.");
      } else {
        console.log("\n⚠️  Flag still set. Something went wrong.");
      }
    } catch (error: any) {
      console.error("\n❌ Error resetting deposit metadata:");
      console.error(error.message);
    }
    return;
  }

  console.log("\nUser has shares. Requesting redemption to clear active deposit...");
  
  try {
    const tx = await savingsVault.requestRedeem(
      shares,
      USER_TO_RESET,
      USER_TO_RESET,
      5042002, // Arc chain ID
      { gasLimit: 500000 }
    );
    
    const receipt = await tx.wait();
    console.log("✅ Redemption requested successfully!");
    console.log("Transaction:", receipt?.hash);

    // Verify the flag was cleared
    const newMetadata = await savingsVault.depositMetadata(USER_TO_RESET);
    console.log("\n📊 Updated deposit status:");
    console.log("  hasActiveDeposit:", newMetadata.hasActiveDeposit);

    if (!newMetadata.hasActiveDeposit) {
      console.log("\n✅ Active deposit cleared! User can now make a new deposit.");
    } else {
      console.log("\n⚠️  Flag still set. Something went wrong.");
    }
  } catch (error: any) {
    console.error("\n❌ Error requesting redemption:");
    console.error(error.message);
    
    if (error.message.includes("Chain not supported")) {
      console.log("\n💡 The chain ID might not be supported. Trying with 5042002...");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
