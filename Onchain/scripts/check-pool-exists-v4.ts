import { ethers } from "hardhat";

/**
 * Check if USDC/WETH pool exists on Uniswap V4
 * Using STANDARD 0.3% fee tier
 */

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

async function main() {
  console.log("\n🔍 Checking USDC/WETH Pool on Uniswap V4");
  console.log("========================================\n");

  // Standard 0.3% fee tier
  const poolKey = {
    currency0: USDC,
    currency1: WETH,
    fee: 3000,            // 0.3%
    tickSpacing: 60,
    hooks: ethers.ZeroAddress
  };

  console.log("Pool Configuration:");
  console.log(`  USDC (currency0): ${poolKey.currency0}`);
  console.log(`  WETH (currency1): ${poolKey.currency1}`);
  console.log(`  Fee: ${poolKey.fee} (0.3%)`);
  console.log(`  Tick Spacing: ${poolKey.tickSpacing}\n`);

  // Calculate pool ID
  const poolId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)"],
      [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]]
    )
  );
  console.log(`Pool ID: ${poolId}\n`);

  // Get PoolManager - use extsload for reading state
  const poolManager = await ethers.getContractAt(
    [
      "function extsload(bytes32 slot) external view returns (bytes32)",
      "function extsload(bytes32[] memory slots) external view returns (bytes32[] memory)"
    ],
    POOL_MANAGER
  );

  try {
    console.log("🔍 Querying pool state via extsload...");
    
    // Pool state is stored at: keccak256(abi.encode(poolId, POOLS_SLOT))
    // For v4, slot0 is typically at keccak256(abi.encode(poolId))
    const slot0Slot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [poolId])
    );
    
    const slot0Data = await poolManager.extsload(slot0Slot);
    console.log(`Slot0 data: ${slot0Data}\n`);
    
    if (slot0Data === ethers.ZeroHash || slot0Data === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      console.log("❌ Pool NOT initialized");
      console.log(`\n💡 Run: npx hardhat run scripts/initialize-pool-v4.ts --network sepolia`);
    } else {
      console.log("✅ Pool IS initialized!");
      
      // Decode slot0 (packed): sqrtPriceX96 (160 bits) | tick (24 bits) | others
      const sqrtPriceX96Hex = "0x" + slot0Data.slice(2, 42); // First 160 bits (20 bytes)
      const sqrtPriceX96 = BigInt(sqrtPriceX96Hex);
      console.log(`  sqrtPriceX96: ${sqrtPriceX96.toString()}`);
      
      // Calculate human-readable price
      const Q96 = 2n ** 96n;
      const price = (sqrtPriceX96 * sqrtPriceX96) / (Q96 * Q96);
      console.log(`  Price (WETH/USDC): ~${price.toString()}`);
      
      console.log(`\n✅ Pool is ready for liquidity provision!`);
    }
    
  } catch (error: any) {
    console.log("❌ Failed to query pool state");
    console.log("Error:", error.message);
    
    if (error.message.includes("extsload")) {
      console.log("\n💡 PoolManager might not support extsload");
      console.log("   This is OK - just means we can't easily check state");
      console.log("   Try initializing anyway, it will fail if already initialized");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
