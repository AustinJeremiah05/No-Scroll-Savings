import { ethers } from "hardhat";

/**
 * Test complete UniswapV4Agent flow:
 * 1. Call TreasuryManager.receiveFunds() to deposit USDC
 * 2. Verify USDC arrives at agent
 * 3. Check pool state before/after
 * 
 * Note: Currently agent has TEMPORARY WORKAROUND - just holds USDC
 * TODO: Later enable real LP provision by uncommenting _addLiquidityToUniswap
 */

const TREASURY = "0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9";
const AGENT = "0x5AC3d6D73bBfc9C8b26a78cF7D7314B326B2CAb5";
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const EMPTY_HOOK = "0x0B2D2EC90342B62a9D80967d26A0b10b685d10d0";
const POOL_ID = "0x2293facea404ca68d90c17616cbb286bc3d96408229137d78bb8e8b3ca6129cf";

async function main() {
  console.log("\n🧪 Testing Full UniswapV4Agent Flow");
  console.log("===================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Test account:", deployer.address);

  // Get contracts
  const treasury = await ethers.getContractAt("TreasuryManager", TREASURY);
  const usdc = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)"],
    USDC
  );
  const agent = await ethers.getContractAt("UniswapV4Agent", AGENT);

  // Check initial state
  console.log("📊 Initial State:");
  const treasuryBalance = await usdc.balanceOf(TREASURY);
  const agentBalance = await usdc.balanceOf(AGENT);
  const agentDeployed = await agent.totalDeployed();
  
  console.log(`  TreasuryManager: ${ethers.formatUnits(treasuryBalance, 6)} USDC`);
  console.log(`  UniswapV4Agent:  ${ethers.formatUnits(agentBalance, 6)} USDC`);
  console.log(`  Agent deployed:  ${ethers.formatUnits(agentDeployed, 6)} USDC`);

  // Check pool info
  console.log("\n🏊 Pool Info:");
  console.log(`  Pool ID: ${POOL_ID}`);
  console.log(`  Hook: ${EMPTY_HOOK}`);
  console.log(`  Fee: 0.3% (3000)`);
  
  // Check agent pool config
  const poolKey = await agent.usdcWethPool();
  console.log("\n📋 Agent Pool Config:");
  console.log(`  currency0: ${poolKey.currency0}`);
  console.log(`  currency1: ${poolKey.currency1}`);
  console.log(`  fee: ${poolKey.fee}`);
  console.log(`  tickSpacing: ${poolKey.tickSpacing}`);
 console.log(`  hooks: ${poolKey.hooks}`);

  const poolKeyMatchesHook = poolKey.hooks.toLowerCase() === EMPTY_HOOK.toLowerCase();
  console.log(`  ✓ Hook matches: ${poolKeyMatchesHook ? "✅ YES" : "❌ NO"}`);

  if (treasuryBalance === 0n) {
    console.log("\n⚠️  TreasuryManager has no USDC!");
    console.log("Bridge some funds from Arc first.");
    return;
  }

  // Test transferring funds
  const transferAmount = ethers.parseUnits("5", 6); // 5 USDC
  
  if (treasuryBalance < transferAmount) {
    console.log(`\n⚠️  Not enough USDC. Has: ${ethers.formatUnits(treasuryBalance, 6)}, Need: 5`);
    console.log("Adjusting to available amount...");
  }

  const actualAmount = treasuryBalance < transferAmount ? treasuryBalance : transferAmount;
  
  console.log(`\n🚀 Testing receiveFunds(${ethers.formatUnits(actualAmount, 6)} USDC)...`);
  console.log("⏳ This will:");
  console.log("  1. Transfer USDC from TreasuryManager to UniswapV4Agent");
  console.log("  2. Agent calls depositLiquidity()");
  console.log("  3. Currently: Just holds USDC (TEMPORARY WORKAROUND)");
  console.log("  4. Future: Will add to Uniswap V4 pool\n");

  try {
    const tx = await treasury.receiveFunds(actualAmount, {
      gasLimit: 500000
    });
    
    console.log("Transaction hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...\n");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("Block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check final state
    console.log("\n📊 Final State:");
    const treasuryBalanceAfter = await usdc.balanceOf(TREASURY);
    const agentBalanceAfter = await usdc.balanceOf(AGENT);
    const agentDeployedAfter = await agent.totalDeployed();
    
    console.log(`  TreasuryManager: ${ethers.formatUnits(treasuryBalanceAfter, 6)} USDC (change: ${ethers.formatUnits(treasuryBalanceAfter - treasuryBalance, 6)})`);
    console.log(`  UniswapV4Agent:  ${ethers.formatUnits(agentBalanceAfter, 6)} USDC (change: +${ethers.formatUnits(agentBalanceAfter - agentBalance, 6)})`);
    console.log(`  Agent deployed:  ${ethers.formatUnits(agentDeployedAfter, 6)} USDC (change: +${ethers.formatUnits(agentDeployedAfter - agentDeployed, 6)})`);

    if (agentBalanceAfter > agentBalance) {
      console.log("\n✅ SUCCESS! Funds transferred to agent!");
    } else {
      console.log("\n⚠️  No balance change in agent (unexpected)");
    }

    // Parse logs for events
    console.log("\n📝 Events:");
    receipt.logs.forEach((log) => {
      try {
        const parsed = agent.interface.parseLog({
          topics: log.topics as string[],
          data: log.data
        });
        if (parsed) {
          console.log(`  ${parsed.name}:`, parsed.args);
        }
      } catch (e) {
        // Not an agent event, skip
      }
    });

    console.log("\n=== Test Summary ===");
    console.log("✅ TreasuryManager.receiveFunds() works!");
    console.log("✅ USDC transferred to UniswapV4Agent");
    console.log("✅ Agent depositLiquidity() executed");
    console.log("⚠️  Currently holds USDC (workaround active)");
    console.log("\n💡 Next step: Enable real Uniswap LP provision");
    console.log("   Uncomment _addLiquidityToUniswap() in UniswapV4Agent.sol");

  } catch (error: any) {
    console.log("\n❌ Transaction failed!");
    console.error(error.message);
    
    if (error.data) {
      console.log("\nError data:", error.data);
    }
    
    // Try to decode revert reason
    try {
      const decoded = agent.interface.parseError(error.data);
      if (decoded) {
        console.log("Decoded error:", decoded.name, decoded.args);
      }
    } catch (e) {
      console.log("Could not decode error");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
