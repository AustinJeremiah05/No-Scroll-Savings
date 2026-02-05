import { ethers } from "hardhat";

async function main() {
  const SAVINGS_VAULT = "0x9D416d7aeB87fd18b5fB46c2193Da9CCEbC51231";
  const CHALLENGE_TRACKER = "0x2B1A80A3CF8E690b7f69694fF100Bd5c85AF75DA";
  const LOTTERY_ENGINE = "0xA900eF9aB5907f178b6C562f044c896c42c31F7D";

  console.log("=== Verifying Contract Links ===\n");

  // Get SavingsVault
  const savingsVault = await ethers.getContractAt("SavingsVault", SAVINGS_VAULT);
  
  console.log("SavingsVault Configuration:");
  const challengeTrackerAddr = await savingsVault.challengeTracker();
  const lotteryEngineAddr = await savingsVault.lotteryEngine();
  const backendAddr = await savingsVault.backend();
  
  console.log("  Challenge Tracker:", challengeTrackerAddr);
  console.log("  Expected:", CHALLENGE_TRACKER);
  console.log("  Match:", challengeTrackerAddr.toLowerCase() === CHALLENGE_TRACKER.toLowerCase() ? "✓" : "✗");
  
  console.log("\n  Lottery Engine:", lotteryEngineAddr);
  console.log("  Expected:", LOTTERY_ENGINE);
  console.log("  Match:", lotteryEngineAddr.toLowerCase() === LOTTERY_ENGINE.toLowerCase() ? "✓" : "✗");
  
  console.log("\n  Backend:", backendAddr);
  console.log("  Is Set:", backendAddr !== ethers.ZeroAddress ? "✓" : "✗ (NOT SET)");

  // Get ChallengeTracker
  console.log("\nChallengeTracker Configuration:");
  const challengeTracker = await ethers.getContractAt("ChallengeTracker", CHALLENGE_TRACKER);
  const savingsVaultAddr = await challengeTracker.savingsVault();
  const oracleAddr = await challengeTracker.oracle();
  
  console.log("  Savings Vault:", savingsVaultAddr);
  console.log("  Expected:", SAVINGS_VAULT);
  console.log("  Match:", savingsVaultAddr.toLowerCase() === SAVINGS_VAULT.toLowerCase() ? "✓" : "✗");
  
  console.log("\n  Oracle:", oracleAddr);
  console.log("  Is Set:", oracleAddr !== ethers.ZeroAddress ? "✓" : "✗ (NOT SET)");

  // Get LotteryEngine
  console.log("\nLotteryEngine Configuration:");
  const lotteryEngine = await ethers.getContractAt("LotteryEngine", LOTTERY_ENGINE);
  const lotterySavingsVault = await lotteryEngine.savingsVault();
  const lotteryChallengeTracker = await lotteryEngine.challengeTracker();
  
  console.log("  Savings Vault:", lotterySavingsVault);
  console.log("  Expected:", SAVINGS_VAULT);
  console.log("  Match:", lotterySavingsVault.toLowerCase() === SAVINGS_VAULT.toLowerCase() ? "✓" : "✗");
  
  console.log("\n  Challenge Tracker:", lotteryChallengeTracker);
  console.log("  Expected:", CHALLENGE_TRACKER);
  console.log("  Match:", lotteryChallengeTracker.toLowerCase() === CHALLENGE_TRACKER.toLowerCase() ? "✓" : "✗");

  console.log("\n=== Summary ===");
  let allGood = true;
  
  if (challengeTrackerAddr.toLowerCase() !== CHALLENGE_TRACKER.toLowerCase()) {
    console.log("❌ SavingsVault.challengeTracker NOT SET correctly");
    allGood = false;
  }
  if (lotteryEngineAddr.toLowerCase() !== LOTTERY_ENGINE.toLowerCase()) {
    console.log("❌ SavingsVault.lotteryEngine NOT SET correctly");
    allGood = false;
  }
  if (backendAddr === ethers.ZeroAddress) {
    console.log("⚠️  SavingsVault.backend NOT SET");
  }
  if (savingsVaultAddr.toLowerCase() !== SAVINGS_VAULT.toLowerCase()) {
    console.log("❌ ChallengeTracker.savingsVault NOT SET correctly");
    allGood = false;
  }
  if (oracleAddr === ethers.ZeroAddress) {
    console.log("⚠️  ChallengeTracker.oracle NOT SET");
  }
  if (lotterySavingsVault.toLowerCase() !== SAVINGS_VAULT.toLowerCase()) {
    console.log("❌ LotteryEngine.savingsVault NOT SET correctly");
    allGood = false;
  }
  if (lotteryChallengeTracker.toLowerCase() !== CHALLENGE_TRACKER.toLowerCase()) {
    console.log("❌ LotteryEngine.challengeTracker NOT SET correctly");
    allGood = false;
  }
  
  if (allGood) {
    console.log("✅ All critical contract links are properly configured!");
  } else {
    console.log("\n❌ Some contracts are not linked correctly. Run deploy-arc.ts again to fix.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
