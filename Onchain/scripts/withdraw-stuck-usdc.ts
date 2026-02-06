import { ethers } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();
  const SAVINGS_VAULT = "0xe85486A9253913d54f0D6EDB3b91f82a6829b892";
  const USDC_ARC = "0x3600000000000000000000000000000000000000";

  console.log("🔧 Withdrawing stuck USDC from SavingsVault...\n");
  console.log("Owner:", owner.address);
  console.log("Vault:", SAVINGS_VAULT);

  const vault = await ethers.getContractAt("SavingsVault", SAVINGS_VAULT);
  const usdc = await ethers.getContractAt("IERC20", USDC_ARC);

  // Check how much USDC is stuck
  const stuckUSDC = await usdc.balanceOf(SAVINGS_VAULT);
  console.log("\nStuck USDC in vault:", ethers.formatUnits(stuckUSDC, 6), "USDC");

  const totalSupply = await vault.totalSupply();
  console.log("Total shares:", ethers.formatUnits(totalSupply, 6));

  if (stuckUSDC === 0n) {
    console.log("\n✅ No stuck USDC");
    return;
  }

  if (totalSupply > 0n) {
    console.log("\n⚠️  Vault has shares. Cannot withdraw without affecting share value.");
    console.log("This operation should only be done when totalSupply = 0");
    return;
  }

  console.log("\n✅ Safe to withdraw - no shares exist");
  console.log("\nWithdrawing stuck USDC to owner...");

  try {
    // The vault should have an emergency withdrawal function or we need to use transferForCCTPBridge
    // Let's try calling the backend function to transfer
    const bridgeRequestId = ethers.keccak256(ethers.toUtf8Bytes("emergency-withdrawal"));
    
    const tx = await vault.transferForCCTPBridge(bridgeRequestId, stuckUSDC, {
      gasLimit: 300000
    });

    console.log("Transaction sent:", tx.hash);
    await tx.wait();

    const newBalance = await usdc.balanceOf(SAVINGS_VAULT);
    console.log("\n✅ Withdrawal complete!");
    console.log("Vault USDC balance:", ethers.formatUnits(newBalance, 6), "USDC");
    console.log("Withdrawn:", ethers.formatUnits(stuckUSDC - newBalance, 6), "USDC");

    // Now test if deposits will work
    const testShares = await vault.previewDeposit(ethers.parseUnits("5", 6));
    console.log("\nTest: 5 USDC would give:", ethers.formatUnits(testShares, 6), "shares");
    
    if (testShares > 0n) {
      console.log("✅ Deposits should work now!");
    } else {
      console.log("❌ Still broken. Need to investigate further.");
    }
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    
    if (error.message.includes("Only backend")) {
      console.log("\n⚠️  transferForCCTPBridge requires backend wallet");
      console.log("Current signer:", owner.address);
      console.log("\nNeed to either:");
      console.log("1. Use the backend wallet private key");
      console.log("2. Add an admin emergency withdrawal function");
      console.log("3. Deploy a new vault");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
