import { ethers } from "hardhat";

async function main() {
  const TREASURY_MANAGER = "0x8C5963806f445BC5A7011A4072ed958767E90DB9";

  console.log("🔍 Checking TreasuryManager state...\n");

  const treasury = await ethers.getContractAt("TreasuryManager", TREASURY_MANAGER);

  const backend = await treasury.backend();
  const uniswapV4Agent = await treasury.uniswapV4Agent();
  const aavePool = await treasury.aavePool();
  const totalReceived = await treasury.totalReceived();
  const totalInUniswap = await treasury.totalInUniswap();
  const totalInAave = await treasury.totalInAave();

  console.log("📊 TreasuryManager Configuration:");
  console.log("   Address:", TREASURY_MANAGER);
  console.log("   Backend:", backend);
  console.log("   UniswapV4Agent:", uniswapV4Agent);
  console.log("   Aave Pool:", aavePool);

  console.log("\n💰 Balances:");
  console.log("   Total Received:", ethers.formatUnits(totalReceived, 6), "USDC");
  console.log("   Total in Uniswap:", ethers.formatUnits(totalInUniswap, 6), "USDC");
  console.log("   Total in Aave:", ethers.formatUnits(totalInAave, 6), "USDC");

  // Check USDC balance
  const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const usdc = await ethers.getContractAt("IERC20", USDC_SEPOLIA);
  const balance = await usdc.balanceOf(TREASURY_MANAGER);
  console.log("   USDC in Treasury:", ethers.formatUnits(balance, 6), "USDC");

  if (uniswapV4Agent === ethers.ZeroAddress) {
    console.log("\n⚠️  UniswapV4Agent is not set! This will cause receiveFunds to fail.");
    console.log("   Solution: Set a placeholder address or modify contract logic");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
