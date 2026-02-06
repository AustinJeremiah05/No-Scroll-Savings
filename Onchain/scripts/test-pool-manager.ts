import { ethers } from "hardhat";

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";

async function main() {
  console.log("\n🧪 Testing Uniswap V4 PoolManager Basic Access");
  console.log("===============================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Caller:", deployer.address);

  // Get PoolManager with just the unlock function
  const poolManager = await ethers.getContractAt(
    [
      "function unlock(bytes calldata data) external returns (bytes memory)"
    ],
    POOL_MANAGER
  );

  console.log("\n📞 Testing PoolManager.unlock() with empty callback...");
  
  // Create a simple contract that implements IUnlockCallback
  const CallbackTest = await ethers.getContractFactory(`
    pragma solidity ^0.8.20;
    
    contract CallbackTest {
      address public poolManager;
      
      constructor(address _poolManager) {
        poolManager = _poolManager;
      }
      
      function test() external returns (bytes memory) {
        (bool success, bytes memory data) = poolManager.call(
          abi.encodeWithSignature("unlock(bytes)", "")
        );
        require(success, "Unlock failed");
        return data;
      }
      
      function unlockCallback(bytes calldata) external pure returns (bytes memory) {
        // Do nothing, just return
        return "";
      }
    }
  `);

  try {
    console.log("Deploying test contract...");
    const callback = await CallbackTest.deploy(POOL_MANAGER);
    await callback.waitForDeployment();
    const callbackAddress = await callback.getAddress();
    console.log(`✅ Test contract deployed: ${callbackAddress}\n`);

    console.log("📞 Calling test()...");
    const tx = await callback.test({
      gasLimit: 1000000
    });
    const receipt = await tx.wait();
    
    console.log("✅ Unlock test succeeded!");
    console.log(`⛽ Gas used: ${receipt?.gasUsed.toString()}\n`);
    console.log("💡 This confirms PoolManager is accessible and unlock pattern works.");
    
  } catch (error: any) {
    console.log("❌ Test failed!");
    console.log("Error:", error.message);
    
    if (error.message.includes("PoolNotInitialized")) {
      console.log("\n💡 Pool is not initialized. We need to initialize it first.");
    } else if (error.message.includes("0x")) {
      console.log("\n💡 Contract call reverted with data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
