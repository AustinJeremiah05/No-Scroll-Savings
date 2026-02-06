import { ethers } from "hardhat";

const AGENT_ADDRESS = "0xBABe158C1c2B674dD31bb404A2A2Ec1f144a57B6";
const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

async function main() {
  console.log("\n🧪 Testing unlock callback flow");
  console.log("=================================\n");

  const [deployer] = await ethers.getSigners();
  
  //  Get contracts 
  const agent = await ethers.getContractAt("UniswapV4Agent", AGENT_ADDRESS);
  const usdc = await ethers.getContractAt("IERC20", USDC);
  
  // Check tick configuration
  const tickLower = await agent.TICK_LOWER();
  const tickUpper = await agent.TICK_UPPER();
  console.log(`Tick range: ${tickLower} to ${tickUpper}`);
  
  // Check if they're multiples of tickSpacing (200)
  const isLowerValid = tickLower % 200n === 0n;
  const isUpperValid = tickUpper % 200n === 0n;
  console.log(`Tick lower valid (divisible by 200): ${isLowerValid ? "✅" : "❌"}`);
  console.log(`Tick upper valid (divisible by 200): ${isUpperValid ? "✅" : "❌"}\n`);

  // Transfer 5 USDC to agent directly for testing
  console.log("📤 Transferring 5 USDC to agent for testing...");
  const amount = ethers.parseUnits("5", 6);
  
  const balance = await usdc.balanceOf(deployer.address);
  console.log(`Deployer USDC balance: ${ethers.formatUnits(balance, 6)} USDC`);
  
  if (balance < amount) {
    console.log("❌ Insufficient USDC to test");
    return;
  }
            
  const tx1 = await usdc.transfer(AGENT_ADDRESS, amount);
  await tx1.wait();
  console.log("✅ Transfer complete\n");

  //  Check agent now holds USDC
  const agentBalance = await usdc.balanceOf(AGENT_ADDRESS);
  console.log(`Agent USDC balance: ${ethers.formatUnits(agentBalance, 6)} USDC\n`);

  // Try calling the internal _addLiquidityToUniswap function via depositLiquidity
  // This would fail with "Only treasury" but we can see if unlock pattern works
  console.log("📞 Attempting to call depositLiquidity (will fail with 'Only treasury')...");
  
  try {
    await agent.depositLiquidity.staticCall(amount);
    console.log("✅ Static call succeeded!");
  } catch (error: any) {
    console.error("❌ Static call failed:");
    console.error("Error:", error.message.slice(0, 200));
    
    if (error.data) {
      console.log(`Error data: ${error.data.slice(0, 100)}...`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
