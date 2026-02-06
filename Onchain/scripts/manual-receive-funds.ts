import { ethers } from "hardhat";

const TREASURY_MANAGER = "0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9";
const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

async function main() {
  console.log("\n🚀 Manually calling receiveFunds() on TreasuryManager");
  console.log("================================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Caller:", deployer.address);

  // Get TreasuryManager contract
  const treasuryManager = await ethers.getContractAt(
    "TreasuryManager",
    TREASURY_MANAGER
  );

  // Get USDC contract to check balance
  const usdc = await ethers.getContractAt("IERC20", USDC_SEPOLIA);

  // Check TreasuryManager USDC balance
  const balance = await usdc.balanceOf(TREASURY_MANAGER);
  console.log(`TreasuryManager USDC balance: ${ethers.formatUnits(balance, 6)} USDC\n`);

  if (balance === 0n) {
    console.log("❌ No USDC in TreasuryManager to deploy");
    return;
  }

  // Use 5 USDC for testing (minimum deposit amount)
  const amountToDeploy = ethers.parseUnits("5", 6);
  if (balance < amountToDeploy) {
    console.log(`❌ Insufficient balance. Have:  ${ethers.formatUnits(balance, 6)} USDC, Need: 5 USDC`);
    return;
  }

  // Call receiveFunds with 5 USDC
  console.log(`📞 Calling receiveFunds(${ethers.formatUnits(amountToDeploy, 6)} USDC)...`);
  
  try {
    const tx = await treasuryManager.receiveFunds(amountToDeploy);
    console.log(`📝 Transaction hash: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...\n");

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);
    console.log(`⛽ Gas used: ${receipt?.gasUsed.toString()}\n`);

    // Check events
    const deployedEvent = receipt?.logs.find((log: any) => {
      try {
        const parsed = treasuryManager.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        return parsed?.name === "DeployedToUniswap";
      } catch {
        return false;
      }
    });

    if (deployedEvent) {
      console.log("✅ DeployedToUniswap event emitted!");
      console.log("💰 Liquidity deployed to Uniswap V4 successfully!\n");
    }

    // Check final state
    const totalInUniswap = await treasuryManager.totalInUniswap();
    console.log(`📊 Total in Uniswap: ${ethers.formatUnits(totalInUniswap, 6)} USDC`);
  } catch (error: any) {
    console.error("\n❌ Transaction failed!");
    console.error("Error:", error.message);
    
    // Try to get more details
    if (error.data) {
      console.error("Error data:", error.data);
    }
    
    // Try calling with static call to get revert reason
    try {
      console.log("\n🔍 Attempting static call to get revert reason...");
      await treasuryManager.receiveFunds.staticCall(amountToDeployoDeploy);
    } catch (staticError: any) {
      console.error("Static call error:", staticError.message);
      if (staticError.data) {
        console.error("Revert data:", staticError.data);
      }
    }
    
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
