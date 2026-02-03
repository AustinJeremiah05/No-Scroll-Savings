import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts to Ethereum Sepolia with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
  
  // Sepolia USDC address (you need to update this)
  const SEPOLIA_USDC = process.env.SEPOLIA_USDC_ADDRESS || "0x...";
  const SEPOLIA_AAVE_POOL = process.env.SEPOLIA_AAVE_POOL || "0x...";
  
  if (SEPOLIA_USDC === "0x...") {
    throw new Error("Please set SEPOLIA_USDC_ADDRESS in .env file");
  }
  
  if (SEPOLIA_AAVE_POOL === "0x...") {
    console.warn("⚠ Warning: SEPOLIA_AAVE_POOL not set in .env file");
  }
  
  console.log("\n=== Deploying TreasuryManager ===");
  const TreasuryManager = await ethers.getContractFactory("TreasuryManager");
  const treasuryManager = await TreasuryManager.deploy(
    SEPOLIA_USDC,
    SEPOLIA_AAVE_POOL,
    deployer.address
  );
  await treasuryManager.waitForDeployment();
  const treasuryManagerAddress = await treasuryManager.getAddress();
  console.log("TreasuryManager deployed to:", treasuryManagerAddress);
  
  console.log("\n=== Setting up contract connections ===");
  
  // Set Backend address if provided
  const backendAddress = process.env.BACKEND_ADDRESS;
  if (backendAddress && backendAddress !== "0x...") {
    const tx = await treasuryManager.setBackend(backendAddress);
    await tx.wait();
    console.log("✓ TreasuryManager.setBackend()");
  } else {
    console.warn("⚠ Warning: BACKEND_ADDRESS not set in .env file");
  }
  
  console.log("\n=== Deployment Summary ===");
  console.log("Network: Ethereum Sepolia (Chain ID: 11155111)");
  console.log("USDC Token:", SEPOLIA_USDC);
  console.log("Aave Pool:", SEPOLIA_AAVE_POOL);
  console.log("TreasuryManager:", treasuryManagerAddress);
  console.log("Deployer:", deployer.address);
  if (backendAddress) console.log("Backend:", backendAddress);
  
  console.log("\n=== Next Steps ===");
  console.log("1. Save this address in your .env file");
  console.log("2. Update your backend with this contract address");
  console.log("3. Verify contract on Etherscan");
  console.log("4. Transfer USDC to TreasuryManager for testing");
  console.log("\nVerification command:");
  console.log(`npx hardhat verify --network sepolia ${treasuryManagerAddress} "${SEPOLIA_USDC}" "${SEPOLIA_AAVE_POOL}" "${deployer.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
