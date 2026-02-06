import hre from 'hardhat';
const { ethers } = hre;

const SAVINGS_VAULT_ARC = "0xe85486A9253913d54f0D6EDB3b91f82a6829b892";

async function main() {
  console.log("🔍 Finding ALL events from SavingsVault...\n");

  const provider = ethers.provider;
  const currentBlock = await provider.getBlockNumber();
  console.log(`Current block: ${currentBlock}\n`);

  // Arc RPC limits to 10,000 blocks per query, so let's search in chunks
  const CHUNK_SIZE = 9999;
  const searchRange = 50000;
  const searchStart = Math.max(0, currentBlock - searchRange);
  
  console.log(`Searching from block ${searchStart} to ${currentBlock} in ${CHUNK_SIZE} block chunks\n`);

  try {
    let allLogs: any[] = [];
    
    // Search in chunks
    for (let fromBlock = searchStart; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
      console.log(`Checking blocks ${fromBlock} to ${toBlock}...`);
      
      const logs = await provider.getLogs({
        address: SAVINGS_VAULT_ARC,
        fromBlock: fromBlock,
        toBlock: toBlock,
      });
      
      allLogs = allLogs.concat(logs);
      
      if (logs.length > 0) {
        console.log(`  ✅ Found ${logs.length} events in this chunk`);
      }
    }

    console.log(`\n📊 Found ${allLogs.length} total events from SavingsVault\n`);

    if (allLogs.length > 0) {
      console.log("First 10 events:");
      for (let i = 0; i < Math.min(10, allLogs.length); i++) {
        const log = allLogs[i];
        console.log(`\n Event ${i + 1}:`);
        console.log(`  Block: ${log.blockNumber}`);
        console.log(`  Transaction: ${log.transactionHash}`);
        console.log(`  Topic[0]: ${log.topics[0]}`);
        
        // Try to identify event type by topic
        const bridgeTopic = ethers.id("BridgeToSepoliaRequested(address,uint256,bytes32)");
        const depositTopic = ethers.id("Deposit(address,address,uint256,uint256)");
        const depositWithChallengeTopic = ethers.id("DepositWithChallenge(address,address,uint256,uint256,string,uint256,uint256)");
        
        if (log.topics[0] === bridgeTopic) {
          console.log(`  Type: BridgeToSepoliaRequested ✅`);
        } else if (log.topics[0] === depositTopic) {
          console.log(`  Type: Deposit`);
        } else if (log.topics[0] === depositWithChallengeTopic) {
          console.log(`  Type: DepositWithChallenge`);
        }
      }

      console.log(`\n\n📍 First event at block: ${allLogs[0].blockNumber}`);
      console.log(`📍 Last event at block: ${allLogs[allLogs.length - 1].blockNumber}`);
      
      // Check specifically for BridgeToSepoliaRequested
      const bridgeTopic = ethers.id("BridgeToSepoliaRequested(address,uint256,bytes32)");
      const bridgeEvents = allLogs.filter(log => log.topics[0] === bridgeTopic);
      
      console.log(`\n🌉 BridgeToSepoliaRequested events: ${bridgeEvents.length}`);
      
      if (bridgeEvents.length > 0) {
        console.log("\nBridge events found:");
        for (const log of bridgeEvents) {
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
            ['uint256', 'bytes32'],
            log.data
          );
          const user = ethers.getAddress('0x' + log.topics[1].slice(26));
          
          console.log(`\n  Block: ${log.blockNumber}`);
          console.log(`  User: ${user}`);
          console.log(`  Amount: ${ethers.formatUnits(decoded[0], 6)} USDC`);
          console.log(`  Bridge ID: ${decoded[1]}`);
          console.log(`  Transaction: ${log.transactionHash}`);
        }
      }
    } else {
      console.log("❌ No events found in the last 50,000 blocks");
      console.log("The contract might be older or something is wrong with event indexing");
    }

  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
