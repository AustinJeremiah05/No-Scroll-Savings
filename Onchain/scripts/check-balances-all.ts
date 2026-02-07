import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("=== Checking All Balances ===\n");
  
  const TREASURY_MANAGER = "0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9";
  const UNISWAP_AGENT = "0x5AC3d6D73bBfc9C8b26a78cF7D7314B326B2CAb5";
  const BACKEND_WALLET = "0xe01Add0c3640a8314132bAF491d101A38ffEF4f0";
  const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  
  // Get USDC contract
  const usdcAbi = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];
  const usdc = await ethers.getContractAt(usdcAbi, USDC_SEPOLIA);
  
  // Get TreasuryManager
  const TreasuryManager = await ethers.getContractFactory("TreasuryManager");
  const treasuryManager = TreasuryManager.attach(TREASURY_MANAGER);
  
  // Get UniswapV4Agent
  const UniswapAgent = await ethers.getContractFactory("UniswapV4Agent");
  const uniswapAgent = UniswapAgent.attach(UNISWAP_AGENT);
  
  console.log("💰 USDC Balances (Sepolia):");
  const backendBalance = await usdc.balanceOf(BACKEND_WALLET);
  const treasuryBalance = await usdc.balanceOf(TREASURY_MANAGER);
  const agentBalance = await usdc.balanceOf(UNISWAP_AGENT);
  
  console.log(`   Backend Wallet: ${ethers.formatUnits(backendBalance, 6)} USDC`);
  console.log(`   TreasuryManager: ${ethers.formatUnits(treasuryBalance, 6)} USDC`);
  console.log(`   UniswapV4Agent: ${ethers.formatUnits(agentBalance, 6)} USDC`);
  console.log(`   Total: ${ethers.formatUnits(backendBalance + treasuryBalance + agentBalance, 6)} USDC`);
  
  console.log("\n📊 TreasuryManager State:");
  const totalReceived = await treasuryManager.totalReceived();
  const totalInUniswap = await treasuryManager.totalInUniswap();
  const totalYield = await treasuryManager.totalYieldEarned();
  
  console.log(`   Total Received: ${ethers.formatUnits(totalReceived, 6)} USDC`);
  console.log(`   Total In Uniswap: ${ethers.formatUnits(totalInUniswap, 6)} USDC`);
  console.log(`   Total Yield Earned: ${ethers.formatUnits(totalYield, 6)} USDC`);
  
  console.log("\n📊 UniswapV4Agent State:");
  const totalDeployed = await uniswapAgent.totalDeployed();
  const totalYieldGenerated = await uniswapAgent.totalYieldGenerated();
  
  console.log(`   Total Deployed: ${ethers.formatUnits(totalDeployed, 6)} USDC`);
  console.log(`   Total Yield Generated: ${ethers.formatUnits(totalYieldGenerated, 6)} USDC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
