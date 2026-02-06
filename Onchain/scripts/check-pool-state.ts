import { ethers } from "hardhat";

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

async function main() {
  console.log("\n🔍 Checking Uniswap V4 Pool State");
  console.log("===================================\n");

  const poolManager = await ethers.getContractAt(
    [
      "function getSlot0(bytes memory, bytes32) external view returns (uint160, int24, uint24)",
      "function getLiquidity(bytes32) external view returns (uint128)",
      "function extsload(bytes32) external view returns (bytes32)",
      "function currencyDelta(address, address) external view returns (int256)"
    ],
    POOL_MANAGER
  );

  // Construct pool key
  const poolKey = {
    currency0: USDC,
    currency1: WETH,
    fee: 10000,
    tickSpacing: 200,
    hooks: ethers.ZeroAddress
  };

  console.log("Pool Configuration:");
  console.log(`  currency0 (USDC): ${poolKey.currency0}`);
  console.log(`  currency1 (WETH): ${poolKey.currency1}`);
  console.log(`  fee: ${poolKey.fee} (1%)`);
  console.log(`  tickSpacing: ${poolKey.tickSpacing}`);
  console.log(`  hooks: ${poolKey.hooks}\n`);

  // Calculate pool ID
  const poolId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)"],
    [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]]
  ));
  console.log(`Pool ID: ${poolId}\n`);

  try {
    // Try to get pool state
    console.log("🔍 Querying pool state...");
    
    const emptyBytes = "0x";
    const slot0 = await poolManager.getSlot0(emptyBytes, poolId);
    console.log("✅ Pool exists!");
    console.log(`  sqrtPriceX96: ${slot0[0].toString()}`);
    console.log(`  tick: ${slot0[1].toString()}`);
    console.log(`  protocolFee: ${slot0[2].toString()}\n`);

    // Calculate human-readable price
    const sqrtPriceX96 = slot0[0];
    const Q96 = 2n ** 96n;
    const price = (sqrtPriceX96 * sqrtPriceX96 * (10n ** 18n)) / (Q96 * Q96);
    console.log(`  Current price (token1/token0): ${ethers.formatUnits(price, 18)}`);
    console.log(`  Current price (WETH/USDC): ${ethers.formatUnits(price, 18)}\n`);

    // Try to get liquidity
    try {
      const liquidity = await poolManager.getLiquidity(poolId);
      console.log(`Total pool liquidity: ${liquidity.toString()}`);
    } catch (e) {
      console.log("Could not query liquidity (method may not exist)");
    }

    // Check if pool is initialized
    const tick = slot0[1];
    console.log(`\n📊 Pool Analysis:`);
    console.log(`  Current tick: ${tick}`);
    console.log(`  Our range: -887200 to -200`);
    console.log(`  Position is ${tick > -200 ? "ACTIVE (current price in range)" : tick < -887200 ? "OUT OF RANGE (below)" : "OUT OF RANGE (above)"}`);

    if (tick > -200) {
      console.log(`\n⚠️  WARNING: Current tick (${tick}) is ABOVE our upper tick (-200)!`);
      console.log(`   This means the current price is HIGHER than expected.`);
      console.log(`   Our position would require both USDC and WETH, not just USDC!`);
    }

  } catch (error: any) {
    console.log("❌ Failed to query pool state");
    console.log("Error:", error.message);
    console.log("\n💡 Pool might not be initialized or doesn't exist");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
