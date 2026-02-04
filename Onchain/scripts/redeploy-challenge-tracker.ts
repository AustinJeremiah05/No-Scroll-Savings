import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Redeploying SavingsVault to Arc Testnet");
  console.log("Deployer account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
  
  // Arc Testnet USDC address
  const ARC_USDC = process.env.ARC_USDC_ADDRESS || "0x...";
  
  if (ARC_USDC === "0x...") {
    throw new Error("Please set ARC_USDC_ADDRESS in .env file");
  }
  
  console.log("\n=== Deploying SavingsVault ===");
  const SavingsVault = await ethers.getContractFactory("SavingsVault");
  const savingsVault = await SavingsVault.deploy(ARC_USDC, deployer.address);
  await savingsVault.waitForDeployment();
  const savingsVaultAddress = await savingsVault.getAddress();
  console.log("✓ SavingsVault deployed to:", savingsVaultAddress);
  
  // Link to existing contracts if available
  const existingChallengeTrackerAddress = process.env.ARC_CHALLENGE_TRACKER_ADDRESS;
  const existingLotteryEngineAddress = process.env.ARC_LOTTERY_ENGINE_ADDRESS;
  const backendAddress = process.env.BACKEND_ADDRESS;
  
  console.log("\n=== Linking Contracts ===");
  
  if (existingChallengeTrackerAddress && existingChallengeTrackerAddress !== "0x...") {
    let tx = await savingsVault.setChallengeTracker(existingChallengeTrackerAddress);
    await tx.wait();
    console.log("✓ SavingsVault.setChallengeTracker()");
  }
  
  if (existingLotteryEngineAddress && existingLotteryEngineAddress !== "0x...") {
    let tx = await savingsVault.setLotteryEngine(existingLotteryEngineAddress);
    await tx.wait();
    console.log("✓ SavingsVault.setLotteryEngine()");
  }
  
  if (backendAddress && backendAddress !== "0x...") {
    let tx = await savingsVault.setBackend(backendAddress);
    await tx.wait();
    console.log("✓ SavingsVault.setBackend()");
  }
  
  console.log("\n=== Deployment Complete ===");
  console.log("SavingsVault:", savingsVaultAddress);
  console.log("\nVerification command:");
  console.log(`npx hardhat verify --network arc ${savingsVaultAddress} "${ARC_USDC}" "${deployer.address}"`);
  
  console.log("\n⚠️  Don't forget to update other contracts:");
  console.log(`- ChallengeTracker.setSavingsVault("${savingsVaultAddress}")`);
  console.log(`- LotteryEngine.setSavingsVault("${savingsVaultAddress}")`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
