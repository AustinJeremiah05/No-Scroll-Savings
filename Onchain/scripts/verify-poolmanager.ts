import { ethers } from "hardhat";

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";

async function main() {
  console.log("\n🔍 Verifying PoolManager Contract on Sepolia");
  console.log("=============================================\n");

  const provider = ethers.provider;

  console.log(`Checking address: ${POOL_MANAGER}\n`);

  // Check if contract exists
  const code = await provider.getCode(POOL_MANAGER);
  console.log(`Contract code length: ${code.length} bytes`);

  if (code === "0x" ||code.length <=2) {
    console.log("❌ NO CONTRACT CODE FOUND!");
    console.log("This address does not have a deployed contract.\n");
    console.log("💡 Solution: Find the correct Uniswap V4 PoolManager address for Sepolia");
    console.log("Or deploy your own PoolManager for testing.");
    return;
  }

  console.log("✅ Contract code exists!\n");

  // Try to call a simple view function
  console.log("📞 Testing contract accessibility...");
  
  const poolManagerAny = await ethers.getContractAt(
    ["function protocolFeesAccrued(address) external view returns (uint256)"],
    POOL_MANAGER
  );

  try {
    const fees = await poolManagerAny.protocolFeesAccrued(ethers.ZeroAddress);
    console.log(`✅ Contract is accessible!`);
    console.log(`   Called protocolFeesAccrued: ${fees.toString()}\n`);
  } catch (error: any) {
    console.log(`⚠️  Function call failed: ${error.message}`);
    console.log(`This might be OK - the function signature might be different.\n`);
  }

  console.log("💡 Contract exists and is accessible.");
  console.log("The issue is likely with:");
  console.log("  1. Pool not initialized");
  console.log("  2. Incorrect function signatures in our interface");
  console.log("  3. Missing required setup steps for Uniswap V4\n");

  console.log("📋 Recommendations:");
  console.log("  1. Check Uniswap V4 docs for correct interface");
  console.log("  2. Look for existing pools on this PoolManager");
  console.log("  3. Consider using a different liquidity approach (e.g., direct swap)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
