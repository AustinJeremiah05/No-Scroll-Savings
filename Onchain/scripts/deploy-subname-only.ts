import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("============================================================");
  console.log("Deploying SubnameRegistry to Arc Testnet");
  console.log("============================================================\n");
  console.log("Deployer address:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  console.log("Deploying SubnameRegistry contract...\n");
  
  const SubnameRegistry = await ethers.getContractFactory("SubnameRegistry");
  const subnameRegistry = await SubnameRegistry.deploy();
  
  console.log("Waiting for deployment transaction...");
  await subnameRegistry.waitForDeployment();
  
  const subnameRegistryAddress = await subnameRegistry.getAddress();
  
  console.log("\n============================================================");
  console.log("Deployment Successful!");
  console.log("============================================================\n");
  console.log("Contract Address:");
  console.log("  SubnameRegistry:", subnameRegistryAddress);
  console.log("\nNetwork: Arc Testnet (Chain ID: 5042002)");
  console.log("Deployer:", deployer.address);
  console.log("\n============================================================");
  console.log("Next Steps:");
  console.log("============================================================\n");
  console.log("1. Add to frontend/.env.local:");
  console.log("  NEXT_PUBLIC_SUBNAME_REGISTRY_ADDRESS=" + subnameRegistryAddress);
  console.log("\n2. Verify contract:");
  console.log("  npx hardhat verify --network arc", subnameRegistryAddress);
  console.log("\n============================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nDeployment Failed:", error.message);
    process.exit(1);
  });
