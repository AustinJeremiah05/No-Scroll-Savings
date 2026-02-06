import { ethers } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();
  const TREASURY_MANAGER = "0x8C5963806f445BC5A7011A4072ed958767E90DB9";
  const BACKEND_ADDRESS = "0xe01Add0c3640a8314132bAF491d101A38ffEF4f0";

  console.log("🔧 Setting backend address in TreasuryManager...");
  console.log("Owner:", owner.address);
  console.log("TreasuryManager:", TREASURY_MANAGER);
  console.log("Backend Address:", BACKEND_ADDRESS, "\n");

  const treasuryManager = await ethers.getContractAt("TreasuryManager", TREASURY_MANAGER);

  // Check current backend
  const currentBackend = await treasuryManager.backend();
  console.log("Current backend:", currentBackend);

  if (currentBackend.toLowerCase() === BACKEND_ADDRESS.toLowerCase()) {
    console.log("\n✅ Backend is already set correctly!");
    return;
  }

  console.log("\n📝 Setting new backend address...");
  const tx = await treasuryManager.setBackend(BACKEND_ADDRESS);
  console.log("Transaction sent:", tx.hash);
  
  await tx.wait();
  console.log("✅ Transaction confirmed!");

  // Verify
  const newBackend = await treasuryManager.backend();
  console.log("\n📊 New backend address:", newBackend);
  
  if (newBackend.toLowerCase() === BACKEND_ADDRESS.toLowerCase()) {
    console.log("✅ Backend set successfully!");
  } else {
    console.log("❌ Backend not set correctly!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
