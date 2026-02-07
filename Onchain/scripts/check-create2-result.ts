import { ethers } from "hardhat";

/**
 * Check the result of the CREATE2 deployment
 */

const TX_HASH = "0xedca86f7d1f10589a1b69b118488a8dd305cff299755e337a3cf3acb90b77399";
const EXPECTED_ADDRESS = "0x47824Bc4B026692d5bEE7EE2eCC3CCf713B1c000";

async function main() {
  const provider = ethers.provider;
  
  console.log("\n🔍 Checking CREATE2 deployment");
  console.log("Transaction:", TX_HASH);
  console.log("Expected address:", EXPECTED_ADDRESS);
  
  const receipt = await provider.getTransactionReceipt(TX_HASH);
  
  if (!receipt) {
    console.log("❌ Receipt not found");
    return;
  }
  
  console.log("\nStatus:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Logs count:", receipt.logs.length);
  
  // Check if contract was deployed
  const code = await provider.getCode(EXPECTED_ADDRESS);
  console.log("\nCode at expected address:", code.length > 2 ? "✅ " + code.length + " bytes" : "❌ No code");
  
  // Check logs for actual deployed address
  if (receipt.logs.length > 0) {
    console.log("\nLogs:");
    receipt.logs.forEach((log, i) => {
      console.log(`Log ${i}:`, {
        address: log.address,
        topics: log.topics,
        data: log.data
      });
    });
  }
  
  // Check transaction details
  const tx = await provider.getTransaction(TX_HASH);
  if (tx) {
    console.log("\nTransaction to:", tx.to);
    console.log("Transaction data length:", tx.data.length);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
