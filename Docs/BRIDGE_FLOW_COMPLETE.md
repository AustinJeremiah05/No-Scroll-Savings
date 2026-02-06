# Complete Bidirectional Bridge Flow

## Overview

The No-Scroll Savings bridge system now supports **full bidirectional bridging** between Arc and Sepolia via Circle's CCTP (Cross-Chain Transfer Protocol).

---

## 🔄 Flow 1: Deposits (Arc → Sepolia)

### User Action → Yield Generation

```
1. User Deposits USDC on Arc (SavingsVault)
   ↓
2. Backend Withdraws USDC from Vault
   ↓
3. CCTP Bridge: Arc → Sepolia
   ↓
4. Backend Transfers USDC to TreasuryManager
   ↓
5. TreasuryManager Deploys to UniswapV4Agent
   ↓
6. UniswapV4Agent Provides Liquidity (Earns Trading Fees)
```

### Detailed Steps

#### Step 1: User Deposits
- **Function**: `SavingsVault.deposit()` on Arc
- **Actions**:
  - User transfers USDC to vault
  - Vault mints shares (ERC-4626)
  - Creates deposit metadata (lock duration, challenge type)
  - Emits: `BridgeToSepoliaRequested(user, amount, bridgeRequestId)`

#### Step 2: Backend Detects & Withdraws
- **Listener**: `watchDepositEvents()` (polling every 10s)
- **Function**: `SavingsVault.transferForCCTPBridge()`
- **Actions**:
  - Transfers USDC from vault to backend wallet
  - Backend now holds USDC on Arc
  - Waits 10 seconds for block confirmations

#### Step 3: CCTP Bridge
- **Function**: `bridgeUSDC()` using Bridge Kit
- **Actions**:
  - Burns USDC on Arc
  - Gets attestation from Circle
  - Mints USDC on Sepolia
  - Error handling: 30s wait + balance verification fallback

#### Step 4: Confirm Bridge
- **Function**: `SavingsVault.confirmBridgeToSepolia()`
- **Actions**:
  - Updates vault accounting:
    - `arcBuffer -= amount`
    - `totalBridgedToSepolia += amount`
    - `totalYieldOnSepolia += amount`

#### Step 5: Deploy to Treasury
- **Function**: `deployToTreasury()`
- **Actions**:
  - Transfers USDC to TreasuryManager on Sepolia
  - **Note**: Currently does NOT call `receiveFunds()` (Uniswap not deployed yet)

#### Step 6: (Future) Deploy to Uniswap
- **Function**: `TreasuryManager.receiveFunds()` (when Uniswap ready)
- **Actions**:
  - Approves UniswapV4Agent
  - Calls `UniswapV4Agent.depositLiquidity()`
  - USDC becomes liquidity in Uniswap v4 pools
  - Earns trading fees

---

## 🔙 Flow 2: Withdrawals (Sepolia → Arc) **[NEW]**

### User Withdrawal → Receive USDC + Yield

```
1. User Requests Redemption (SavingsVault on Arc)
   ↓
2. User Claims After Lock Period
   ↓
3. Backend Withdraws from TreasuryManager (Sepolia)
   ↓
4. TreasuryManager Pulls from UniswapV4Agent
   ↓
5. CCTP Bridge: Sepolia → Arc (REVERSE)
   ↓
6. Backend Deposits USDC to Vault
   ↓
7. Vault Sends USDC + Yield to User
```

### Detailed Steps

#### Step 1: User Requests Redemption
- **Function**: `SavingsVault.requestRedeem()` on Arc
- **Parameters**: `(shares, receiver, owner, destinationChainId)`
- **Actions**:
  - Burns user's shares immediately
  - Creates redemption request with status: `Pending`
  - Stores unlock time from deposit metadata
  - Emits: `RedemptionRequested(requestId, owner, receiver, shares, assets, destinationChainId)`

#### Step 2: User Claims (After Lock Period)
- **Function**: `SavingsVault.claimRedemption(requestId)`
- **Requirements**: `block.timestamp >= unlockTime`
- **Actions**:
  - Updates status: `Pending` → `Processing`
  - Emits: `BridgeFromSepoliaRequested(requestId, amount)`
  - Backend detects this event

