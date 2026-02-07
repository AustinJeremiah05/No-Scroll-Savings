import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=== Test Withdrawal Flow (Arc → User Gets USDC Back) ===\n");
  console.log("Deployer/User:", deployer.address);
  
  const SAVINGS_VAULT_ARC = "0xe85486A9bAF78B4A27Fe4D20f062Ae5d6AcE7b2D";
  const USDC_ARC = "0x3600000000000000000000000000000000000000";
  
  // Get contracts
  const SavingsVault = await ethers.getContractFactory("SavingsVault");
  const savingsVault = SavingsVault.attach(SAVINGS_VAULT_ARC);
  
  const usdcAbi = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function approve(address,uint256) returns (bool)"
  ];
  const usdc = await ethers.getContractAt(usdcAbi, USDC_ARC);
  
  // Check user's deposit info
  console.log("📊 Checking your deposit...");
  try {
    const deposit = await savingsVault.getUserDeposit(deployer.address);
    const shares = deposit[0];
    const assets = deposit[1];
    const unlockTime = deposit[3];
    
    console.log(`   Shares: ${ethers.formatUnits(shares, 6)}`);
    console.log(`   Assets: ${ethers.formatUnits(assets, 6)} USDC`);
    console.log(`   Unlock Time: ${new Date(Number(unlockTime) * 1000).toLocaleString()}`);
    console.log(`   Unlocked: ${Date.now() >= Number(unlockTime) * 1000 ? '✅ Yes' : '❌ Not yet'}\n`);
    
    if (shares === 0n) {
      console.log("❌ No deposit found. Please deposit first using the dashboard.\n");
      return;
    }
    
    // Check if unlocked
    if (Date.now() < Number(unlockTime) * 1000) {
      const waitTime = (Number(unlockTime) * 1000 - Date.now()) / 1000;
      console.log(`⏰ Deposit is still locked. Wait ${Math.ceil(waitTime)} seconds.\n`);
      console.log("Would you like to proceed anyway? The requestRedeem will revert if locked.\n");
    }
    
    // Step 1: Request Redemption
    console.log("🚀 Step 1: Requesting Redemption...");
    console.log(`   Redeeming ${ethers.formatUnits(shares, 6)} shares`);
    console.log(`   Expected USDC: ~${ethers.formatUnits(assets, 6)} + yield\n`);
    
    const tx1 = await savingsVault.requestRedeem(
      shares,
      deployer.address,
      deployer.address,
      11155111 // Sepolia chain ID for cross-chain data
    );
    console.log("   Transaction sent:", tx1.hash);
    
    const receipt1 = await tx1.wait();
    console.log("   ✅ Redemption requested! Block:", receipt1?.blockNumber);
    
    // Get request ID from event
    const redeemEvent = receipt1?.logs.find((log: any) => {
      try {
        const parsed = savingsVault.interface.parseLog(log);
        return parsed?.name === "RedeemRequested";
      } catch {
        return false;
      }
    });
    
    let requestId = "unknown";
    if (redeemEvent) {
      const parsed = savingsVault.interface.parseLog(redeemEvent);
      requestId = parsed?.args[0] || "unknown";
      console.log("   Request ID:", requestId);
    }
    
    console.log("\n📋 Next Steps:");
    console.log("   1. The CCTP bridge service will automatically:");
    console.log("      - Withdraw USDC from TreasuryManager (Sepolia)");
    console.log("      - Bridge it back to Arc via CCTP");
    console.log("      - Send USDC to SavingsVault on Arc");
    console.log("\n   2. Once bridging completes (wait ~1-2 min), claim your USDC:");
    console.log(`      npx hardhat run scripts/claim-redemption.ts --network arc`);
    console.log(`      (You'll need the Request ID: ${requestId})`);
    
    console.log("\n   3. Monitor CCTP bridge logs:");
    console.log("      cd UniSwap/cctp && npm start");
    
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.message.includes("is not locked")) {
      console.log("\nℹ️  Deposit is already unlocked or not locked yet.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
