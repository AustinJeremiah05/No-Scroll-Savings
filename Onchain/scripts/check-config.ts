import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("=== Checking Contract Configuration ===\n");
  
  const TREASURY_MANAGER_ADDRESS = "0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9";
  const UNISWAP_AGENT_ADDRESS = "0x5AC3d6D73bBfc9C8b26a78cF7D7314B326B2CAb5";
  const EXPECTED_BACKEND = "0xe01Add0c3640a8314132bAF491d101A38ffEF4f0";
  
  // Get TreasuryManager
  const TreasuryManager = await ethers.getContractFactory("TreasuryManager");
  const treasuryManager = TreasuryManager.attach(TREASURY_MANAGER_ADDRESS);
  
  // Get UniswapV4Agent
  const UniswapAgent = await ethers.getContractFactory("UniswapV4Agent");
  const uniswapAgent = UniswapAgent.attach(UNISWAP_AGENT_ADDRESS);
  
  console.log("📋 TreasuryManager Configuration:");
  const backend = await treasuryManager.backend();
  const uniswapV4Agent = await treasuryManager.uniswapV4Agent();
  console.log("   Backend:", backend);
  console.log("   Expected:", EXPECTED_BACKEND);
  console.log("   Match:", backend.toLowerCase() === EXPECTED_BACKEND.toLowerCase() ? "✅" : "❌");
  console.log("   UniswapV4Agent:", uniswapV4Agent);
  console.log("   Expected:", UNISWAP_AGENT_ADDRESS);
  console.log("   Match:", uniswapV4Agent.toLowerCase() === UNISWAP_AGENT_ADDRESS.toLowerCase() ? "✅" : "❌");
  
  console.log("\n📋 UniswapV4Agent Configuration:");
  const treasuryManagerInAgent = await uniswapAgent.treasuryManager();
  console.log("   TreasuryManager:", treasuryManagerInAgent);
  console.log("   Expected:", TREASURY_MANAGER_ADDRESS);
  console.log("   Match:", treasuryManagerInAgent.toLowerCase() === TREASURY_MANAGER_ADDRESS.toLowerCase() ? "✅" : "❌");
  
  console.log("\n=== Summary ===");
  const allCorrect = (
    backend.toLowerCase() === EXPECTED_BACKEND.toLowerCase() &&
    uniswapV4Agent.toLowerCase() === UNISWAP_AGENT_ADDRESS.toLowerCase() &&
    treasuryManagerInAgent.toLowerCase() === TREASURY_MANAGER_ADDRESS.toLowerCase()
  );
  
  if (allCorrect) {
    console.log("✅ All configurations are correct!");
  } else {
    console.log("❌ Some configurations need to be fixed!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
