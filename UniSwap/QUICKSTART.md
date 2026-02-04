# Uniswap V4 Agent - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Deployed contracts on Sepolia (via `npm run deploy:sepolia` in onchain folder)
- USDC tokens for testing
- Wallet with Sepolia ETH for gas

### Initial Setup

1. **Add Liquidity Pools**
```bash
# Example: Add USDC/ETH pool
const poolId = ethers.utils.keccak256(
  ethers.utils.defaultAbiCoder.encode(
    ['address', 'address', 'uint24'],
    [USDC_ADDRESS, WETH_ADDRESS, 3000]
  )
);

await uniswapAgent.addPool(
  poolId,
  USDC_ADDRESS,
  WETH_ADDRESS,
  3000
);
```

2. **Fund TreasuryManager**
```bash
# Transfer USDC to TreasuryManager
await usdc.transfer(treasuryManagerAddress, ethers.utils.parseUnits("1000", 6));
```

3. **Deploy to Agent**
```bash
# TreasuryManager receives funds and auto-deploys
await treasuryManager.receiveFunds(ethers.utils.parseUnits("1000", 6));
# 60% goes to Aave
# 30% goes to Uniswap Agent
```

## 🎯 Common Operations

### Check Agent Status
```javascript
const [deployed, yieldGenerated, activePools, lastHarvest] = 
  await uniswapAgent.getTotalStats();

console.log(`Total Deployed: ${ethers.utils.formatUnits(deployed, 6)} USDC`);
console.log(`Yield Generated: ${ethers.utils.formatUnits(yieldGenerated, 6)} USDC`);
console.log(`Active Pools: ${activePools}`);
```

### Manual Rebalance
```javascript
await uniswapAgent.rebalance();
```

### Harvest Yield
```javascript
const yieldAmount = await uniswapAgent.harvestYield();
console.log(`Harvested: ${ethers.utils.formatUnits(yieldAmount, 6)} USDC`);
```

### Update Strategy
```javascript
await uniswapAgent.updateStrategy(
  700,   // 7% target APY
  300,   // 3% min APY
  50,    // Medium risk (0-100)
  true,  // Auto-rebalance enabled
  86400  // 1 day rebalance interval
);
```

## 🛠️ Advanced Configuration

### Create Custom Strategy
```javascript
await strategyManager.createStrategy(
  "Aggressive Growth",
  800,   // 8% min APY
  80,    // High risk tolerance
  50000 * 10**6,  // $50k min liquidity
  []     // Empty allocation (auto-calculated)
);

// Activate it
const strategyId = await strategyManager.strategyCount() - 1;
await strategyManager.activateStrategy(strategyId);
```

### Update Pool Metrics
```javascript
// Update metrics for a pool
await strategyManager.updatePoolMetrics(
  poolId,
  650,          // 6.5% APY
  5000000,      // $5M TVL
  250000,       // $250k volume
  1625,         // $1625 fees
  4500000       // $4.5M liquidity
);
```

### Emergency Controls
```javascript
// Pause a pool
await hook.pausePool(poolId, "Suspicious activity detected");

// Resume pool
await hook.resumePool(poolId);

// Reset circuit breaker
await hook.resetCircuitBreaker();
```

## 📊 Monitoring

### Pool Performance
```javascript
const [token0, token1, fee, allocated, cumulativeYield, active] = 
  await uniswapAgent.getPoolInfo(poolId);

console.log(`Allocated: ${ethers.utils.formatUnits(allocated, 6)} USDC`);
console.log(`Cumulative Yield: ${ethers.utils.formatUnits(cumulativeYield, 6)} USDC`);
console.log(`Active: ${active}`);
```

### Safety Status
```javascript
const [lastPrice, updateTime, volume24h, suspiciousCount, paused] = 
  await hook.getPoolSafety(poolId);

const isSafe = await hook.isPoolSafe(poolId);
console.log(`Pool Safe: ${isSafe}`);
```

## 🔍 Troubleshooting

### Pool Not Accepting Liquidity
- Check if pool is registered: `await uniswapAgent.isPoolRegistered(poolId)`
- Verify pool is active: `await uniswapAgent.pools(index)`
- Check treasury has approved agent: `await usdc.allowance(treasury, agent)`

### Circuit Breaker Triggered
- Check status: `await hook.circuitBreakerActive()`
- Reset: `await hook.resetCircuitBreaker()`
- Wait for market stabilization before resuming

### Low Yield Generation
- Check pool APYs: Update metrics more frequently
- Verify liquidity is actually deployed to pools
- Consider switching to more aggressive strategy

## 🎓 Learning Resources

- Test all public functions systematically
- Monitor events emitted by contracts
- Use Etherscan to track on-chain activity
- Compare strategy performance over time

## 📝 Testing Checklist

- [ ] Deploy all contracts successfully
- [ ] Add at least 2-3 pools
- [ ] Fund TreasuryManager with test USDC
- [ ] Verify liquidity deployed to agent
- [ ] Test rebalancing mechanism
- [ ] Simulate yield harvest
- [ ] Test emergency pause/resume
- [ ] Switch between strategies
- [ ] Monitor all key metrics

---

**Need Help?** Check the main README.md for detailed architecture and integration flow.
