import { ethers } from "hardhat";

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

async function main() {
  console.log("\n🔍 Checking if USDC/WETH pool exists");
  console.log("=====================================\n");

  // Pool configuration
  const poolKey = {  
    currency0: USDC,  // Lower address
    currency1: WETH,  // Higher address
    fee: 10000,       // 1% fee
    tickSpacing: 200,   hooks: "0x0000000000000000000000000000000000000000"
  };

  console.log("Pool Key:");
  console.log(JSON.stringify(poolKey, null, 2));

  // Calculate pool ID (keccak256 of encoded PoolKey)
  const poolId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)"],
      [poolKey]
    )
  );

  console.log(`\nCalculated Pool ID: ${poolId}\n`);

  // Try to read pool state from PoolManager
  // Note：We need to use the actual PoolManager ABI that the user provided
  // The standard way is to use extsload to read storage
  
  const poolManager = await ethers.getContractAt(
    [
      "function extsload(bytes32 slot) external view returns (bytes32)"
    ],
    POOL_MANAGER
  );

  try {
    // Try to read slot 0 of the pool (sqrtPriceX96)
    const slot0 = await poolManager["extsload(bytes32)"](poolId);
    console.log(`Pool slot0 data: ${slot0}`);
    
    if (slot0 === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      console.log("\n❌ Pool does NOT exist (or is not initialized)");
      console.log("\n💡 The pool needs to be initialized before adding liquidity!");
      console.log("You need to call PoolManager.initialize() with:");
      console.log(`  - PoolKey: ${JSON.stringify(poolKey)}`);
      console.log(`  - sqrtPriceX96: Initial price (e.g., 79228162514264337593543950336 for 1:1)`);
    } else {
      console.log("\n✅ Pool EXISTS and is initialized!");
      
      // Try to decode sqrtPriceX96 from slot0
      // In Uniswap V4, slot0 contains: sqrtPriceX96 (160 bits) + tick (24 bits) + other data
      const sqrtPriceX96 = BigInt(slot0) & ((1n << 160n) - 1n);
      console.log(`sqrtPriceX96: ${sqrtPriceX96}`);
    }
  } catch (error: any) {
    console.error("\n❌ Error reading pool state:");
    console.error(error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
