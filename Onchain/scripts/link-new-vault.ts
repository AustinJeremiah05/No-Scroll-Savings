import { ethers } from "hardhat";

const NEW_SAVINGS_VAULT = "0xCB3E804A79BB7060A459b2f2D4E118cCA93a61eD";
const CHALLENGE_TRACKER = "0x2B1A80A3CF8E690b7f69694fF100Bd5c85AF75DA";
const LOTTERY_ENGINE = "0xA900eF9aB5907f178b6C562f044c896c42c31F7D";

async function main() {
  console.log("🔗 Linking new SavingsVault to ChallengeTracker and LotteryEngine...\n");

  // Link ChallengeTracker
  console.log("Updating ChallengeTracker...");
  const challengeTracker = await ethers.getContractAt("ChallengeTracker", CHALLENGE_TRACKER);
  const tx1 = await challengeTracker.setSavingsVault(NEW_SAVINGS_VAULT);
  await tx1.wait();
  console.log("✅ ChallengeTracker.setSavingsVault() completed\n");

  // Link LotteryEngine
  console.log("Updating LotteryEngine...");
  const lotteryEngine = await ethers.getContractAt("LotteryEngine", LOTTERY_ENGINE);
  const tx2 = await lotteryEngine.setSavingsVault(NEW_SAVINGS_VAULT);
  await tx2.wait();
  console.log("✅ LotteryEngine.setSavingsVault() completed\n");

  // Verify
  console.log("🔍 Verifying links...");
  const ctVault = await challengeTracker.savingsVault();
  const leVault = await lotteryEngine.savingsVault();
  
  console.log(`ChallengeTracker.savingsVault: ${ctVault}`);
  console.log(`LotteryEngine.savingsVault: ${leVault}`);
  
  if (ctVault === NEW_SAVINGS_VAULT && leVault === NEW_SAVINGS_VAULT) {
    console.log("\n✅ All contracts successfully linked!");
  } else {
    console.log("\n❌ Verification failed!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
