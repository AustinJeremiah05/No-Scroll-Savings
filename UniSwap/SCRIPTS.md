# Contract Interaction Scripts

Collection of JavaScript snippets for interacting with the Uniswap V4 Agent system.

## Setup

```javascript
const { ethers } = require("ethers");

// Connect to Sepolia
const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Contract instances
const uniswapAgent = new ethers.Contract(AGENT_ADDRESS, AGENT_ABI, wallet);
const hook = new ethers.Contract(HOOK_ADDRESS, HOOK_ABI, wallet);
const strategyManager = new ethers.Contract(STRATEGY_ADDRESS, STRATEGY_ABI, wallet);
const treasury = new ethers.Contract(TREASURY_ADDRESS, TREASURY_ABI, wallet);
```

## Pool Management

### Add USDC/WETH Pool
```javascript
async function addUSDCWETHPool() {
  const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const WETH = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
  const FEE = 3000; // 0.3%
  
  const poolId = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['address', 'address', 'uint24'],
      [USDC, WETH, FEE]
    )
  );
  
  const tx = await uniswapAgent.addPool(poolId, USDC, WETH, FEE);
  await tx.wait();
  
  console.log(`Pool added: ${poolId}`);
}
```

### Add Multiple Pools
```javascript
async function addCommonPools() {
  const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const pools = [
    { token: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9", name: "WETH", fee: 3000 },
    { token: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0", name: "USDT", fee: 500 },
    { token: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357", name: "DAI", fee: 500 },
  ];
  
  for (const pool of pools) {
    const poolId = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'uint24'],
        [USDC, pool.token, pool.fee]
      )
    );
    
    const tx = await uniswapAgent.addPool(poolId, USDC, pool.token, pool.fee);
    await tx.wait();
    console.log(`✓ Added USDC/${pool.name} pool`);
  }
}
```

## Metrics & Monitoring

### Get Agent Overview
```javascript
async function getAgentOverview() {
  const [deployed, yieldGenerated, activePools, lastHarvest] = 
    await uniswapAgent.getTotalStats();
  
  console.log("=== Uniswap Agent Overview ===");
  console.log(`Total Deployed: ${ethers.utils.formatUnits(deployed, 6)} USDC`);
  console.log(`Yield Generated: ${ethers.utils.formatUnits(yieldGenerated, 6)} USDC`);
  console.log(`Active Pools: ${activePools}`);
  console.log(`Last Harvest: ${new Date(lastHarvest * 1000).toLocaleString()}`);
}
```

### Check All Pool Stats
```javascript
async function getAllPoolStats() {
  const poolCount = await uniswapAgent.pools.length; // This won't work directly
  
  // Alternative: Track poolIds manually or emit in addPool
  const poolIds = [/* your pool IDs */];
  
  for (const poolId of poolIds) {
    const [token0, token1, fee, allocated, yield, active] = 
      await uniswapAgent.getPoolInfo(poolId);
    
    console.log(`\nPool: ${poolId.slice(0, 10)}...`);
    console.log(`  Tokens: ${token0} / ${token1}`);
    console.log(`  Fee: ${fee / 10000}%`);
    console.log(`  Allocated: ${ethers.utils.formatUnits(allocated, 6)} USDC`);
    console.log(`  Yield: ${ethers.utils.formatUnits(yield, 6)} USDC`);
    console.log(`  Active: ${active}`);
  }
}
```

### Monitor Safety Status
```javascript
async function checkSafetyStatus(poolId) {
  const [lastPrice, updateTime, volume24h, suspiciousCount, paused] = 
    await hook.getPoolSafety(poolId);
  
  const isSafe = await hook.isPoolSafe(poolId);
  const circuitBreakerActive = await hook.circuitBreakerActive();
  
  console.log("=== Safety Status ===");
  console.log(`Pool Safe: ${isSafe}`);
  console.log(`Circuit Breaker: ${circuitBreakerActive ? "ACTIVE" : "Inactive"}`);
  console.log(`Paused: ${paused}`);
  console.log(`Suspicious Activities: ${suspiciousCount}`);
  console.log(`24h Volume: ${ethers.utils.formatUnits(volume24h, 6)} USDC`);
}
```

## Strategy Management