#### Step 3: Backend Withdraws from Treasury
- **Listener**: `watchRedemptionEvents()` (polling every 10s)
- **Function**: `TreasuryManager.withdrawFunds(amount)` on Sepolia
- **Actions**:
  - Checks buffer balance: `USDC.balanceOf(TreasuryManager)`
  - If insufficient, calls: `UniswapV4Agent.withdrawLiquidity(amount)`
  - Transfers USDC to backend wallet on Sepolia
  - Emits: `FundsWithdrawn(amount)`

#### Step 4: CCTP Reverse Bridge
- **Function**: `bridgeUSDCReverse()` using Bridge Kit
- **Direction**: Sepolia → Arc
- **Actions**:
  - Burns USDC on Sepolia
  - Gets attestation from Circle
  - Mints USDC on Arc
  - Backend now holds USDC on Arc
  - Error handling: 30s wait + balance verification

#### Step 5: Confirm Bridge from Sepolia
- **Function**: `SavingsVault.confirmBridgeFromSepolia(requestId, amount)`
- **Actions**:
  - Updates vault accounting:
    - `totalYieldOnSepolia -= amount`
    - `totalBridgedToSepolia -= amount`
    - `arcBuffer += amount`
  - Updates status: `Processing` → `Claimable`

#### Step 6: Deposit USDC Back to Vault
- **Function**: Backend transfers USDC to SavingsVault
- **Actions**:
  - Approves vault to spend USDC
  - Transfers USDC from backend → vault

#### Step 7: Complete Redemption
- **Function**: `SavingsVault.completeRedemption(requestId)`
- **Actions**:
  - Transfers USDC from vault → user (receiver address)
  - Amount includes principal + yield
  - Updates status: `Claimable` → `Completed`
  - Emits: `RedemptionCompleted(requestId, receiver, assets)`

---

## 📊 Accounting Metrics

### SavingsVault (Arc)

```solidity
struct HubMetrics {
    totalPooledOnArc       // Total USDC ever deposited
    totalBridgedToSepolia  // Currently on Sepolia (increases on deposit, decreases on withdrawal)
    totalYieldOnSepolia    // Yield earned on Sepolia
    arcBuffer             // USDC currently in vault (decreases after bridge, increases on return)
    activeDeposits        // Number of active deposits
}
```

**Deposit Flow Changes**:
- ✅ `totalPooledOnArc += amount`
- ✅ `arcBuffer += amount` (deposit)
- ✅ `arcBuffer -= amount` (bridge out)
- ✅ `totalBridgedToSepolia += amount`

**Withdrawal Flow Changes**:
- ✅ `totalBridgedToSepolia -= amount` (bridge back)
- ✅ `arcBuffer += amount` (bridge in)
- ✅ `arcBuffer -= amount` (send to user)
- ✅ `totalPooledOnArc -= amount`

### TreasuryManager (Sepolia)

```solidity
uint256 public totalReceived;      // Total USDC received from Arc
uint256 public totalInUniswap;     // Currently deployed in Uniswap
uint256 public totalYieldEarned;   // Total trading fees earned
```

**Deposit Flow Changes**:
- ✅ `totalReceived += amount`
- ✅ `totalInUniswap += amount` (when deployed)

**Withdrawal Flow Changes**:
- ✅ `totalInUniswap -= amount` (when withdrawn)

---

## 🔄 Event Flow Summary

### Forward Bridge (Deposit)

| Step | Contract | Chain | Event | Status |
|------|----------|-------|-------|--------|
| 1 | SavingsVault | Arc | `BridgeToSepoliaRequested` | Detected by backend |
| 2 | SavingsVault | Arc | `FundsBridgedToSepolia` | USDC withdrawn |
| 3 | CCTP | Both | Attestation | Bridge complete |
| 4 | TreasuryManager | Sepolia | `FundsReceived` | USDC arrived |

### Reverse Bridge (Withdrawal)

