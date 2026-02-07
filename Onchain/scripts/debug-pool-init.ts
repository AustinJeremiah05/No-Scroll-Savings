import { ethers } from "hardhat";

/**
 * Check what went wrong with pool initialization
 * Decode the revert reason from the failed transaction
 */

const TX_HASH = "0x76ead5807b214699e409760e157a0df32f1f5b1dd127221b6d55e6e2560571c7";
const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
const EMPTY_HOOK = "0x475c0C39652Ec99EAa1C15e410953000c75aa986";

async function main() {
  console.log("\n🔍 Debugging Pool Initialization Failure");
  console.log("========================================\n");

  const provider = ethers.provider;

  // Get transaction receipt
  console.log("Transaction:", TX_HASH);
  const receipt = await provider.getTransactionReceipt(TX_HASH);
  
  if (!receipt) {
    console.log("❌ Transaction not found");
    return;
  }

  console.log("Status:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Block:", receipt.blockNumber);

  // Try to decode revert reason by simulating the call
  const poolManager = await ethers.getContractAt(
    [
      "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24 tick)",
      "function extsload(bytes32 slot) external view returns (bytes32)"
    ],
    POOL_MANAGER
  );

  const poolKey = {
    currency0: USDC,
    currency1: WETH,
    fee: 3000,
    tickSpacing: 60,
    hooks: EMPTY_HOOK
  };

  const sqrtPriceX96 = BigInt("79228162514264337593543950336");

  console.log("\n🧪 Re-simulating call to get revert reason...");
  try {
    // This should fail and give us the revert reason
    await poolManager.initialize.staticCall(poolKey, sqrtPriceX96);
    console.log("❓ Call succeeded (unexpected)");
  } catch (error: any) {
    console.log("\n❌ Revert reason found:");
    
    if (error.data) {
      console.log("Error data:", error.data);
      
      // Try to decode common Uniswap errors
      const errorSelectors: any = {
        "0x7c1f8113": "HookAddressNotValid(address)",
        "0x6f961a09": "PoolNotInitialized()",
        "0x85447f1e": "ManagerLocked()",
        "0x40a623c3": "CurrencyNotSettled()",
        "0x7dc7a0d9": "SwapAmountCannotBeZero()",
        "0x2ef2f8b1": "InvalidCaller()",
        "0xf5c5ad5c": "DelegateCallNotAllowed()",
        "0x6c9bbf34": "AlreadyUnlocked()",
        "0x02ddb5c9": "UnauthorizedDynamicLPFeeUpdate()",
      };
      
      const selector = error.data.slice(0, 10);
      if (errorSelectors[selector]) {
        console.log("Known error:", errorSelectors[selector]);
      } else {
        console.log("Unknown error selector:", selector);
      }
    }
    
    console.log("\nFull error:");
    console.log(error.message);
    
    // Additional error details
    if (error.reason) {
      console.log("\nReason:", error.reason);
    }
  }

  // Check hook address validity
  console.log("\n🪝 Checking hook address requirements...");
  const hookAddr = BigInt(EMPTY_HOOK);
  const lastBits = hookAddr & BigInt(0x3FFF); // Last 14 bits
  console.log("Hook address:", EMPTY_HOOK);
  console.log("Last 14 bits:", "0x" + lastBits.toString(16).padStart(4, '0'));
  console.log("Binary:", lastBits.toString(2).padStart(14, '0'));
  
  if (lastBits !== 0n) {
    console.log("\n⚠️  PROBLEM: Hook address has permission bits set!");
    console.log("   V4 requires address bits to match hook permissions.");
    console.log("   For no-op hook, last 14 bits should be 0x0000.");
    console.log("\n   Current bits interpretation:");
    const flags = [
      { bit: 13, name: "beforeInitialize" },
      { bit: 12, name: "afterInitialize" },
      { bit: 11, name: "beforeAddLiquidity" },
      { bit: 10, name: "afterAddLiquidity" },
      { bit: 9, name: "beforeRemoveLiquidity" },
      { bit: 8, name: "afterRemoveLiquidity" },
      { bit: 7, name: "beforeSwap" },
      { bit: 6, name: "afterSwap" },
      { bit: 5, name: "beforeDonate" },
      { bit: 4, name: "afterDonate" },
      { bit: 3, name: "beforeSwapReturnsDelta" },
      { bit: 2, name: "afterSwapReturnsDelta" },
      { bit: 1, name: "afterAddLiquidityReturnsDelta" },
      { bit: 0, name: "afterRemoveLiquidityReturnsDelta" },
    ];
    
    flags.forEach(({ bit, name }) => {
      const isSet = (lastBits & (1n << BigInt(bit))) !== 0n;
      if (isSet) {
        console.log(`   ✓ ${name} (bit ${bit})`);
      }
    });
  } else {
    console.log("✅ Hook address has valid permission bits (all zeros)");
  }

  // Try checking if pool already exists
  console.log("\n🏊 Checking pool state...");
  try {
    // Calculate pool ID
    const poolIdRaw = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24", "int24", "address"],
        [USDC, WETH, 3000, 60, EMPTY_HOOK]
      )
    );
    console.log("Pool ID:", poolIdRaw);
    
    // Try to read slot0
    const slot0Data = await poolManager.extsload(poolIdRaw);
    console.log("Slot0 data:", slot0Data);
    
    if (slot0Data !== ethers.ZeroHash) {
      console.log("⚠️  Pool may already be initialized! (non-zero data)");
    } else {
      console.log("Pool not initialized (zero data)");
    }
  } catch (error: any) {
    console.log("Could not check pool state:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
