import { ethers } from "hardhat";

const AGENT_ADDRESS = "0xBABe158C1c2B674dD31bb404A2A2Ec1f144a57B6";
const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const TREASURY_MANAGER = "0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9";

async function main() {
  console.log("\n🧪 Testing depositLiquidity() directly");
  console.log("========================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Caller:", deployer.address);

  const agent = await ethers.getContractAt("UniswapV4Agent", AGENT_ADDRESS);
  const usdc = await ethers.getContractAt("IERC20", USDC_SEPOLIA);

  // Check approval
  const allowance = await usdc.allowance(TREASURY_MANAGER, AGENT_ADDRESS);
  console.log(`TreasuryManager → Agent allowance: ${ethers.formatUnits(allowance, 6)} USDC\n`);

  // Get TreasuryManager balance
  const balance = await usdc.balanceOf(TREASURY_MANAGER);
  console.log(`TreasuryManager USDC balance: ${ethers.formatUnits(balance, 6)} USDC\n`);

  // Test depositLiquidity with 5 USDC
  const amount = ethers.parseUnits("5", 6);
  
  console.log(`📞 Testing depositLiquidity(${ethers.formatUnits(amount, 6)} USDC)...`);
  console.log("Note: This will fail because we're not calling from TreasuryManager\n");

  try {
    // This should fail with "Only treasury" error
    await agent.depositLiquidity.staticCall(amount);
    console.log("✅ Static call succeeded (unexpected!)");
  } catch (error: any) {
    console.error("❌ Static call failed (expected):");
    console.error("Error:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
      
      // Try to decode the error
      try {
        const iface = new ethers.Interface([
          "error ManagerLocked()",
          "function Error(string)"
        ]);
        const decoded = iface.parseError(error.data);
        console.error("Decoded error:", decoded);
      } catch (e) {
        // Couldn't decode
      }
    }
  }

  console.log("\n📊 Now testing via TreasuryManager.receiveFunds()...");
  const treasuryManager = await ethers.getContractAt("TreasuryManager", TREASURY_MANAGER);
  
  try {
    await treasuryManager.receiveFunds.staticCall(amount);
    console.log("✅ Static call to receiveFunds succeeded!");
  } catch (error: any) {
    console.error("\n❌ receiveFunds static call failed:");
    console.error("Error:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    
    // This is the ManagerLocked error - let's investigate why
    console.log("\n🔍 This suggests an issue in the unlock callback...");
    console.log("Possible causes:");
    console.log("1. PoolManager address is wrong");
    console.log("2. PoolKey configuration is incorrect");
    console.log("3. Pool doesn't exist on Uniswap");
    console.log("4. unlock callback implementation has a bug\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