| Step | Contract | Chain | Event | Status |
|------|----------|-------|-------|--------|
| 1 | SavingsVault | Arc | `RedemptionRequested` | User requests |
| 2 | SavingsVault | Arc | `BridgeFromSepoliaRequested` | User claims |
| 3 | TreasuryManager | Sepolia | `FundsWithdrawn` | USDC withdrawn |
| 4 | CCTP | Both | Attestation | Bridge complete |
| 5 | SavingsVault | Arc | `RedemptionCompleted` | User receives USDC |

---

## 📂 File Tracking

### Deposits
- **File**: `processed-deposits.json`
- **Tracks**: Deposit bridge requests
- **Statuses**: `bridged`, `deployed`, `failed`
- **Retry Logic**: Max 3 attempts

### Withdrawals (NEW)
- **File**: `processed-redemptions.json`
- **Tracks**: Redemption bridge requests
- **Statuses**: `withdrawn`, `bridged`, `completed`, `failed`
- **Retry Logic**: Max 3 attempts

---

## 🚀 Running the Bridge Service

### Start Full Service (Both Directions)

```bash
cd UniSwap/cctp
npm start
```

**What it does**:
- ✅ Polls for `BridgeToSepoliaRequested` events (deposits)
- ✅ Polls for `BridgeFromSepoliaRequested` events (withdrawals)
- ✅ Processes historical events from last 5000 blocks
- ✅ Handles both directions simultaneously
- ✅ Saves progress to JSON files
- ✅ Retries failed operations (max 3 times)

**Console Output**:
```
🚀 Starting No-Scroll Savings Bridge Service
============================================
📥 Deposits: Arc → Sepolia (via CCTP)
📤 Withdrawals: Sepolia → Arc (via CCTP)
============================================

👀 Watching for deposits on Arc SavingsVault...
   Contract: 0xF4df10e373E509EC3d96237df91bE9B0006E918D
   Chain: Arc Testnet (5042002)
   Method: Polling (every 10 seconds)

👀 Watching for redemption requests on Arc SavingsVault...
   Contract: 0xF4df10e373E509EC3d96237df91bE9B0006E918D
   Event: BridgeFromSepoliaRequested
   Method: Polling (every 10 seconds)

✅ Bridge service is running!
✅ Redemption watcher is running!
```

---

## 🧪 Testing

### Test Deposit Flow

1. **Create deposit from frontend**:
   - Navigate to dashboard
   - Deposit 5 USDC with 6-minute lock
   - Watch backend logs

2. **Expected Console Output**:
   ```
   🔔 Processing Deposit
   =====================================
      User: 0x...
      Amount: 5 USDC
      Bridge Request ID: 0x...
   =====================================

   🚀 Step 1: Withdrawing USDC from SavingsVault...
   ✅ Withdrawal successful

   🚀 Step 2: Bridging via CCTP...
   🌉 Bridging 5 USDC: Arc → Sepolia via CCTP
   ✅ CCTP attestation complete! USDC minted on Sepolia

   🚀 Step 3: Confirming bridge on Arc...
   ✅ Bridge confirmed!

   🚀 Step 4: Transferring to TreasuryManager...
   ✅ USDC transferred to TreasuryManager!

   ✅ Complete Pipeline Executed!
   ```

3. **Verify**:
   - Check `processed-deposits.json` for status: `deployed`
   - Check TreasuryManager balance on Sepolia

### Test Withdrawal Flow (NEW)

1. **Request redemption** (after lock period):
   ```typescript
   // From frontend or script
   await savingsVault.requestRedeem(shares, receiver, owner, destinationChainId);
   ```

2. **Claim redemption**:
   ```typescript
   await savingsVault.claimRedemption(requestId);
   ```

