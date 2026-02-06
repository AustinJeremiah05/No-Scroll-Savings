import { ethers } from "hardhat";

async function main() {
  const SAVINGS_VAULT = "0xF4df10e373E509EC3d96237df91bE9B0006E918D";
  const USER_ADDRESS = "0xe01Add0c3640a8314132bAF491d101A38ffEF4f0";

  console.log("🔍 Checking deposit status for:", USER_ADDRESS);
  console.log("Vault:", SAVINGS_VAULT, "\n");

  const savingsVault = await ethers.getContractAt("SavingsVault", SAVINGS_VAULT);

  // Check shares balance
  const shares = await savingsVault.balanceOf(USER_ADDRESS);
  console.log("Shares balance:", ethers.formatUnits(shares, 6));

  // Check deposit metadata
  const metadata = await savingsVault.depositMetadata(USER_ADDRESS);
  console.log("\nDeposit Metadata:");
  console.log("  hasActiveDeposit:", metadata.hasActiveDeposit);
  console.log("  challengeType:", metadata.challengeType);
  console.log("  depositTime:", metadata.depositTime.toString(), "→", new Date(Number(metadata.depositTime) * 1000).toLocaleString());
  console.log("  unlockTime:", metadata.unlockTime.toString(), "→", new Date(Number(metadata.unlockTime) * 1000).toLocaleString());
  console.log("  sourceChainId:", metadata.sourceChainId.toString());

  // Check getUserDeposit function (what frontend calls)
  try {
    const deposit = await savingsVault.getUserDeposit(USER_ADDRESS);
    console.log("\ngetUserDeposit() result (what frontend sees):");
    console.log("  shares:", ethers.formatUnits(deposit[0], 6));
    console.log("  assets:", ethers.formatUnits(deposit[1], 6), "USDC");
    console.log("  depositTime:", deposit[2].toString(), "→", new Date(Number(deposit[2]) * 1000).toLocaleString());
    console.log("  unlockTime:", deposit[3].toString(), "→", new Date(Number(deposit[3]) * 1000).toLocaleString());
    console.log("  challengeType:", deposit[4]);
    console.log("  active:", deposit[5]);

    const isUnlocked = Date.now() > Number(deposit[3]) * 1000;
    console.log("\n📊 Status:");
    console.log("  Locked:", !isUnlocked);
    console.log("  Unlocked:", isUnlocked);
    
    if (deposit[5] && Number(deposit[0]) > 0) {
      console.log("\n✅ Frontend should display this deposit");
    } else if (!deposit[5]) {
      console.log("\n❌ Active flag is FALSE - won't display");
    } else if (Number(deposit[0]) === 0) {
      console.log("\n❌ Zero shares - won't display");
    }
  } catch (error: any) {
    console.error("\n❌ Error calling getUserDeposit:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
