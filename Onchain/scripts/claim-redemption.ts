import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=== Claim Redemption (Final Step) ===\n");
  console.log("User:", deployer.address);
  
  const SAVINGS_VAULT_ARC = "0xe85486A9bAF78B4A27Fe4D20f062Ae5d6AcE7b2D";
  const USDC_ARC = "0x3600000000000000000000000000000000000000";
  
  // Get request ID from command line args or hardcode for testing
  const requestIdArg = process.argv.find((arg) => arg.startsWith("--requestId="));
  const requestId = requestIdArg
    ? requestIdArg.split("=")[1]
    : "0x0000000000000000000000000000000000000000000000000000000000000000"; // Replace with actual
  
  if (requestId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  Please provide a request ID:");
    console.log("   npx hardhat run scripts/claim-redemption.ts --network arc -- --requestId=0x...\n");
    console.log("Or edit this script and hardcode the requestId.\n");
    return;
  }
  
  // Get contracts
  const SavingsVault = await ethers.getContractFactory("SavingsVault");
  const savingsVault = SavingsVault.attach(SAVINGS_VAULT_ARC);
  
  const usdcAbi = [
    "function balanceOf(address) view returns (uint256)",
  ];
  const usdc = await ethers.getContractAt(usdcAbi, USDC_ARC);
  
  // Check balances before
  const usdcBefore = await usdc.balanceOf(deployer.address);
  console.log("💰 Your USDC balance before:", ethers.formatUnits(usdcBefore, 6), "USDC\n");
  
  // Claim redemption
  console.log("🚀 Claiming Redemption...");
  console.log("   Request ID:", requestId);
  
  try {
    const tx = await savingsVault.claimRedemption(requestId);
    console.log("   Transaction sent:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("   ✅ Claim successful! Block:", receipt?.blockNumber);
    
    // Check balances after
    const usdcAfter = await usdc.balanceOf(deployer.address);
    const received = usdcAfter - usdcBefore;
    
    console.log("\n💰 Your USDC balance after:", ethers.formatUnits(usdcAfter, 6), "USDC");
    console.log("   📈 Received:", ethers.formatUnits(received, 6), "USDC");
    
    console.log("\n✅ Withdrawal complete! You successfully:");
    console.log("   1. Deposited USDC into No-Scroll Savings");
    console.log("   2. Completed your challenge (or waited unlock period)");
    console.log("   3. Bridged funds back from Sepolia → Arc");
    console.log("   4. Claimed your USDC + yield!");
    
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.message.includes("Request does not exist")) {
      console.log("\nℹ️  Redemption request not found. Make sure:");
      console.log("   - The request ID is correct");
      console.log("   - The CCTP bridge has completed (check bridge logs)");
      console.log("   - The backend has sent USDC to SavingsVault");
    } else if (error.message.includes("Redemption not ready")) {
      console.log("\nℹ️  Redemption is still pending. The CCTP bridge hasn't completed yet.");
      console.log("   Wait a bit longer and try again.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