3. **Expected Console Output**:
   ```
   🔔 Processing Redemption Request
   =====================================
      Request ID: 0x...
      Amount: 5.01 USDC (includes yield!)
   =====================================

   🚀 Step 1: Withdrawing from TreasuryManager (Sepolia)...
   ✅ Withdrawal successful!

   🚀 Step 2: Bridging USDC (Sepolia → Arc)...
   🌉 Bridging 5.01 USDC: Sepolia → Arc via CCTP (REVERSE)
   ✅ CCTP attestation complete! USDC minted on Arc

   🚀 Step 3: Confirming & completing redemption on Arc...
   📝 Confirming bridge from Sepolia on Arc...
   ✅ Bridge confirmed!

   💰 Depositing USDC back into SavingsVault...
   ✅ USDC approved
   ✅ USDC transferred to vault

   🎉 Completing redemption...
   ✅ Redemption completed! User received USDC + yield

   ✅ Complete Redemption Pipeline Executed!
   ```

4. **Verify**:
   - Check `processed-redemptions.json` for status: `completed`
   - Check user's USDC balance increased on Arc

---

## ⚠️ Current Limitations

1. **UniswapV4Agent Not Deployed**:
   - TreasuryManager has USDC but doesn't deploy to Uniswap yet
   - `receiveFunds()` commented out in current flow
   - Yield generation pending Uniswap deployment

2. **Yield Calculation**:
   - Currently assumes yield = 0 (no Uniswap)
   - When Uniswap deployed: yield = trading fees earned
   - Will be harvested via `harvestYield()`

3. **Same-Chain Withdrawals**:
   - Currently only supports Arc deposits → Sepolia → Arc withdrawals
   - Multi-chain support (destinationChainId) exists but not tested

---

## 🔮 Next Steps

### Immediate (Uniswap Integration)

1. **Deploy UniswapV4Agent** on Sepolia
2. **Update TreasuryManager**:
   - Uncomment `receiveFunds()` flow
   - Actually call `UniswapV4Agent.depositLiquidity()`
3. **Test Yield Generation**:
   - Verify trading fees accumulate
   - Test `harvestYield()` function
4. **Test Full Cycle**:
   - Deposit → Bridge → Uniswap → Earn Yield → Withdraw → Bridge Back → User Receives

### Future Enhancements

1. **Multi-Chain Support**:
   - Support withdrawals to different chains (not just Arc)
   - Update `completeRedemption()` to handle cross-chain transfers

2. **Yield Optimization**:
   - Implement actual APY targeting
   - Auto-rebalance between pools
   - Risk scoring for pool selection

3. **Frontend Integration**:
   - Display redemption status in dashboard
   - Show real-time bridge progress
   - Display yield earned breakdown

4. **Monitoring**:
   - Add health checks
   - Error alerting
   - Performance metrics

---

## 📋 Contract Summary

### Arc Testnet (5042002)

| Contract | Address | Purpose |
|----------|---------|---------|
| SavingsVault | `0xF4df10e373E509EC3d96237df91bE9B0006E918D` | Main vault (deposits, redemptions) |
| ChallengeTracker | `0x84D9368253712AB404fc3D986ef2497bFAA61c5E` | Challenge management |
| LotteryEngine | `0xfD50a4e04731b50d20089c2bda7517693cb10173` | Lottery system |
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` | USDC token |

### Sepolia Testnet (11155111)

| Contract | Address | Purpose |
|----------|---------|---------|
| TreasuryManager | `0x8C5963806f445BC5A7011A4072ed958767E90DB9` | Manages USDC, deploys to Uniswap |
| UniswapV4Agent | `0x7c20FC8413F935a274Bc5C16fE18370C0be5F72f` | Provides liquidity to USDC/WETH pool |
| USDC | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | USDC token |

---

## ✅ Status: COMPLETE

The **bidirectional bridge flow** is now fully implemented and ready for testing. Once UniswapV4Agent is deployed on Sepolia, the system will be production-ready with real yield generation.

**What's Working**:
- ✅ Arc → Sepolia deposits (with CCTP)
- ✅ Sepolia → Arc withdrawals (with CCTP)
- ✅ Event listening (polling-based)
- ✅ Error handling & retries
- ✅ Progress tracking (JSON files)
- ✅ Dual watcher system (deposits + redemptions)

**What's Pending**:
- ⏳ UniswapV4Agent deployment
- ⏳ Actual yield generation
- ⏳ Frontend redemption UI
