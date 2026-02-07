import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=== Setting Treasury Manager in UniswapV4Agent ===\n");
  console.log("Deployer:", deployer.address);
  
  // Contract addresses (from deployment)
  const UNISWAP_AGENT_ADDRESS = "0x5AC3d6D73bBfc9C8b26a78cF7D7314B326B2CAb5";
  const TREASURY_MANAGER_ADDRESS = "0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9";
  
  // Get contract instance
  const UniswapAgent = await ethers.getContractFactory("UniswapV4Agent");
  const uniswapAgent = UniswapAgent.attach(UNISWAP_AGENT_ADDRESS);
  
  // Check current treasury manager
  const currentTreasury = await uniswapAgent.treasuryManager();
  console.log("Current treasury manager:", currentTreasury);
  console.log("Setting to:", TREASURY_MANAGER_ADDRESS);
  
  if (currentTreasury.toLowerCase() === TREASURY_MANAGER_ADDRESS.toLowerCase()) {
    console.log("✅ Treasury manager already set correctly!");
    return;
  }
  
  // Set treasury manager
  console.log("\nCalling setTreasuryManager()...");
  const tx = await uniswapAgent.setTreasuryManager(TREASURY_MANAGER_ADDRESS);
  console.log("Transaction sent:", tx.hash);
  
  await tx.wait();
  console.log("✅ Transaction confirmed!");
  
  // Verify
  const newTreasury = await uniswapAgent.treasuryManager();
  console.log("\nVerification:");
  console.log("   New treasury manager:", newTreasury);
  
  if (newTreasury.toLowerCase() === TREASURY_MANAGER_ADDRESS.toLowerCase()) {
    console.log("\n✅ Successfully set treasury manager in UniswapV4Agent!");
  } else {
    console.log("\n❌ Failed to set treasury manager!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
