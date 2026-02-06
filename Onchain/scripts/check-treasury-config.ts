import { ethers } from "hardhat";

const TREASURY_MANAGER = "0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9";
const NEW_AGENT = "0x4A8DeCD2B05b29F27feD0E2E9680d8Ed299Dc927";

async function main() {
  console.log("\n🔍 Checking TreasuryManager Configuration");
  console.log("==========================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Caller:", deployer.address);

  const treasuryManager = await ethers.getContractAt(
    "TreasuryManager",
    TREASURY_MANAGER
  );

  // Check uniswapV4Agent address
  const currentAgent = await treasuryManager.uniswapV4Agent();
  console.log(`\nCurrent UniswapV4Agent: ${currentAgent}`);
  console.log(`Expected UniswapV4Agent: ${NEW_AGENT}`);
  console.log(`Match: ${currentAgent.toLowerCase() === NEW_AGENT.toLowerCase() ? "✅" : "❌"}\n`);

  // Check backend address
  const backend = await treasuryManager.backend();
  console.log(`Backend address: ${backend}`);
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Match: ${backend.toLowerCase() === deployer.address.toLowerCase() ? "✅" : "❌"}\n`);

  // Check USDC balance  
  const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const usdc = await ethers.getContractAt("IERC20", USDC_SEPOLIA);
  const balance = await usdc.balanceOf(TREASURY_MANAGER);
  console.log(`TreasuryManager USDC balance: ${ethers.formatUnits(balance, 6)} USDC`);

  // Check agent USDC balance
  const agentBalance = await usdc.balanceOf(currentAgent);
  console.log(`UniswapV4Agent USDC balance: ${ethers.formatUnits(agentBalance, 6)} USDC\n`);

  // Check stats
  const totalInUniswap = await treasuryManager.totalInUniswap();
  console.log(`Total in Uniswap (recorded): ${ethers.formatUnits(totalInUniswap, 6)} USDC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
