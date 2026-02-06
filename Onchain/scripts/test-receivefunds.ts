import { ethers } from "hardhat";

const TREASURY_MANAGER = "0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9";
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

async function main() {
  console.log("\n🧪 Testing TreasuryManager.receiveFunds()");
  console.log("==========================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Caller (backend):", deployer.address);

  // Get contracts
  const treasuryManager = await ethers.getContractAt("TreasuryManager", TREASURY_MANAGER);
  const usdc = await ethers.getContractAt("IERC20", USDC);

  // Check balances before
  const balanceBefore = await usdc.balanceOf(TREASURY_MANAGER);
  console.log(`TreasuryManager USDC balance: ${ethers.formatUnits(balanceBefore, 6)} USDC\n`);

  // Try calling receiveFunds with 5 USDC
  const amount = ethers.parseUnits("5", 6);
  
  console.log("🚀 Calling receiveFunds(5 USDC)...\n");
  
  try {
    const tx = await treasuryManager.receiveFunds(amount, {
      gasLimit: 5000000 // High gas limit to avoid gas estimation issues
    });
    console.log("✅ Transaction sent:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    
    // Check balances after
    const balanceAfter = await usdc.balanceOf(TREASURY_MANAGER);
    console.log(`\nTreasuryManager USDC balance: ${ethers.formatUnits(balanceAfter, 6)} USDC`);
    
  } catch (error: any) {
    console.log("❌ Transaction failed!");
    console.log("\nError details:");
    
    if (error.data) {
      console.log("Error data:", error.data);
      
      // Try to decode the revert reason
      try {
        const decodedError = ethers.AbiCoder.defaultAbiCoder().decode(
          ["string"],
          "0x" + error.data.slice(10)
        );
        console.log("Revert reason:", decodedError[0]);
      } catch {
        console.log("Could not decode revert reason");
      }
    }
    
    console.log("\nFull error:", error.message);
    
    // Try to get more details by simulating the call
    console.log("\n🔍 Attempting to get detailed error...");
    try {
      await treasuryManager.receiveFunds.staticCall(amount);
    } catch (staticError: any) {
      console.log("Static call error:", staticError.message);
      if (staticError.data) {
        console.log("Static call error data:", staticError.data);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
