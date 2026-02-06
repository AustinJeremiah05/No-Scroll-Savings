import { ethers } from "hardhat";

/**
 * Initialize USDC/WETH pool on Uniswap V4 (Sepolia)
 * Using STANDARD fee tier: 0.3% (3000) with tickSpacing 60
 */

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

async function main() {
  console.log("\n🏊 Initializing USDC/WETH Pool on Uniswap V4");
  console.log("============================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // CRITICAL: Use standard 0.3% fee tier (most likely to be supported)
  const poolKey = {  
    currency0: USDC,      // Lower address
    currency1: WETH,      // Higher address
    fee: 3000,            // 0.3% = 3000 bips (STANDARD FEE TIER)
    tickSpacing: 60,      // MUST be 60 for 0.3% fee
    hooks: ethers.ZeroAddress
  };

  console.log("Pool Configuration (STANDARD 0.3% fee tier):");
  console.log(JSON.stringify(poolKey, null, 2));

  // Calculate sqrtPriceX96 for 1:1 price
  // For testing: assume 1 USDC = 1 WETH equivalent (not realistic but simple)
  // sqrtPriceX96 = sqrt(price) * 2^96
  // For 1:1: sqrt(1) * 2^96 = 2^96 = 79228162514264337593543950336
  const sqrtPriceX96_1to1 = BigInt("79228162514264337593543950336");
  
  // Convert to tick and verify it's aligned to tickSpacing=60
  // tick = floor(log_1.0001(price))
  // For price=1: tick=0 (which IS divisible by 60 ✅)
  console.log(`\nInitializing at 1:1 price (tick ≈ 0, aligned to spacing 60)`);
  console.log(`sqrtPriceX96: ${sqrtPriceX96_1to1}\n`);

  // Get PoolManager contract with initialize function
  const poolManager = await ethers.getContractAt(
    [
      "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24 tick)"
    ],
    POOL_MANAGER
  );

  try {
    console.log("📞 Calling PoolManager.initialize() directly (no unlock)...");
    console.log("⏳ This may take 30-60 seconds...\n");
    
    const tx = await poolManager.initialize(poolKey, sqrtPriceX96_1to1, {
      gasLimit: 5000000 // Higher gas limit for initialization
    });
    
    console.log(`📝 Transaction hash: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...\n");

    const receipt = await tx.wait();
    console.log(`✅ Pool initialized in block ${receipt?.blockNumber}`);
    console.log(`⛽ Gas used: ${receipt?.gasUsed.toString()}\n`);

    // Calculate pool ID
    const poolId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)"],
        [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]]
      )
    );

    console.log(`Pool ID: ${poolId}`);
    console.log(`\n✅ SUCCESS! USDC/WETH (0.3%) pool is now initialized!`);
    console.log(`\n📋 Pool Details:`);
    console.log(`  - Currency0: ${poolKey.currency0} (USDC)`);
    console.log(`  - Currency1: ${poolKey.currency1} (WETH)`);
    console.log(`  - Fee: ${poolKey.fee} (0.3%)`);
    console.log(`  - Tick Spacing: ${poolKey.tickSpacing}`);
    console.log(`  - Pool ID: ${poolId}`);
    console.log(`\n💡 Now redeploy UniswapV4Agent and enable liquidity provision!`);
    
  } catch (error: any) {
    console.error("\n❌ Pool initialization failed!");
    console.error("Error:", error.message);
    
    if (error.message.includes("PoolAlreadyInitialized") || 
        error.message.includes("0x")) {
      console.log("\n💡 Pool might already be initialized!");
      console.log("   Try querying getSlot0() to verify.");
    } else if (error.message.includes("TickSpacingTooLarge") || 
               error.message.includes("TickSpacingTooSmall")) {
      console.log("\n💡 Tick spacing issue - fee tier might not be supported");
      console.log("   Current: 3000 (0.3%) with tickSpacing 60");
    } else if (error.message.includes("CurrenciesOutOfOrderOrEqual")) {
      console.log("\n❌ Currencies must be sorted: currency0 < currency1");
      console.log(`   Current: ${poolKey.currency0} vs ${poolKey.currency1}`);
    }
    
    if (error.data) {
      console.error("\nError data:", error.data);
    }
    
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
