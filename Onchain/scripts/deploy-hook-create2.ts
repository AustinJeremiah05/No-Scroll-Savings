import { ethers } from "hardhat";

/**
 * Deploy EmptyHook to a valid address using CREATE2 salt mining
 * V4 hooks MUST have address that matches their permission flags
 * For no-op hook: last 14 bits of address must be all zeros
 */

const POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";
const HOOK_MASK = 0x3FFF; // Last 14 bits (all hook flags)

async function main() {
  console.log("\n🔍 Mining valid hook address with CREATE2");
  console.log("========================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Get EmptyHook bytecode
  const EmptyHook = await ethers.getContractFactory("EmptyHook");
  const deployTx = EmptyHook.getDeployTransaction(POOL_MANAGER);
  const bytecode = deployTx.data as string;
  const initCodeHash = ethers.keccak256(bytecode);

  console.log("Bytecode hash:", initCodeHash);
  console.log("\n⛏️  Mining salt for valid hook address...");
  console.log("Target: last 14 bits = 0x0000 (no hooks enabled)\n");

  let salt = 0n;
  let validAddress: string | null = null;
  let attempts = 0;
  const maxAttempts = 1000000; // Try up to 1M salts

  const startTime = Date.now();

  while (attempts < maxAttempts) {
    // Calculate CREATE2 address
    // address = keccak256(0xff ++ deployer ++ salt ++ keccak256(bytecode))[12:]
    const create2Inputs = ethers.solidityPacked(
      ["bytes1", "address", "bytes32", "bytes32"],
      ["0xff", deployer.address, ethers.zeroPadValue(ethers.toBeHex(salt), 32), initCodeHash]
    );
    
    const hash = ethers.keccak256(create2Inputs);
    const address = "0x" + hash.slice(-40);
    
    // Check if last 14 bits are zero
    const addressNum = BigInt(address);
    if ((addressNum & BigInt(HOOK_MASK)) === 0n) {
      validAddress = ethers.getAddress(address);
      break;
    }
    
    salt++;
    attempts++;
    
    if (attempts % 10000 === 0) {
      process.stdout.write(`\r  Tried ${attempts.toLocaleString()} salts...`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n\n⏱️  Completed in ${elapsed}s (${attempts.toLocaleString()} attempts)\n`);

  if (!validAddress) {
    console.log("❌ Could not find valid address in", maxAttempts, "attempts");
    console.log("This is very unlikely - try increasing maxAttempts");
    process.exit(1);
  }

  console.log("✅ Found valid hook address!");
  console.log("Address:", validAddress);
  console.log("Salt:", "0x" + salt.toString(16).padStart(64, '0'));
  
  // Verify the address flags
  const addressNum = BigInt(validAddress);
  const flags = addressNum & BigInt(HOOK_MASK);
  console.log("Hook flags:", "0x" + flags.toString(16).padStart(4, '0'), "(should be 0x0000)");

  // Deploy with the found salt
  console.log("\n📦 Deploying EmptyHook with CREATE2...");
  
  // We need a factory contract that can deploy with CREATE2
  // For now, just output the salt and address
  console.log("\n⚠️  Manual deployment required:");
  console.log("1. Deploy a CREATE2 factory if you don't have one");
  console.log("2. Use the factory to deploy EmptyHook with the salt found above");
  console.log("3. Verify the deployed address matches:", validAddress);
  
  console.log("\n💡 Alternative: Use Uniswap's hook deployer or a CREATE2 factory");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