### View Active Strategy
```javascript
async function getActiveStrategy() {
  const [name, minAPY, maxRisk, minLiquidity] = 
    await strategyManager.getActiveStrategy();
  
  console.log("=== Active Strategy ===");
  console.log(`Name: ${name}`);
  console.log(`Min APY: ${minAPY / 100}%`);
  console.log(`Max Risk: ${maxRisk}/100`);
  console.log(`Min Liquidity: ${ethers.utils.formatUnits(minLiquidity, 6)} USDC`);
}
```

### Create & Activate Moderate Strategy
```javascript
async function setupModerateStrategy() {
  const tx = await strategyManager.createStrategy(
    "Moderate Growth",
    350,  // 3.5% min APY
    60,   // Medium risk
    ethers.utils.parseUnits("50000", 6), // $50k min liquidity
    []    // Auto-allocation
  );
  await tx.wait();
  
  const strategyId = (await strategyManager.strategyCount()).toNumber() - 1;
  
  const activateTx = await strategyManager.activateStrategy(strategyId);
  await activateTx.wait();
  
  console.log(`Moderate strategy created and activated (ID: ${strategyId})`);
}
```

## Operations

### Full Rebalance
```javascript
async function performRebalance() {
  console.log("Checking if rebalance needed...");
  
  const tx = await uniswapAgent.rebalance();
  const receipt = await tx.wait();
  
  // Parse events
  const event = receipt.events?.find(e => e.event === 'Rebalanced');
  if (event) {
    console.log(`✓ Rebalanced ${event.args.poolsAffected} pools`);
    console.log(`  Total liquidity: ${ethers.utils.formatUnits(event.args.totalLiquidity, 6)} USDC`);
  }
}
```

### Harvest Yield
```javascript
async function harvestYield() {
  const tx = await uniswapAgent.harvestYield();
  const receipt = await tx.wait();
  
  const event = receipt.events?.find(e => e.event === 'YieldHarvested');
  if (event) {
    console.log(`✓ Harvested ${ethers.utils.formatUnits(event.args.amount, 6)} USDC`);
  }
}
```

### Emergency Withdraw
```javascript
async function emergencyWithdraw() {
  console.log("⚠️  Performing emergency withdrawal...");
  
  const tx = await uniswapAgent.emergencyWithdraw();
  await tx.wait();
  
  console.log("✓ Emergency withdrawal completed");
}
```

## Full Integration Test

```javascript
async function fullIntegrationTest() {
  console.log("=== Starting Full Integration Test ===\n");
  
  // 1. Setup pools
  console.log("1. Adding pools...");
  await addCommonPools();
  
  // 2. Get treasury balance
  console.log("\n2. Checking treasury...");
  const balance = await usdc.balanceOf(treasury.address);
  console.log(`Treasury balance: ${ethers.utils.formatUnits(balance, 6)} USDC`);
  
  // 3. Deploy funds
  console.log("\n3. Deploying funds...");
  const deployAmount = ethers.utils.parseUnits("1000", 6);
  const tx = await treasury.receiveFunds(deployAmount);
  await tx.wait();
  console.log("✓ Funds deployed");
  
  // 4. Check agent stats
  console.log("\n4. Agent stats:");
  await getAgentOverview();
  
  // 5. Update strategy
  console.log("\n5. Creating moderate strategy...");
  await setupModerateStrategy();
  
  // 6. Rebalance
  console.log("\n6. Rebalancing...");
  await performRebalance();
  
  // 7. Check safety
  console.log("\n7. Safety checks:");
  // await checkSafetyStatus(poolIds[0]);
  
  console.log("\n=== Integration Test Complete ===");
}
```

## Event Monitoring

```javascript
async function monitorEvents() {
  // Listen to agent events
  uniswapAgent.on("LiquidityDeposited", (amount, poolId) => {
    console.log(`💧 Liquidity Deposited: ${ethers.utils.formatUnits(amount, 6)} USDC to pool ${poolId}`);
  });
  
  uniswapAgent.on("YieldHarvested", (amount) => {
    console.log(`💰 Yield Harvested: ${ethers.utils.formatUnits(amount, 6)} USDC`);
  });
  
  hook.on("CircuitBreakerTriggered", (poolId, priceChange) => {
    console.log(`🚨 Circuit Breaker! Pool ${poolId}, change: ${priceChange}bp`);
  });
  
  console.log("📡 Monitoring events...");
}
```

---

**Usage**: Copy these snippets into your testing scripts or Node.js REPL.
