import { ethers } from "hardhat";

const AGENT_ADDRESS = "0x5AC3d6D73bBfc9C8b26a78cF7D7314B326B2CAb5";
const TREASURY_MANAGER = "0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9";
const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

async function main() {
  console.log("\n🔍 Checking UniswapV4Agent Configuration");
  console.log("==========================================\n");

  const agent = await ethers.getContractAt("UniswapV4Agent", AGENT_ADDRESS);

  // Check treasury manager  
  const treasuryMgr = await agent.treasuryManager();
  console.log(`TreasuryManager: ${treasuryMgr}`);
  console.log(`Expected: ${TREASURY_MANAGER}`);
  console.log(`Match: ${treasuryMgr.toLowerCase() === TREASURY_MANAGER.toLowerCase() ? "✅" : "❌"}\n`);

  // Check pool manager
  const poolMgr = await agent.poolManager();
  console.log(`PoolManager: ${poolMgr}`);
  console.log(`Expected: ${POOL_MANAGER}`);
  console.log(`Match: ${poolMgr.toLowerCase() === POOL_MANAGER.toLowerCase() ? "✅" : "❌"}\n`);

  // Check USDC
  const usdc = await agent.USDC();
  console.log(`USDC: ${usdc}`);
  console.log(`Expected: ${USDC}`);
  console.log(`Match: ${usdc.toLowerCase() === USDC.toLowerCase() ? "✅" : "❌"}\n`);

  // Check pool configuration
  const pool = await agent.usdcWethPool();
  console.log("Pool Configuration:");
  console.log(`  currency0: ${pool.currency0}`);
  console.log(`  currency1: ${pool.currency1}`);
  console.log(`  fee: ${pool.fee}`);
  console.log(`  tickSpacing: ${pool.tickSpacing}`);
  console.log(`  hooks: ${pool.hooks}\n`);

  // Verify currency ordering (should be USDC < WETH)
  const usdc_wrapped = pool.currency0;
  const weth_wrapped = pool.currency1;
  console.log(`Currency ordering: ${usdc_wrapped < weth_wrapped ? "✅ Correct" : "❌ Incorrect"}`);
  console.log(`  USDC should be currency0: ${usdc_wrapped.toLowerCase() === USDC.toLowerCase() ? "✅" : "❌"}`);
  console.log(`  WETH should be currency1: ${weth_wrapped.toLowerCase() === WETH.toLowerCase() ? "✅" : "❌"}\n`);

  // Check constants  
  const minLiq = await agent.MIN_LIQUIDITY();
  console.log(`MIN_LIQUIDITYITY: ${ethers.formatUnits(minLiq, 6)} USDC`);

  const totalDeployed = await agent.totalDeployed();
  console.log(`Total deployed: ${ethers.formatUnits(totalDeployed, 6)} USDC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
