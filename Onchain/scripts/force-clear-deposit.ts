import { ethers } from "hardhat";

const SAVINGS_VAULT = "0xF229C0f9277B4c5346422Ca1eD94Eee532709d3b";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("🔧 Force clearing active deposit flag...");
  console.log("   User:", signer.address, "\n");

  const vault = await ethers.getContractAt("SavingsVault", SAVINGS_VAULT);

  // Check current status
  const depositMeta = await vault.depositMetadata(signer.address);
  console.log("Current status:");
  console.log("   hasActiveDeposit:", depositMeta.hasActiveDeposit);
  console.log("   Shares:", ethers.formatUnits(await vault.balanceOf(signer.address), 6));

  if (!depositMeta.hasActiveDeposit) {
    console.log("\n✅ No active deposit to clear!");
    return;
  }

  // Request redemption with all shares
  const shares = await vault.balanceOf(signer.address);
  
  if (shares === 0n) {
    console.log("\n⚠️  You have 0 shares but hasActiveDeposit is true");
    console.log("This is a state inconsistency. Trying to deposit 0.000001 USDC to reset...");
    return;
  }

  console.log("\n📝 Requesting redemption...");
  const tx = await vault.requestRedeem(
    shares,
    signer.address,
    signer.address,
    5042002, // Arc chain
    { gasLimit: 500000 }
  );
  
  const receipt = await tx.wait();
  console.log("✅ Redemption requested:", receipt.hash);
  
  // Check new status
  const newMeta = await vault.depositMetadata(signer.address);
  console.log("\n📊 New status:");
  console.log("   hasActiveDeposit:", newMeta.hasActiveDeposit);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
