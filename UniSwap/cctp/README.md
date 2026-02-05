# No-Scroll Savings CCTP Bridge Service

Automated cross-chain bridging service for No-Scroll Savings platform.

## Overview

This service listens for deposit events on Arc Testnet and automatically:
1. ✅ Detects historical unprocessed deposits on startup
2. ✅ Bridges USDC from Arc → Sepolia using CCTP
3. ✅ Deploys funds to Uniswap v4 via TreasuryManager
4. ✅ Tracks processed deposits to avoid duplicates
5. ✅ Logs all transactions for verification

## Key Features

- **🔄 Automatic Resume**: Detects deposits created while service was offline
- **📝 Persistent Tracking**: Saves processed deposits to `processed-deposits.json`
- **🔍 Historical Scan**: Checks last 1000 blocks on startup
- **⏭️ Skip Duplicates**: Won't reprocess already-bridged deposits
- **💾 Full Audit Trail**: Tracks every deposit with tx hashes and status

## Architecture

```
User Deposits on Arc
        ↓
SavingsVault emits BridgeToSepoliaRequested
        ↓
Bridge Service detects event
        ↓
CCTP: Burn USDC on Arc
        ↓
CCTP: Mint USDC on Sepolia
        ↓
TreasuryManager.receiveFunds()
        ↓
100% deployed to UniswapV4Agent
        ↓
User earns yield!
```

## Setup

```bash
cd UniSwap/cctp
npm install
```

## Environment Variables

`.env` file should contain:
```
PRIVATE_KEY="0x..."  # Backend wallet private key
```

## Usage

### Watch Mode (Production)
Continuously listens for deposit events and auto-bridges:
```bash
npm start
```

Output:
```
👀 Watching for deposits on Arc SavingsVault...
   Contract: 0x9D416d7aeB87fd18b5fB46c2193Da9CCEbC51231
   Chain: Arc Testnet (5042002)

✅ Bridge service is running!
   Listening for deposits...
```

When a deposit occurs:
```
� Checking for historical deposits...
   From block: 25390524
   To block: latest

📋 Found 2 historical deposit(s)

🔔 Processing Deposit
=====================================
   User: 0xe01Add0c3640a8314132bAF491d101A38ffEF4f0
   Amount: 10 USDC
   Bridge Request ID: 0x123...
   Block: 25391000
   Transaction: 0xabc...
=====================================

🚀 Step 1: Bridging via CCTP...
🌉 Bridging 10 USDC: Arc → Sepolia via CCTP
✅ CCTP Bridge Result: {...}

⏳ Waiting for CCTP bridge to complete...

🚀 Step 2: Deploying to Uniswap v4...
📊 Deploying funds to Uniswap v4 via TreasuryManager...
📝 Transaction sent: 0xdef...
✅ Funds deployed to Uniswap v4!
   Transaction: 0xdef...
   Block: 5123456
   Status: ✅ Success

✅ Complete Pipeline Executed!
   Arc Deposit → CCTP Bridge → Sepolia → Uniswap v4
   User can now earn yield on their deposit
   📝 Saved to processed-deposits.json

🔔 Processing Deposit
   User: 0xabc...
   Amount: 15 USDC
   ⏭️  Already processed, skipping...

✅ Historical deposits processed

👂 Now listening for new deposits...
```

### Test Mode
Manual bridge test without waiting for events:
```bash
npm run test          # Bridge 0.0005 USDC (default)
npm run test 10       # Bridge 10 USDC
```

## Contract Addresses

### Arc Testnet (Chain ID: 5042002)
- **SavingsVault**: `0x9D416d7aeB87fd18b5fB46c2193Da9CCEbC51231`
- **USDC**: `0x3600000000000000000000000000000000000000`

### Sepolia (Chain ID: 11155111)
- **TreasuryManager**: `0xc4534a320Ff1561EC173A76103E43afe52dBC2B5`
- **UniswapV4Agent**: (Deploy this next)
- **USDC**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

## Flow Details

### 1. Deposit on Arc
User calls `SavingsVault.deposit()` with USDC:
```solidity
emit BridgeToSepoliaRequested(user, amount, bridgeRequestId);
```

### 2. CCTP Bridging
Bridge service detects event and:
- Calls Circle CCTP `TokenMessenger.depositForBurn()` on Arc
- Waits for attestation fr (historical + new)
- ✅ Bridge transaction hashes
- ✅ Deployment transaction hashes
- ✅ Block numbers for verification
- ✅ Status of each step
- ✅ Skipped duplicates

### Processed Deposits File

The service creates `processed-deposits.json` to track:
```json
[
  {
    "bridgeRequestId": "0x123...",
    "user": "0xe01Add...",
    "amount": "10",
    "timestamp": 1707132000000,
    "arcTxHash": "0xabc...",
    "sepoliaTxHash": "0xdef...",
    "status": "deployed"
  }
]
```

**Statuses:**
- `bridged` - CCTP bridge completed
- 📝 Deposit marked as "failed" in processed-deposits.json
- The service continues running
- Failed deposits can be manually retried

### Restart Behavior

When you restart the service:
1. ✅ Loads `processed-deposits.json`
2. ✅ Scans last 1000 blocks for deposits
3. ✅ Skips already-processed deposits
4. ✅ Processes any new/missed deposits
5. ✅ Continues listening for future deposits

This ensures **no deposits are ever missed** even if the service is temporarily offline!
Bridge service calls:
```solidity
TreasuryManager.receiveFunds(amount)
  → UniswapV4Agent.depositLiquidity(amount)
    → Distributes to multiple pools
    → Starts earning fees immediately
```

## Monitoring

The service logs:
- ✅ Every deposit detected
- ✅ Bridge transaction hashes
- ✅ Deployment transaction hashes
- ✅ Block numbers for verification
- ✅ Status of each step

## Error Handling

If any step fails:
- ❌ Error is logged with full details
- The service continues running
- Retry logic can be added for production

## Next Steps

1. ✅ Deploy UniswapV4Agent contract on Sepolia
2. ✅ Set backend address in TreasuryManager
3. ✅ Update UNISWAP_V4_AGENT_SEPOLIA address in index.ts
4. ✅ Run `npm start` to begin monitoring
5. ✅ Make a test deposit on Arc
6. ✅ Verify funds appear in Uniswap pools

## Production Considerations

- Add retry logic for failed bridges
- Implement proper attestation polling
- Add transaction confirmation checks
- Set up monitoring/alerting
- Use secure key management (not .env)
- Add rate limiting
- Implement nonce management
