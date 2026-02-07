import { ethers } from "hardhat";

/**
 * Deploy EmptyHook using Nick's CREATE2 Factory
 * Universal deployer at: 0x4e59b44847b379578588920cA78FbF26c0B4956C
 * Mine salt to get hook address with last 14 bits = 0x0000
 */

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const CREATE2_FACTORY = "0x4e59b44847b379578588920cA78FbF26c0B4956C"; // Nick's Factory
const HOOK_MASK = 0x3FFF; // Last 14 bits

async function main() {
  console.log("\n⛏️  Mining valid hook address");
  console.log("========================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Get EmptyHook bytecode with constructor args
  const EmptyHook = await ethers.getContractFactory("EmptyHook");
  
  // Get bytecode and encode constructor args
  const bytecode = EmptyHook.bytecode;
  const encodedArgs = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address"],
    [POOL_MANAGER]
  );
  
  const initCode = bytecode + encodedArgs.slice(2); // Remove 0x from encoded args
  const initCodeHash = ethers.keccak256(initCode);

  console.log("Init code length:", ethers.dataLength(initCode), "bytes");
  console.log("Init code hash:", initCodeHash);

  console.log("\n⛏️  Mining salt (this may take a few seconds)...\n");

  let salt = 0n;
  let validAddress: string | null = null;
  let validSalt: string | null = null;
  const startTime = Date.now();
  const maxAttempts = 100000;

  for (let i = 0; i < maxAttempts; i++) {
    const saltBytes = ethers.zeroPadValue(ethers.toBeHex(salt), 32);
    
    // Calculate CREATE2 address: keccak256(0xff ++ factory ++ salt ++ keccak256(initCode))[12:]
    const create2Inputs = ethers.solidityPacked(
      ["bytes1", "address", "bytes32", "bytes32"],
      ["0xff", CREATE2_FACTORY, saltBytes, initCodeHash]
    );
    
    const hash = ethers.keccak256(create2Inputs);
    const address = "0x" + hash.slice(-40);
    const addressNum = BigInt(address);
    
    // Check if last 14 bits are zero
    if ((addressNum & BigInt(HOOK_MASK)) === 0n) {
      validAddress = ethers.getAddress(address);
      validSalt = saltBytes;
      break;
    }
    
    salt++;
    
    if (i % 1000 === 0) {
      process.stdout.write(`\r  Tried ${i.toLocaleString()} salts...`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n\n⏱️  Mining completed in ${elapsed}s\n`);

  if (!validAddress || !validSalt) {
    console.log("❌ Could not find valid address in", maxAttempts, "attempts");
    console.log("💡 Try increasing maxAttempts or using a different approach");
    process.exit(1);
  }

  console.log("✅ Found valid hook address!");
  console.log("Address:", validAddress);
  console.log("Salt:", validSalt);
  console.log("Attempts:", salt.toString());
  
  // Verify
  const addressNum = BigInt(validAddress);
  const flags = addressNum & BigInt(HOOK_MASK);
  console.log("\n Verification:");
  console.log("  Last 14 bits:", "0x" + flags.toString(16).padStart(4, '0'), "✓");

  // Deploy using CREATE2 factory
  console.log("\n📦 Deploying EmptyHook...");
  
  const factory = await ethers.getContractAt(
    ["function deploy(bytes memory _initCode, bytes32 _salt) public returns (address)"],
    CREATE2_FACTORY
  );

  const tx = await factory.deploy(initCode, validSalt, {
    gasLimit: 2000000
  });
  
  console.log("Transaction hash:", tx.hash);
  console.log("⏳ Waiting for confirmation...\n");
  
  const receipt = await tx.wait();
  console.log("✅ Deployed!");
  console.log("Gas used:", receipt.gasUsed.toString());

  // Verify the deployed address matches
  const code = await ethers.provider.getCode(validAddress);
  if (code === "0x") {
    console.log("\n❌ ERROR: No code at expected address!");
    console.log("Something went wrong with CREATE2 deployment");
    process.exit(1);
  }

  console.log("\n=== Deployment Summary ===");
  console.log("EmptyHook address:", validAddress);
  console.log("Salt used:", validSalt);
  console.log("Factory:", CREATE2_FACTORY);
  console.log("PoolManager:", POOL_MANAGER);
  
  console.log("\n=== Next Steps ===");
  console.log("1. Update UniswapV4Agent.sol line 107 to use:", validAddress);
  console.log("2. Update initialize-pool-v4.ts to use:", validAddress);
  console.log("3. Redeploy UniswapV4Agent");
  console.log("4. Try pool initialization");
  
  console.log("\n=== Verification Command ===");
  console.log(`npx hardhat verify --network sepolia --constructor-args scripts/verify-hook-args.js ${validAddress}`);
  console.log("\nCreate verify-hook-args.js with:");
  console.log(`module.exports = ["${POOL_MANAGER}"];`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
