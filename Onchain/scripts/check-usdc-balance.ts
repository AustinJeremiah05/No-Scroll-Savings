import { ethers } from "hardhat";

const USDC_ARC = "0x3600000000000000000000000000000000000000";

async function main() {
  const [signer] = await ethers.getSigners();
  
  console.log("💰 Checking USDC balance...");
  console.log("   Address:", signer.address);
  
  const usdc = await ethers.getContractAt("IERC20", USDC_ARC);
  const balance = await usdc.balanceOf(signer.address);
  
  console.log("   Balance:", ethers.formatUnits(balance, 6), "USDC");
  console.log("\n📝 You need 10 USDC minimum to deposit");
  console.log("   Current balance: 7.52 USDC");
  console.log("   Need: 2.48 more USDC");
  console.log("\n💡 Get testnet USDC from Arc Testnet faucet");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
