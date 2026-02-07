import { ethers } from "hardhat";

/**
 * Deploy minimal no-op hook for Uniswap V4
 * Required because hooks are MANDATORY in v4 (address(0) not allowed)
 */

async function main() {
  console.log("\n🪝 Deploying EmptyHook for Uniswap V4");
  console.log("====================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Uniswap V4 PoolManager on Sepolia
  const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
  console.log("PoolManager:", POOL_MANAGER);

  // Deploy the hook
  console.log("\n📦 Deploying EmptyHook...");
  const EmptyHook = await ethers.getContractFactory("EmptyHook");
  const hook = await EmptyHook.deploy(POOL_MANAGER);
  await hook.waitForDeployment();
  
  const hookAddress = await hook.getAddress();
  console.log("✅ EmptyHook deployed to:", hookAddress);

  // Verify pool manager
  const storedPoolManager = await hook.poolManager();
  console.log(`\n📋 Stored PoolManager: ${storedPoolManager}`);
  console.log(`   Matches expected: ${storedPoolManager === POOL_MANAGER}`);
  

  console.log("\n✅ Hook deployment complete!");
  console.log("\n📝 Next steps:");
  console.log(`  1. Update UniswapV4Agent.sol to use this hook address`);
  console.log(`  2. Update initialize-pool-v4.ts to use this hook address`);
  console.log(`  3. Redeploy UniswapV4Agent`);
  console.log(`  4. Try pool initialization again`);
  
  console.log("\n=== Verification Command ===");
  console.log(`npx hardhat verify --network sepolia ${hookAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
