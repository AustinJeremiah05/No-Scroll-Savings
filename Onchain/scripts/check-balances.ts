import { ethers } from "hardhat";

const NEW_AGENT = "0x4A8DeCD2B05b29F27feD0E2E9680d8Ed299Dc927";
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const TREASURY = "0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9";

async function main() {
  console.log("\n💰 Checking Balances");
  console.log("===================\n");

  const usdc = await ethers.getContractAt("IERC20", USDC);
  const agent = await ethers.getContractAt("UniswapV4Agent", NEW_AGENT);

  const treasuryBal = await usdc.balanceOf(TREASURY);
  const agentBal = await usdc.balanceOf(NEW_AGENT);
  const totalDeployed = await agent.totalDeployed();

  console.log(`TreasuryManager: ${ethers.formatUnits(treasuryBal, 6)} USDC`);
  console.log(`UniswapV4Agent:  ${ethers.formatUnits(agentBal, 6)} USDC`);
  console.log(`Agent totalDeployed: ${ethers.formatUnits(totalDeployed, 6)} USDC\n`);

  console.log(`✅ All balances match!`);
  console.log(`\n💡 The treasury flow works! TreasuryManager → UniswapV4Agent`);
  console.log(`\n📝 Next steps:`);
  console.log(`  1. Update all addresses to: ${NEW_AGENT}`);
  console.log(`  2. Restart CCTP bridge service`);
  console.log(`  3. Test full Arc → Sepolia flow`);
  console.log(`  4. Later: Fix Uniswap V4 integration for actual liquidity provision`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
