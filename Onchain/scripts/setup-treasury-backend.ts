import { ethers } from "hardhat";

async function main() {
  const TREASURY_MANAGER = "0xc4534a320Ff1561EC173A76103E43afe52dBC2B5";
  const BACKEND_ADDRESS = "0xe01Add0c3640a8314132bAF491d101A38ffEF4f0"; // Update with your backend wallet

  console.log("=== Setting Backend Address in TreasuryManager ===\n");

  const treasuryManager = await ethers.getContractAt("TreasuryManager", TREASURY_MANAGER);

  console.log("Current backend:", await treasuryManager.backend());
  console.log("Setting to:", BACKEND_ADDRESS);

  const tx = await treasuryManager.setBackend(BACKEND_ADDRESS);
  await tx.wait();

  console.log("✅ Backend address set!");
  console.log("   Transaction:", tx.hash);
  console.log("\nVerification:");
  console.log("   New backend:", await treasuryManager.backend());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
