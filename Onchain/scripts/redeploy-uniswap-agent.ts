import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("\n🔄 Redeploying UniswapV4Agent to Ethereum Sepolia");
  console.log("Deployer account:", deployer.address);
  
  // Configuration from .env
  const SEPOLIA_USDC = process.env.SEPOLIA_USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const SEPOLIA_WETH = process.env.SEPOLIA_WETH_ADDRESS || "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
  const SEPOLIA_UNISWAP_POOL_MANAGER = process.env.SEPOLIA_UNISWAP_POOL_MANAGER || "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
  const OLD_TREASURY_MANAGER = "0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9";
  
  // Deploy new UniswapV4Agent
  console.log("\n📦 Deploying new UniswapV4Agent...");
  const UniswapAgent = await ethers.getContractFactory("UniswapV4Agent");
  const uniswapAgent = await UniswapAgent.deploy(
    SEPOLIA_USDC,
    SEPOLIA_UNISWAP_POOL_MANAGER,
    deployer.address,
    SEPOLIA_WETH
  );
  await uniswapAgent.waitForDeployment();
  const newAgentAddress = await uniswapAgent.getAddress();
  console.log("✅ New UniswapV4Agent deployed to:", newAgentAddress);
  
  // Set TreasuryManager
  console.log("\n🔗 Linking to TreasuryManager...");
  const setTreasuryTx = await uniswapAgent.setTreasuryManager(OLD_TREASURY_MANAGER);
  await setTreasuryTx.wait();
  console.log("✅ TreasuryManager set");
  
  // Update TreasuryManager to use new agent
  console.log("\n🔗 Updating TreasuryManager...");
  const treasuryManager = await ethers.getContractAt("TreasuryManager", OLD_TREASURY_MANAGER);
  const updateAgentTx = await treasuryManager.setUniswapV4Agent(newAgentAddress);
  await updateAgentTx.wait();
  console.log("✅ TreasuryManager updated to use new agent");
  
  console.log("\n=== Redeployment Summary ===");
  console.log("Old UniswapV4Agent: 0x7E9f69044A2dA30f04178b50dEc4b79FbEE55bB5");
  console.log("New UniswapV4Agent:", newAgentAddress);
  console.log("TreasuryManager:", OLD_TREASURY_MANAGER);
  console.log("\n✅ Redeployment complete!");
  
  console.log("\n=== Update Required ===");
  console.log("Update these files with new address:");
  console.log("1. frontend/lib/contracts.ts");
  console.log("2. CONTRACT_ADDRESSES.md");
  console.log("3. UNISWAP_V4_INTEGRATION.md");
  
  console.log("\n=== Verification Command ===");
  console.log(`npx hardhat verify --network sepolia ${newAgentAddress} "${SEPOLIA_USDC}" "${SEPOLIA_UNISWAP_POOL_MANAGER}" "${deployer.address}" "${SEPOLIA_WETH}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
