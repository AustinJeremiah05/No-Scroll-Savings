import { ethers } from "hardhat";

const SAVINGS_VAULT = "0xF229C0f9277B4c5346422Ca1eD94Eee532709d3b";
const BACKEND_ADDRESS = "0xe01Add0c3640a8314132bAF491d101A38ffEF4f0";

async function main() {
  console.log("🔧 Setting backend address in SavingsVault...\n");
  console.log("   Vault:", SAVINGS_VAULT);
  console.log("   Backend:", BACKEND_ADDRESS);
  console.log("");

  const savingsVault = await ethers.getContractAt("SavingsVault", SAVINGS_VAULT);

  // Check current backend
  const currentBackend = await savingsVault.backend();
  console.log("📋 Current backend:", currentBackend);

  if (currentBackend === BACKEND_ADDRESS) {
    console.log("✅ Backend already set correctly!");
    return;
  }

  // Set backend
  console.log("\n🔄 Setting backend address...");
  const tx = await savingsVault.setBackend(BACKEND_ADDRESS);
  await tx.wait();
  console.log("✅ Transaction confirmed:", tx.hash);

  // Verify
  const newBackend = await savingsVault.backend();
  console.log("\n🔍 Verification:");
  console.log("   Backend address:", newBackend);
  
  if (newBackend === BACKEND_ADDRESS) {
    console.log("\n✅ Backend successfully set!");
  } else {
    console.log("\n❌ Verification failed!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
