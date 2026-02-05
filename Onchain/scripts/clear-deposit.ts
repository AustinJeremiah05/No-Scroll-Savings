import { ethers } from "hardhat";

async function main() {
  const [user] = await ethers.getSigners();
  const SAVINGS_VAULT = "0xCB3E804A79BB7060A459b2f2D4E118cCA93a61eD"; // Updated vault address

  console.log("=== Clearing Active Deposit ===");
  console.log("User address:", user.address);

  const savingsVault = await ethers.getContractAt("SavingsVault", SAVINGS_VAULT);

  // Check deposit metadata first
  const metadata = await savingsVault.depositMetadata(user.address);
  console.log("\nCurrent deposit status:");
  console.log("  hasActiveDeposit:", metadata.hasActiveDeposit);
  console.log("  challengeType:", metadata.challengeType);
  console.log("  unlockTime:", new Date(Number(metadata.unlockTime) * 1000).toLocaleString());

  if (!metadata.hasActiveDeposit) {
    console.log("\n✅ No active deposit. You can make a new deposit now.");
    return;
  }

  // Get user's share balance
  const shares = await savingsVault.balanceOf(user.address);
  console.log("\nCurrent shares:", ethers.formatUnits(shares, 6));

  if (shares === 0n) {
    console.log("\n⚠️  You have an active deposit flag but 0 shares.");
    console.log("This shouldn't happen. The contract may need admin intervention.");
    return;
  }

  console.log("\nRequesting redemption to clear active deposit...");
  
  try {
    const tx = await savingsVault.requestRedeem(
      shares,
      user.address,
      user.address,
      5042002, // Arc chain ID
      { gasLimit: 500000 }
    );
    
    const receipt = await tx.wait();
    console.log("✅ Redemption requested successfully!");
    console.log("Transaction:", receipt?.hash);

    // Verify the flag was cleared
    const newMetadata = await savingsVault.depositMetadata(user.address);
    console.log("\n📊 Updated deposit status:");
    console.log("  hasActiveDeposit:", newMetadata.hasActiveDeposit);

    if (!newMetadata.hasActiveDeposit) {
      console.log("\n✅ Active deposit cleared! You can now make a new deposit.");
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
