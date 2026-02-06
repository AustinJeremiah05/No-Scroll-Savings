import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying Treasury + Uniswap Stack to Ethereum Sepolia");
  console.log("Deployer account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
  
  // Configuration
  const SEPOLIA_USDC = process.env.SEPOLIA_USDC_ADDRESS || "0x...";
  const SEPOLIA_WETH = process.env.SEPOLIA_WETH_ADDRESS || "0x...";
  const SEPOLIA_AAVE_POOL = process.env.SEPOLIA_AAVE_POOL || "0x...";
  const SEPOLIA_UNISWAP_POOL_MANAGER = process.env.SEPOLIA_UNISWAP_POOL_MANAGER || "0x...";
  
  if (SEPOLIA_USDC === "0x...") {
    throw new Error("Please set SEPOLIA_USDC_ADDRESS in .env file");
  }
  
  if (SEPOLIA_WETH === "0x...") {
    throw new Error("Please set SEPOLIA_WETH_ADDRESS in .env file");
  }
  
  if (SEPOLIA_UNISWAP_POOL_MANAGER === "0x...") {
    throw new Error("Please set SEPOLIA_UNISWAP_POOL_MANAGER in .env file");
  }
  
  console.log("\n=== Deploying Uniswap V4 Infrastructure ===");
  
  // 1. Deploy NoScrollSavingsHook
  console.log("\n1. Deploying NoScrollSavingsHook...");
  const Hook = await ethers.getContractFactory("NoScrollSavingsHook");
  const hook = await Hook.deploy(
    ethers.ZeroAddress, // agent address (will be set later)
    deployer.address    // owner
  );
  await hook.waitForDeployment();
  const hookAddress = await hook.getAddress();
  console.log("✓ NoScrollSavingsHook deployed to:", hookAddress);
  
  // 2. Deploy YieldStrategyManager
  console.log("\n2. Deploying YieldStrategyManager...");
  const StrategyManager = await ethers.getContractFactory("YieldStrategyManager");
  const strategyManager = await StrategyManager.deploy(
    ethers.ZeroAddress, // agent address (will be set later)
    deployer.address    // owner
  );
  await strategyManager.waitForDeployment();
  const strategyManagerAddress = await strategyManager.getAddress();
  console.log("✓ YieldStrategyManager deployed to:", strategyManagerAddress);
  
  // 3. Deploy UniswapV4Agent
  console.log("\n3. Deploying UniswapV4Agent...");
  const UniswapAgent = await ethers.getContractFactory("UniswapV4Agent");
  const uniswapAgent = await UniswapAgent.deploy(
    SEPOLIA_USDC,
    SEPOLIA_UNISWAP_POOL_MANAGER,
    deployer.address,
    SEPOLIA_WETH
  );
  await uniswapAgent.waitForDeployment();
  const uniswapAgentAddress = await uniswapAgent.getAddress();
  console.log("✓ UniswapV4Agent deployed to:", uniswapAgentAddress);
  
  // 4. Deploy TreasuryManager
  console.log("\n4. Deploying TreasuryManager...");
  const TreasuryManager = await ethers.getContractFactory("TreasuryManager");
  const treasuryManager = await TreasuryManager.deploy(
    SEPOLIA_USDC,
    SEPOLIA_AAVE_POOL !== "0x..." ? SEPOLIA_AAVE_POOL : ethers.ZeroAddress,
    deployer.address
  );
  await treasuryManager.waitForDeployment();
  const treasuryManagerAddress = await treasuryManager.getAddress();
  console.log("✓ TreasuryManager deployed to:", treasuryManagerAddress);
  
  console.log("\n=== Linking Contracts ===");
  
  // Link Hook to Agent
  let tx = await hook.setAgent(uniswapAgentAddress);
  await tx.wait();
  console.log("✓ Hook.setAgent()");
  
  // Link StrategyManager to Agent
  tx = await strategyManager.setAgent(uniswapAgentAddress);
  await tx.wait();
  console.log("✓ StrategyManager.setAgent()");
  
  // Link Agent to Hook
  tx = await uniswapAgent.setHookContract(hookAddress);
  await tx.wait();
  console.log("✓ UniswapAgent.setHookContract()");
  
  // Link Agent to TreasuryManager
  tx = await uniswapAgent.setTreasuryManager(treasuryManagerAddress);
  await tx.wait();
  console.log("✓ UniswapAgent.setTreasuryManager()");
  
  // Link TreasuryManager to Agent
  tx = await treasuryManager.setUniswapV4Agent(uniswapAgentAddress);
  await tx.wait();
  console.log("✓ TreasuryManager.setUniswapV4Agent()");
  
  // Set Backend address if provided
  const backendAddress = process.env.BACKEND_ADDRESS;
  if (backendAddress && backendAddress !== "0x...") {
    tx = await treasuryManager.setBackend(backendAddress);
    await tx.wait();
    console.log("✓ TreasuryManager.setBackend()");
  }
  
  console.log("\n=== Deployment Summary ===");
  console.log("Network: Ethereum Sepolia (Chain ID: 11155111)");
  console.log("\nConfiguration:");
  console.log("  USDC Token:", SEPOLIA_USDC);
  console.log("  WETH Token:", SEPOLIA_WETH);
  console.log("  Aave Pool:", SEPOLIA_AAVE_POOL !== "0x..." ? SEPOLIA_AAVE_POOL : "Not configured");
  console.log("  Uniswap Pool Manager:", SEPOLIA_UNISWAP_POOL_MANAGER);
  
  console.log("\nDeployed Contracts:");
  console.log("  NoScrollSavingsHook:", hookAddress);
  console.log("  YieldStrategyManager:", strategyManagerAddress);
  console.log("  UniswapV4Agent:", uniswapAgentAddress);
  console.log("  TreasuryManager:", treasuryManagerAddress);
  
  console.log("\nDeployer:", deployer.address);
  if (backendAddress) console.log("Backend:", backendAddress);
  
  console.log("\n=== Verification Commands ===");
  console.log(`npx hardhat verify --network sepolia ${hookAddress} "${ethers.ZeroAddress}" "${deployer.address}"`);
  console.log(`npx hardhat verify --network sepolia ${strategyManagerAddress} "${ethers.ZeroAddress}" "${deployer.address}"`);
  console.log(`npx hardhat verify --network sepolia ${uniswapAgentAddress} "${SEPOLIA_USDC}" "${SEPOLIA_UNISWAP_POOL_MANAGER}" "${deployer.address}" "${SEPOLIA_WETH}"`);
  console.log(`npx hardhat verify --network sepolia ${treasuryManagerAddress} "${SEPOLIA_USDC}" "${SEPOLIA_AAVE_POOL !== "0x..." ? SEPOLIA_AAVE_POOL : ethers.ZeroAddress}" "${deployer.address}"`);
  
  console.log("\n=== Next Steps ===");
  console.log("1. Save contract addresses to your .env file");
  console.log("2. Update backend with TreasuryManager address");
  console.log("3. Verify contracts on Etherscan");
  console.log("4. Configure Aave Pool address if not set");
  console.log("5. Configure Uniswap V4 Pool Manager if not set");
  console.log("6. Add liquidity pools to UniswapV4Agent");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
