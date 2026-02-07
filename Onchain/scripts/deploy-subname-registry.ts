import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts to Arc Testnet with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
  
  // Arc Testnet USDC address (you need to update this)
  const ARC_USDC = process.env.ARC_USDC_ADDRESS || "0x...";
  
  if (ARC_USDC === "0x...") {
    throw new Error("Please set ARC_USDC_ADDRESS in .env file");
  }
  
  console.log("\n=== Deploying ChallengeTracker ===");
  const ChallengeTracker = await ethers.getContractFactory("ChallengeTracker");
  const challengeTracker = await ChallengeTracker.deploy(deployer.address);
  await challengeTracker.waitForDeployment();
  const challengeTrackerAddress = await challengeTracker.getAddress();
  console.log("ChallengeTracker deployed to:", challengeTrackerAddress);
  
  console.log("\n=== Deploying LotteryEngine ===");
  const LotteryEngine = await ethers.getContractFactory("LotteryEngine");
  const lotteryEngine = await LotteryEngine.deploy(ARC_USDC, deployer.address);
  await lotteryEngine.waitForDeployment();
  const lotteryEngineAddress = await lotteryEngine.getAddress();
  console.log("LotteryEngine deployed to:", lotteryEngineAddress);
  
  console.log("\n=== Deploying SavingsVault ===");
  const SavingsVault = await ethers.getContractFactory("SavingsVault");
  const savingsVault = await SavingsVault.deploy(ARC_USDC, deployer.address);
  await savingsVault.waitForDeployment();
  const savingsVaultAddress = await savingsVault.getAddress();
  console.log("SavingsVault deployed to:", savingsVaultAddress);
  
  console.log("\n=== Setting up contract connections ===");
  
  // Set SavingsVault in ChallengeTracker
  let tx = await challengeTracker.setSavingsVault(savingsVaultAddress);
  await tx.wait();
  console.log("✓ ChallengeTracker.setSavingsVault()");
  
  // Set ChallengeTracker in SavingsVault
  tx = await savingsVault.setChallengeTracker(challengeTrackerAddress);
  await tx.wait();
  console.log("✓ SavingsVault.setChallengeTracker()");
  
  // Set LotteryEngine in SavingsVault
  tx = await savingsVault.setLotteryEngine(lotteryEngineAddress);
  await tx.wait();
  console.log("✓ SavingsVault.setLotteryEngine()");
  
  // Set SavingsVault in LotteryEngine
  tx = await lotteryEngine.setSavingsVault(savingsVaultAddress);
  await tx.wait();
  console.log("✓ LotteryEngine.setSavingsVault()");
  
  // Set ChallengeTracker in LotteryEngine
  tx = await lotteryEngine.setChallengeTracker(challengeTrackerAddress);
  await tx.wait();
  console.log("✓ LotteryEngine.setChallengeTracker()");
  
  // Set Backend address if provided
  const backendAddress = process.env.BACKEND_ADDRESS;
  if (backendAddress && backendAddress !== "0x...") {
    tx = await savingsVault.setBackend(backendAddress);
    await tx.wait();
    console.log("✓ SavingsVault.setBackend()");
  }
  
  console.log("\n=== Deployment Summary ===");
  console.log("Network: Arc Testnet (Chain ID: 5042002)");
  console.log("USDC Token:", ARC_USDC);
  console.log("ChallengeTracker:", challengeTrackerAddress);
  console.log("LotteryEngine:", lotteryEngineAddress);
  console.log("SavingsVault:", savingsVaultAddress);
  console.log("Deployer:", deployer.address);
  if (backendAddress) console.log("Backend:", backendAddress);
  
  console.log("\n=== Next Steps ===");
  console.log("1. Save these addresses in your .env file");
  console.log("2. Update your backend with these contract addresses");
  console.log("3. Verify contracts on Arc Explorer if needed");
  console.log("\nVerification commands:");
  console.log(`npx hardhat verify --network arc ${challengeTrackerAddress} "${deployer.address}"`);
  console.log(`npx hardhat verify --network arc ${lotteryEngineAddress} "${ARC_USDC}" "${deployer.address}"`);
  console.log(`npx hardhat verify --network arc ${savingsVaultAddress} "${ARC_USDC}" "${deployer.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
