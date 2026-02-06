import { ethers } from "hardhat";

/**
 * Try to query existing pools on Uniswap V4 Sepolia
 * Check what fee tiers actually exist/work
 */

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

// Common fee tiers in Uniswap V4
const FEE_TIERS = [
  { fee: 100, tickSpacing: 1, name: "0.01%" },
  { fee: 500, tickSpacing: 10, name: "0.05%" },
  { fee: 3000, tickSpacing: 60, name: "0.3%" },
  { fee: 10000, tickSpacing: 200, name: "1%" }
];

async function main() {
  console.log("\n🔍 Checking Existing Uniswap V4 Pools");
  console.log("=====================================\n");

  const poolManager = await ethers.getContractAt(
    ["function extsload(bytes32 slot) external view returns (bytes32)"],
    POOL_MANAGER
  );

  console.log("Testing USDC/WETH pools with different fee tiers:\n");

  for (const tier of FEE_TIERS) {
    const poolKey = {
      currency0: USDC,
      currency1: WETH,
      fee: tier.fee,
      tickSpacing: tier.tickSpacing,
      hooks: ethers.ZeroAddress
    };

    const poolId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(address,address,uint24,int24,address)"],
        [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]]
      )
    );

    try {
      // Try to read pool state
      const slot0Slot = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [poolId])
      );
      
      const slot0Data = await poolManager.extsload(slot0Slot);
      
      if (slot0Data !== ethers.ZeroHash && slot0Data !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        console.log(`✅ ${tier.name} (${tier.fee}): Pool EXISTS`);
        console.log(`   Pool ID: ${poolId}`);
        console.log(`   Slot0: ${slot0Data}\n`);
      } else {
        console.log(`❌ ${tier.name} (${tier.fee}): Pool DOES NOT EXIST`);
        console.log(`   Pool ID: ${poolId}\n`);
      }
    } catch (error: any) {
      console.log(`⚠️  ${tier.name} (${tier.fee}): Cannot query (extsload might not be supported)\n`);
    }
  }

  console.log("\n💡 Recommendation:");
  console.log("   If none exist: Sepolia PoolManager likely requires special permissions");
  console.log("   If one exists: Use that pool in UniswapV4Agent");
  console.log("   Otherwise: Keep current workaround (custody-only)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
