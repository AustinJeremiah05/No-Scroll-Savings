import { ethers } from "hardhat";

async function main() {
  const SAVINGS_VAULT = "0x9D416d7aeB87fd18b5fB46c2193Da9CCEbC51231";
  const CHALLENGE_TRACKER = "0x2B1A80A3CF8E690b7f69694fF100Bd5c85AF75DA";
  const LOTTERY_ENGINE = "0xA900eF9aB5907f178b6C562f044c896c42c31F7D";

  console.log("=== Fixing Contract Links ===\n");

  const savingsVault = await ethers.getContractAt("SavingsVault", SAVINGS_VAULT);

  console.log("Setting ChallengeTracker in SavingsVault...");
  let tx = await savingsVault.setChallengeTracker(CHALLENGE_TRACKER);
  await tx.wait();
  console.log("✓ ChallengeTracker set:", CHALLENGE_TRACKER);

  console.log("\nSetting LotteryEngine in SavingsVault...");
  tx = await savingsVault.setLotteryEngine(LOTTERY_ENGINE);
  await tx.wait();
  console.log("✓ LotteryEngine set:", LOTTERY_ENGINE);

  console.log("\n=== Verification ===");
  const challengeTrackerAddr = await savingsVault.challengeTracker();
  const lotteryEngineAddr = await savingsVault.lotteryEngine();

  console.log("Challenge Tracker:", challengeTrackerAddr);
  console.log("Lottery Engine:", lotteryEngineAddr);
  console.log("\n✅ All links fixed! You can now deposit.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
