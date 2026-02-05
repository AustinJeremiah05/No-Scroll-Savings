import { ethers } from "hardhat";

const SAVINGS_VAULT = "0xe85486A9253913d54f0D6EDB3b91f82a6829b892";
const USER_ADDRESS = "0xe01Add0c3640a8314132bAF491d101A38ffEF4f0"; // Your wallet

async function main() {
  console.log("🔍 Testing getUserDeposit function...\n");

  const savingsVault = await ethers.getContractAt("SavingsVault", SAVINGS_VAULT);

  try {
    const result = await savingsVault.getUserDeposit(USER_ADDRESS);
    
    console.log("📊 Result from getUserDeposit:");
    console.log("  Shares:", result[0].toString());
    console.log("  Assets:", result[1].toString());
    console.log("  Deposit Time:", result[2].toString(), `(${new Date(Number(result[2]) * 1000).toLocaleString()})`);
    console.log("  Unlock Time:", result[3].toString(), `(${new Date(Number(result[3]) * 1000).toLocaleString()})`);
    console.log("  Challenge Type:", result[4]);
    console.log("  Active:", result[5]);
    
    console.log("\n💰 Formatted:");
    console.log("  Amount:", (Number(result[1]) / 1e6).toFixed(2), "USDC");
    console.log("  Shares:", (Number(result[0]) / 1e6).toFixed(6));
    console.log("  Is Active:", result[5] ? "✅ YES" : "❌ NO");
    
    // Also check balance directly
    const balance = await savingsVault.balanceOf(USER_ADDRESS);
    console.log("\n📈 Direct balanceOf check:", balance.toString());
    
    // Check deposit metadata
    const metadata = await savingsVault.depositMetadata(USER_ADDRESS);
    console.log("\n📝 Deposit Metadata:");
    console.log("  Deposit Time:", metadata.depositTime.toString());
    console.log("  Unlock Time:", metadata.unlockTime.toString());
    console.log("  Challenge Type:", metadata.challengeType);
    console.log("  Has Active Deposit:", metadata.hasActiveDeposit);

  } catch (error: any) {
    console.error("❌ Error calling getUserDeposit:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
