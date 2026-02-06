import { ethers } from "hardhat";

async function main() {
  const [backend] = await ethers.getSigners();
  const SAVINGS_VAULT = "0xF4df10e373E509EC3d96237df91bE9B0006E918D";

  console.log("🔧 Fixing vault share calculation by removing stuck USDC...\n");
  console.log("Backend wallet:", backend.address);
  console.log("Vault:", SAVINGS_VAULT);

  const vault = await ethers.getContractAt("SavingsVault", SAVINGS_VAULT);

  // Check current state
  const totalSupply = await vault.totalSupply();
  const totalAssets = await vault.totalAssets();
  
  console.log("\n📊 Current Vault State:");
  console.log("  Total Supply (shares):", ethers.formatUnits(totalSupply, 6));
  console.log("  Total Assets (USDC):", ethers.formatUnits(totalAssets, 6));

  if (totalSupply > 0n) {
    console.log("\n❌ Cannot fix: Vault has active shares. This would affect share holders.");
    return;
  }

  if (totalAssets === 0n) {
    console.log("\n✅ Vault is already clean. No stuck USDC.");
    return;
  }

  console.log("\n⚠️  PROBLEM: Vault has", ethers.formatUnits(totalAssets, 6), "USDC but 0 shares");
  console.log("This breaks ERC-4626 share calculation.");
  console.log("\n🔧 Solution: Transfer stuck USDC out using transferForCCTPBridge...");

  // Generate a bridge request ID for this emergency withdrawal
  const bridgeRequestId = ethers.keccak256(
    ethers.toUtf8Bytes(`emergency-fix-${Date.now()}`)
  );

  try {
    const tx = await vault.transferForCCTPBridge(bridgeRequestId, totalAssets, {
      gasLimit: 300000
    });

    console.log("\n📝 Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt?.blockNumber);

    // Verify the fix
    const newTotalAssets = await vault.totalAssets();
    const newTotalSupply = await vault.totalSupply();

    console.log("\n📊 New Vault State:");
    console.log("  Total Supply (shares):", ethers.formatUnits(newTotalSupply, 6));
    console.log("  Total Assets (USDC):", ethers.formatUnits(newTotalAssets, 6));

    // Test if deposits will work now
    const testAmount = ethers.parseUnits("5", 6);
    const expectedShares = await vault.previewDeposit(testAmount);
    
    console.log("\n🧪 Test Deposit Preview:");
    console.log("  Input: 5 USDC");
    console.log("  Expected Shares:", ethers.formatUnits(expectedShares, 6));

    if (expectedShares > 0n) {
      console.log("\n✅ SUCCESS! Deposits will now work correctly.");
      console.log("Users can now create deposits and receive proper shares.");
    } else {
      console.log("\n❌ Still broken. Further investigation needed.");
    }

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    
    if (error.message.includes("Only backend")) {
      console.log("\n⚠️  The current wallet is not the backend wallet.");
      console.log("Current signer:", backend.address);
      console.log("\nPlease run this script with the backend wallet private key.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
