import { ethers } from "hardhat";

const AGENT_ADDRESS = "0xC495b58c8BfFfe9c247993b8833eF610d5570609";
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const TREASURY_MANAGER = "0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9";

async function main() {
  console.log("\n🧪 Testing UniswapV4Agent.depositLiquidity() directly");
  console.log("=====================================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Caller:", deployer.address);

  // Get contracts
  const agent = await ethers.getContractAt("UniswapV4Agent", AGENT_ADDRESS);
  const usdc = await ethers.getContractAt("IERC20", USDC);
  const treasury = await ethers.getContractAt("TreasuryManager", TREASURY_MANAGER);

  // Check configuration
  console.log("\n📋 Configuration:");
  const treasuryMgr = await agent.treasuryManager();
  console.log(`Agent's treasuryManager: ${treasuryMgr}`);
  console.log(`Expected: ${TREASURY_MANAGER}`);
  console.log(`Match: ${treasuryMgr.toLowerCase() === TREASURY_MANAGER.toLowerCase() ? "✅" : "❌"}\n`);

  // Check balances
  const treasuryBalance = await usdc.balanceOf(TREASURY_MANAGER);
  const agentBalance = await usdc.balanceOf(AGENT_ADDRESS);
  console.log(`TreasuryManager USDC: ${ethers.formatUnits(treasuryBalance, 6)} USDC`);
  console.log(`Agent USDC: ${ethers.formatUnits(agentBalance, 6)} USDC\n`);

  // Test 1: Transfer USDC to agent manually and try depositLiquidity
  console.log("🧪 Test 1: Direct USDC transfer + approval");
  const testAmount = ethers.parseUnits("5", 6);
  
  // Transfer USDC from treasury to agent
  console.log("Transferring 5 USDC from Treasury to Agent...");
  try {
    const transferTx = await treasury.withdrawFunds(testAmount);
    await transferTx.wait();
    console.log("✅ USDC transferred to backend");
    
    // Now approve agent
    const approveTx = await usdc.approve(AGENT_ADDRESS, testAmount);
    await approveTx.wait();
    console.log("✅ USDC approved for Agent");
    
    // Try to deposit
    console.log("\n🚀 Calling agent.depositLiquidity(5 USDC)...");
    const depositTx = await agent.depositLiquidity(testAmount, {
      gasLimit: 5000000
    });
    console.log("✅ Transaction sent:", depositTx.hash);
    
    const receipt = await depositTx.wait();
    console.log("✅ Transaction confirmed!");
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    
    // Check final balances
    const agentBalanceAfter = await usdc.balanceOf(AGENT_ADDRESS);
    const totalDeployed = await agent.totalDeployed();
    console.log(`\n📊 Results:`);
    console.log(`   Agent USDC balance: ${ethers.formatUnits(agentBalanceAfter, 6)} USDC`);
    console.log(`   Total deployed: ${ethers.formatUnits(totalDeployed, 6)} USDC`);
    
  } catch (error: any) {
    console.log("❌ Failed!");
    console.log("\nError:", error.message);
    
    if (error.data) {
      console.log("Error data:", error.data);
    }
    
    // Try static call for more details
    console.log("\n🔍 Trying static call...");
    try {
      await agent.depositLiquidity.staticCall(testAmount);
      console.log("Static call succeeded (weird!)");
    } catch (staticError: any) {
      console.log("Static call also failed:");
      console.log(staticError.message);
      if (staticError.data) {
        console.log("Static error data:", staticError.data);
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
