import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=== Fixing UniswapV4Agent Address in TreasuryManager ===\n");
  console.log("Deployer:", deployer.address);
  
  const TREASURY_MANAGER_ADDRESS = "0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9";
  const CORRECT_UNISWAP_AGENT = "0x5AC3d6D73bBfc9C8b26a78cF7D7314B326B2CAb5";
  
  // Get TreasuryManager
  const TreasuryManager = await ethers.getContractFactory("TreasuryManager");
  const treasuryManager = TreasuryManager.attach(TREASURY_MANAGER_ADDRESS);
  
  // Check current value
  const currentAgent = await treasuryManager.uniswapV4Agent();
  console.log("Current UniswapV4Agent:", currentAgent);
  console.log("Correct UniswapV4Agent:", CORRECT_UNISWAP_AGENT);
  
  if (currentAgent.toLowerCase() === CORRECT_UNISWAP_AGENT.toLowerCase()) {
    console.log("✅ Already set correctly!");
    return;
  }
  
  // Update to correct address
  console.log("\nUpdating...");
  const tx = await treasuryManager.setUniswapV4Agent(CORRECT_UNISWAP_AGENT);
  console.log("Transaction sent:", tx.hash);
  
  await tx.wait();
  console.log("✅ Transaction confirmed!");
  
  // Verify
  const newAgent = await treasuryManager.uniswapV4Agent();
  console.log("\nVerification:");
  console.log("   New UniswapV4Agent:", newAgent);
  
  if (newAgent.toLowerCase() === CORRECT_UNISWAP_AGENT.toLowerCase()) {
    console.log("\n✅ Successfully updated UniswapV4Agent address!");
  } else {
    console.log("\n❌ Failed to update!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
