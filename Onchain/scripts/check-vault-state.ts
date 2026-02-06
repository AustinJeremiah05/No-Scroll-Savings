import { ethers } from "hardhat";

async function main() {
  const SAVINGS_VAULT = "0xF4df10e373E509EC3d96237df91bE9B0006E918D";

  console.log("🔍 Checking SavingsVault state for share calculation...\n");

  const vault = await ethers.getContractAt("SavingsVault", SAVINGS_VAULT);

  // Check total supply of shares
  const totalSupply = await vault.totalSupply();
  console.log("Total Supply (shares):", ethers.formatUnits(totalSupply, 6));

  // Check total assets
  const totalAssets = await vault.totalAssets();
  console.log("Total Assets (USDC):", ethers.formatUnits(totalAssets, 6));

  // Test previewDeposit
  const testAmount = ethers.parseUnits("5", 6); // 5 USDC
  const expectedShares = await vault.previewDeposit(testAmount);
  console.log("\nPreview Deposit Test:");
  console.log("  Input: 5 USDC");
  console.log("  Expected Shares:", ethers.formatUnits(expectedShares, 6));

  if (expectedShares === 0n) {
    console.log("\n❌ PROBLEM: previewDeposit returns 0 shares!");
    console.log("This is why deposits aren't showing up.");
    
    console.log("\nPossible causes:");
    if (totalSupply === 0n && totalAssets === 0n) {
      console.log("✅ Vault is empty - first deposit should work");
    } else if (totalSupply === 0n && totalAssets > 0n) {
      console.log("⚠️  Vault has assets but no shares - this breaks the 1:1 ratio");
      console.log("    Total Assets without shares:", ethers.formatUnits(totalAssets, 6), "USDC");
    } else if (totalSupply > 0n && totalAssets === 0n) {
      console.log("⚠️  Vault has shares but no assets - all shares are worthless");
      console.log("    Orphaned shares:", ethers.formatUnits(totalSupply, 6));
    } else {
      console.log("⚠️  Share to asset ratio is broken");
      console.log("    Ratio:", Number(totalAssets) / Number(totalSupply));
    }
  } else {
    console.log("\n✅ previewDeposit working correctly");
  }

  // Check asset (USDC) address
  const assetAddress = await vault.asset();
  console.log("\nAsset (USDC):", assetAddress);

  // Check if vault has any USDC stuck
  const USDC = await ethers.getContractAt("IERC20", assetAddress);
  const vaultUSDCBalance = await USDC.balanceOf(SAVINGS_VAULT);
  console.log("Vault USDC Balance:", ethers.formatUnits(vaultUSDCBalance, 6), "USDC");

  if (vaultUSDCBalance > 0n && totalSupply === 0n) {
    console.log("\n❌ CRITICAL: Vault has", ethers.formatUnits(vaultUSDCBalance, 6), "USDC but 0 shares!");
    console.log("This breaks ERC-4626 share calculation. The vault needs to be reset or USDC needs to be accounted for.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
