import { ethers } from "hardhat";

const SAVINGS_VAULT = "0xF229C0f9277B4c5346422Ca1eD94Eee532709d3b";
const USDC_ARC = "0x3600000000000000000000000000000000000000";

async function main() {
  console.log("🔍 Checking SavingsVault balances...\n");

  const usdc = await ethers.getContractAt("IERC20", USDC_ARC);
  const vault = await ethers.getContractAt("SavingsVault", SAVINGS_VAULT);

  // Check USDC balance in vault
  const vaultBalance = await usdc.balanceOf(SAVINGS_VAULT);
  console.log("💰 Vault USDC Balance:", ethers.formatUnits(vaultBalance, 6), "USDC");

  // Check total shares
  const totalShares = await vault.totalSupply();
  console.log("📊 Total Shares:", ethers.formatUnits(totalShares, 6));

  // Check total assets
  const totalAssets = await vault.totalAssets();
  console.log("💼 Total Assets:", ethers.formatUnits(totalAssets, 6), "USDC");

  // Check hub metrics
  const hubMetrics = await vault.hubMetrics();
  console.log("\n🌐 Hub Metrics:");
  console.log("   Arc Buffer:", ethers.formatUnits(hubMetrics.arcBuffer, 6), "USDC");
  console.log("   Bridged to Sepolia:", ethers.formatUnits(hubMetrics.totalBridgedToSepolia, 6), "USDC");
  console.log("   Total Pooled:", ethers.formatUnits(hubMetrics.totalPooledOnArc, 6), "USDC");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
