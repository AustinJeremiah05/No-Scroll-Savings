import { ethers } from "hardhat";

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

async function main() {
  console.log("\n🏊 Initializing USDC/WETH Pool on Uniswap V4");
  console.log("=============================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Pool configuration
  const poolKey = {  
    currency0: USDC,  // Lower address
    currency1: WETH,  // Higher address
    fee: 10000,       // 1% fee
    tickSpacing: 200,
    hooks: "0x0000000000000000000000000000000000000000"
  };

  console.log("\nPool Key:");
  console.log(JSON.stringify(poolKey, null, 2));

  // Calculate initial price
  // For a 1:1 price ratio (assuming USDC ~= $1 and ETH ~= $3000):
  // We want: 1 USDC = 0.000333 WETH  // Or: 1 WETH = 3000 USDC
  
  // sqrtPriceX96 = sqrt(price) * 2^96
  // price = (token1/token0) = (WETH/USDC) = 3000
  // sqrt(3000) = 54.77
  // sqrtPriceX96 = 54.77 * 2^96 = 4.337e+30
  
  // Actually, let's use a simpler 1:1000 ratio for testing
  // sqrt(1000) ≈ 31.62
  const sqrtPrice1000 = 31.62 * Math.pow(2, 96);
  const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice1000));
  
  // Or use the standard 1:1 for simplicity in testing
  const sqrtPriceX96_1to1 = BigInt("79228162514264337593543950336"); // √1 * 2^96
  
  console.log(`\nInitializing pool at 1:1 price (for testing)`);
  console.log(`sqrtPriceX96: ${sqrtPriceX96_1to1}`);

  // Get PoolManager contract
  const poolManager = await ethers.getContractAt(
    [
      "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24 tick)"
    ],
    POOL_MANAGER
  );

  try {
    console.log("\n📞 Calling PoolManager.initialize()...");
    const tx = await poolManager.initialize(poolKey, sqrtPriceX96_1to1, {
      gasLimit: 3000000 // Set higher gas limit for pool initialization
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
        [poolKey]
      )
    );

    console.log(`Pool ID: ${poolId}`);
    console.log(`\n✅ USDC/WETH pool is now ready for liquidity!`);
    console.log(`\n💡 Now you can call TreasuryManager.receiveFunds() to add liquidity`);
    
  } catch (error: any) {
    console.error("\n❌ Pool initialization failed:");
    console.error("Error:", error.message);
    
    if (error.message.includes("PoolAlreadyInitialized") || error.message.includes("0x")) {
      console.log("\n💡 Pool might already be initialized. Try adding liquidity directly.");
    }
    
    if (error.data) {
      console.error("Error data:", error.data);
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
