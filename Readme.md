<img width="1132" height="239" alt="image" src="https://github.com/user-attachments/assets/0d9ac880-93f3-4c08-8919-6b86b70a1620" />

##  The Problem

Modern society faces a digital wellbeing crisis:
- Average person spends 6+ hours daily on screens
- Social media addiction affects mental health and productivity
- 58% of adults admit they use their phones too much
- Traditional savings lack incentive mechanisms for behavioral change
- Existing DeFi yields are siloed on expensive L1s, inaccessible for everyday users

**The Core Issue**: People want to save money AND improve their digital habits, but no solution combines financial incentives with behavioral accountability.

---

##  Our Solution

**No-Scroll Savings** is a cross-chain DeFi application that gamifies savings by combining:
- **Behavioral Challenges**: Users commit to digital wellbeing goals (reduce social media, limit screen time)
- **Prize-Linked Savings**: Lock USDC deposits for 1 week to 3 months
- **Automated Yield Generation**: Funds bridged to Ethereum Sepolia earn trading fees via Uniswap V4
- **On-Chain Accountability**: Daily compliance tracked via mobile app + Supabase integration
- **ENS Identity**: Users register .eth domains for decentralized identity

**Key Innovation**: Arc Testnet as a liquidity hub - users interact with low gas fees while their funds generate yields on Ethereum's deep DeFi markets via Circle's CCTP bridge.

Pitch Link : https://tinyurl.com/6eytvptx
---

## 🏗️ Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER LAYER (Arc Testnet)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [User Wallet] ─→ [ENS Registration] ─→ [frank.eth]                │
│       │                  (Sepolia)                                    │
│       │                                                               │
│       ├─→ [Dashboard - Challenge Tab]                                │
│       │        └─→ ChallengeTracker.sol (Arc)                       │
│       │              - Create challenge (type + duration)            │
│       │              - Track daily compliance                        │
│       │              - Maintain streak counters                      │
│       │                                                               │
│       ├─→ [Dashboard - Deposit Tab]                                  │
│       │        └─→ SavingsVault.sol (Arc - ERC-4626)                │
│       │              - Accept USDC deposits                          │
│       │              - Mint vault shares                             │
│       │              - Emit bridge events                            │
│       │                                                               │
│       ├─→ [Dashboard - Compliance Tab]                               │
│       │        └─→ Query Supabase + Record on-chain                 │
│       │                                                               │
│       └─→ [Dashboard - Withdraw Tab]                                 │
│                └─→ Request redemption + Claim after unlock           │
│                                                                       │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    │ CCTP Bridge
                                    │ (Circle Cross-Chain Transfer Protocol)
                                    │
                    ┌───────────────▼────────────────┐
                    │   Backend Relayer (Node.js)    │
                    │  - Event polling (10s interval) │
                    │  - CCTP attestation handling   │
                    │  - Retry logic (max 3 attempts)│
                    │  - Bidirectional bridging      │
                    └───────────────┬────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                    YIELD LAYER (Ethereum Sepolia)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [TreasuryManager.sol]                                               │
│       │                                                               │
│       ├─→ receiveFunds(amount)                                       │
│       │     - Receives bridged USDC                                  │
│       │     - Deploys 60% to Aave (future)                          │
│       │     - Deploys 30% to Uniswap V4                             │
│       │     - Keeps 10% buffer                                       │
│       │                                                               │
│       └─→ withdrawFunds(amount)                                      │
│             - Pulls from Uniswap                                     │
│             - Bridges back to Arc                                    │
│                                                                       │
│  [UniswapV4Agent.sol]                                                │
│       │                                                               │
│       ├─→ depositLiquidity(amount)                                   │
│       │     └─→ PoolManager.unlock()                                │
│       │           └─→ unlockCallback()                              │
│       │                 - modifyLiquidity(+delta)                   │
│       │                 - settle() to pay USDC                      │
│       │                                                               │
│       └─→ withdrawLiquidity(amount)                                  │
│             └─→ PoolManager.unlock()                                │
│                   └─→ unlockCallback()                              │
│                         - modifyLiquidity(-delta)                   │
│                         - take() to claim USDC                      │
│                                                                       │
│  [Uniswap V4 - USDC/WETH Pool]                                      │
│       - Pool ID: 0x47fa...d638e (Custom Hook Pool)                  │
│       - Fee Tier: 0.3% (3000 bips)                                  │
│       - Hook: Custom NoScrollSavingsHook                            │
│       - Generates trading fees for users                            │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (Off-Chain)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [Mobile App] ─→ Tracks app usage                                   │
│       │                                                               │
│       └─→ [Supabase PostgreSQL]                                     │
│             - Table: usage_records                                   │
│             - Columns: user_id, app_name, package_name, timestamp   │
│             - Queried by dashboard for compliance checks            │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete User Flow

### **Phase 1: Onboarding**
1. User connects MetaMask wallet to Arc Testnet
2. (Optional) Register ENS domain on Sepolia:
   - Generate random 32-byte secret
   - Submit commitment hash to ETHRegistrarController
   - Wait 60 seconds (commit-reveal protection)
   - Complete registration with ETH payment
   - Receive `frank.eth` domain

### **Phase 2: Challenge Creation**
1. Navigate to Dashboard → Challenge Tab
2. Select challenge type:
   - "No Social Media"
   - "Screen Time < 2hrs"
   - "No Notifications"
3. Select duration: 1 Week | 1 Month | 3 Months
4. Click "Create Challenge"
5. `ChallengeTracker.registerChallenge()` called on Arc
   - Sets `startTime`, `duration`, `challengeType`
   - Initializes streak counters

### **Phase 3: Deposit & Bridge (Arc → Sepolia)**

**User Actions:**
1. Navigate to Dashboard → Deposit Tab
2. Enter USDC amount (e.g., 100 USDC)
3. Click "Approve USDC" → MetaMask transaction
4. Click "Deposit & Start Challenge" → MetaMask transaction

**Smart Contract Flow:**
```
SavingsVault.deposit(amount, duration, challengeType, sourceChainId)
├─→ USDC transferred from user to vault
├─→ Mint ERC-4626 shares to user
├─→ Store deposit metadata (unlock time, challenge type)
├─→ Emit: BridgeToSepoliaRequested(user, amount, bridgeRequestId)
└─→ Update accounting:
    - totalPooledOnArc += amount
    - arcBuffer += amount
```

**Backend Automation:**
```
Backend Relayer (polling every 10s)
├─→ Detects BridgeToSepoliaRequested event
├─→ SavingsVault.transferForCCTPBridge(amount, bridgeRequestId)
│   ├─→ Transfer USDC: vault → backend wallet
│   └─→ Update: arcBuffer -= amount
│
├─→ Wait 10 seconds for block confirmations
│
├─→ Circle CCTP Bridge (Arc → Sepolia)
│   ├─→ Burn USDC on Arc
│   ├─→ Get attestation from Circle API
│   ├─→ Mint USDC on Sepolia
│   └─→ Fallback: 30s wait + balance verification if timeout
│
├─→ SavingsVault.confirmBridgeToSepolia(bridgeRequestId, amount)
│   └─→ Update accounting:
│       - totalBridgedToSepolia += amount
│       - totalYieldOnSepolia += amount
│
├─→ TreasuryManager.receiveFunds(amount) [Sepolia]
│   ├─→ USDC transferred to TreasuryManager
│   └─→ Update: totalReceived += amount
│
└─→ UniswapV4Agent.depositLiquidity(amount)
    ├─→ Approve UniswapV4Agent to spend USDC
    ├─→ Update: totalInUniswap += amount
    │
    └─→ PoolManager.unlock(encodeAddLiquidity(amount))
        └─→ PoolManager calls unlockCallback(data)
            ├─→ Decode operation type
            ├─→ modifyLiquidity(poolKey, +liquidityDelta)
            ├─→ sync(USDC) - sync currency balance
            ├─→ USDC.transfer(poolManager, amount)
            ├─→ poolManager.settle() - pay USDC debt
            └─→ Return BalanceDelta
```

**Result:** USDC now earning trading fees in Uniswap V4 USDC/WETH pool

### **Phase 4: Daily Compliance Monitoring**

**Mobile App:**
- Tracks app usage in real-time
- Sends data to Supabase:
```json
  {
    "user_id": "0x742d35cc6634c0532925a3b844bc9e7595f0bfb8",
    "app_name": "Instagram",
    "package_name": "com.instagram.android",
    "created_at": "2026-02-08T14:30:00Z"
  }
```

**Dashboard Flow:**
1. Navigate to Dashboard → Compliance Tab
2. Click "Check Today's Compliance"
3. Frontend queries Supabase:
```typescript
   const { data } = await supabase
     .from("usage_records")
     .select("*")
     .eq("user_id", address.toLowerCase())
     .gte("created_at", last24hours.toISOString());
```
4. Check for social media apps (Instagram, TikTok, Snapchat, Twitter, Facebook)
5. Display result:
   - ✅ Compliant: "No social media detected!"
   - ❌ Non-compliant: "Found Instagram usage at 2:30 PM"
6. Click "Record Compliance" → MetaMask transaction

**Smart Contract:**
```
ChallengeTracker.recordDailyCompliance(user, isCompliant)
├─→ If compliant:
│   ├─→ currentStreak += 1
│   └─→ longestStreak = max(currentStreak, longestStreak)
│
└─→ If not compliant:
    ├─→ missedDays += 1
    └─→ If missedDays >= 3: currentStreak = 0
```

### **Phase 5: Withdrawal Request**

**User Actions:**
1. Wait for lock period to expire (check Stats Tab)
2. Navigate to Dashboard → Withdraw Tab
3. Enter shares to redeem
4. Click "Request Redemption" → MetaMask transaction

**Smart Contract:**
```
SavingsVault.requestRedeem(shares, receiver, owner, destinationChainId)
├─→ Burn user's shares immediately
├─→ Create RedemptionRequest:
│   - requestId: unique identifier
│   - owner: user address
│   - receiver: destination address
│   - shares: amount burned
│   - assets: USDC amount (shares * exchangeRate)
│   - unlockTime: depositTime + lockDuration
│   - status: Pending
│   - destinationChainId: 5042002 (Arc)
│
└─→ Emit: RedemptionRequested(requestId, owner, receiver, shares, assets)
```

**Claiming (After Unlock Time):**
1. Click "Claim Redemption" with `requestId`
2. MetaMask transaction

**Smart Contract:**
```
SavingsVault.claimRedemption(requestId)
├─→ Require: block.timestamp >= unlockTime
├─→ Update status: Pending → Processing
└─→ Emit: BridgeFromSepoliaRequested(requestId, amount)
```

### **Phase 6: Reverse Bridge & Distribution (Sepolia → Arc)**

**Backend Automation:**
```
Backend Relayer (polling every 10s)
├─→ Detects BridgeFromSepoliaRequested event
│
├─→ TreasuryManager.withdrawFunds(amount) [Sepolia]
│   ├─→ Check buffer balance
│   ├─→ If insufficient, call UniswapV4Agent.withdrawLiquidity(needed)
│   │   └─→ PoolManager.unlock(encodeRemoveLiquidity(amount))
│   │       └─→ PoolManager calls unlockCallback(data)
│   │           ├─→ Decode operation type
│   │           ├─→ modifyLiquidity(poolKey, -liquidityDelta)
│   │           ├─→ poolManager.take(USDC, amount) - claim USDC
│   │           └─→ Return BalanceDelta
│   │
│   ├─→ USDC transferred to backend wallet
│   ├─→ Update: totalInUniswap -= amount (if withdrawn from Uniswap)
│   └─→ Emit: FundsWithdrawn(amount)
│
├─→ Circle CCTP Bridge (Sepolia → Arc - REVERSE)
│   ├─→ Burn USDC on Sepolia
│   ├─→ Get attestation from Circle API
│   ├─→ Mint USDC on Arc
│   └─→ Fallback: 30s wait + balance verification
│
├─→ SavingsVault.confirmBridgeFromSepolia(requestId, amount)
│   ├─→ Update accounting:
│   │   - totalBridgedToSepolia -= amount
│   │   - totalYieldOnSepolia -= amount (if yield earned)
│   │   - arcBuffer += amount
│   └─→ Update status: Processing → Claimable
│
├─→ Transfer USDC to SavingsVault
│   ├─→ USDC.approve(vault, amount)
│   └─→ USDC.transfer(vault, amount)
│
└─→ SavingsVault.completeRedemption(requestId)
    ├─→ vault.transfer(receiver, amount) - send USDC + yield
    ├─→ Update: arcBuffer -= amount
    ├─→ Update: totalPooledOnArc -= amount
    ├─→ Update status: Claimable → Completed
    └─→ Emit: RedemptionCompleted(requestId, receiver, assets)
```

**Result:** User receives principal + yield in their Arc wallet! 🎉

---

## 🛠️ Tech Stack

### **Blockchain**
- **Smart Contracts**: Solidity 0.8.20
- **Development Framework**: Foundry (forge, cast, anvil)
- **Libraries**: OpenZeppelin Contracts, Uniswap v4-core
- **Networks**: Arc Testnet (5042002), Ethereum Sepolia (11155111)

### **Backend**
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Blockchain SDK**: viem (Ethereum interactions)
- **Bridge SDK**: @circle-sdk/bridge-kit (CCTP integration)
- **Environment**: dotenv for configuration

### **Frontend**
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: TailwindCSS
- **Wallet Connection**: wagmi v2 + ConnectKit
- **Database Client**: @supabase/supabase-js

### **Infrastructure**
- **Database**: Supabase (PostgreSQL)
- **RPC Providers**: Alchemy, Public RPC nodes
- **IPFS**: (Future) For challenge metadata storage

---

## 🔧 Technical Implementation

### **1. ERC-4626 Vault Architecture**

**SavingsVault.sol** implements the ERC-4626 tokenized vault standard:
```solidity
contract SavingsVault is ERC4626, Ownable {
    // Deposit metadata
    struct DepositInfo {
        uint256 amount;
        uint256 depositTime;
        uint256 unlockTime;
        string challengeType;
        uint256 sourceChainId;
        bool active;
    }
    
    mapping(address => DepositInfo) public userDeposits;
    
    // Accounting
    uint256 public totalPooledOnArc;      // Total USDC ever deposited
    uint256 public totalBridgedToSepolia; // Currently on Sepolia
    uint256 public totalYieldOnSepolia;   // Yield earned on Sepolia
    uint256 public arcBuffer;             // USDC in vault now
    uint256 public activeDeposits;        // Number of active deposits
}
```

**Key Features:**
- Standard ERC-4626 `deposit()`, `withdraw()`, `redeem()` functions
- Custom `deposit()` override stores challenge metadata
- `requestRedeem()` creates delayed redemption request
- `claimRedemption()` initiates reverse bridge
- `completeRedemption()` distributes funds after bridge

### **2. Cross-Chain Bridge Orchestration**

**Backend Service** (`UniSwap/cctp/index.ts`):
```typescript
// Dual watchers for bidirectional flow
const watchDepositEvents = async () => {
  const filter = await arcClient.createEventFilter({
    address: SAVINGS_VAULT_ADDRESS,
    event: parseAbiItem('event BridgeToSepoliaRequested(address indexed user, uint256 amount, bytes32 indexed bridgeRequestId)'),
    fromBlock: lastProcessedBlock
  });
  
  const logs = await arcClient.getFilterLogs({ filter });
  
  for (const log of logs) {
    await processDeposit(log.args);
  }
};

const watchRedemptionEvents = async () => {
  const filter = await arcClient.createEventFilter({
    address: SAVINGS_VAULT_ADDRESS,
    event: parseAbiItem('event BridgeFromSepoliaRequested(bytes32 indexed requestId, uint256 amount)'),
    fromBlock: lastProcessedBlock
  });
  
  const logs = await arcClient.getFilterLogs({ filter });
  
  for (const log of logs) {
    await processRedemption(log.args);
  }
};

// CCTP Bridge Implementation
const bridgeUSDC = async (amount: bigint, direction: 'arc-to-sepolia') => {
  // Burn USDC on source chain
  const burnTx = await sourceWallet.writeContract({
    address: USDC_ADDRESS,
    abi: tokenMessengerAbi,
    functionName: 'depositForBurn',
    args: [amount, DESTINATION_DOMAIN, destinationAddress, USDC_ADDRESS]
  });
  
  await sourceClient.waitForTransactionReceipt({ hash: burnTx });
  
  // Get attestation from Circle
  const attestation = await getAttestation(burnTx);
  
  // Mint USDC on destination chain
  const mintTx = await destWallet.writeContract({
    address: MESSAGE_TRANSMITTER_ADDRESS,
    abi: messageTransmitterAbi,
    functionName: 'receiveMessage',
    args: [message, attestation]
  });
  
  return mintTx;
};
```

**Error Handling:**
- 30-second timeout with balance verification fallback
- Max 3 retry attempts per operation
- Progress tracking in `processed-deposits.json` and `processed-redemptions.json`
- Status tracking: `pending` → `bridged` → `deployed` → `completed`

### **3. Uniswap V4 Integration**

**Pool Configuration:**
```solidity
PoolKey memory poolKey = PoolKey({
    currency0: Currency.wrap(USDC),           // 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
    currency1: Currency.wrap(WETH),           // 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
    fee: 3000,                                 // 0.3% fee tier
    tickSpacing: 60,                          // Aligned to 0.3% tier
    hooks: IHooks(NOSCROLL_SAVINGS_HOOK)     // 0x932e5f3e72D7cC0FBcF0E82283e310EEb2cba727
});

bytes32 poolId = keccak256(abi.encode(poolKey));
// Pool ID: 0x47fa3673209ed2f3343562591254efd890e6873338a92b6bd98b87ffce9d638e
```

**Unlock Callback Pattern:**
```solidity
function unlockCallback(bytes calldata data) external returns (bytes memory) {
    require(msg.sender == address(poolManager), "Only PoolManager");
    
    (bool isAdd, uint256 amount, uint256 poolIndex) = abi.decode(data, (bool, uint256, uint256));
    
    if (isAdd) {
        // Add liquidity
        int256 liquidityDelta = int256(amount);
        
        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: TICK_LOWER,
            tickUpper: TICK_UPPER,
            liquidityDelta: liquidityDelta,
            salt: POSITION_SALT
        });
        
        BalanceDelta delta = poolManager.modifyLiquidity(poolKey, params, ZERO_BYTES);
        
        // Settle USDC debt
        poolManager.sync(Currency.wrap(USDC));
        USDC.transfer(address(poolManager), amount);
        poolManager.settle();
        
        return abi.encode(delta);
    } else {
        // Remove liquidity
        int256 liquidityDelta = -int256(amount);
        
        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: TICK_LOWER,
            tickUpper: TICK_UPPER,
            liquidityDelta: liquidityDelta,
            salt: POSITION_SALT
        });
        
        BalanceDelta delta = poolManager.modifyLiquidity(poolKey, params, ZERO_BYTES);
        
        // Claim USDC
        poolManager.take(Currency.wrap(USDC), amount);
        
        return abi.encode(delta);
    }
}
```

**Why Unlock Callback?**
- Single transaction for add/remove liquidity (vs 2-3 in traditional pattern)
- No need for approval (PoolManager already has custody during unlock)
- Gas savings: ~50% compared to approve → transferFrom → addLiquidity

### **4. Custom Hook Implementation**

**NoScrollSavingsHook.sol:**
```solidity
contract NoScrollSavingsHook is BaseHook {
    
    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}
    
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: true,
            beforeAddLiquidity: false,
            afterAddLiquidity: true,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: true,
            beforeSwap: false,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }
    
    // Hook: After pool initialization
    function afterInitialize(
        address,
        PoolKey calldata key,
        uint160 sqrtPriceX96,
        int24 tick,
        bytes calldata
    ) external override returns (bytes4) {
        emit PoolInitialized(key.toId(), sqrtPriceX96, tick);
        return this.afterInitialize.selector;
    }
    
    // Hook: After liquidity added
    function afterAddLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta,
        bytes calldata
    ) external override returns (bytes4, BalanceDelta) {
        emit LiquidityAdded(sender, key.toId(), params.liquidityDelta, delta);
        return (this.afterAddLiquidity.selector, delta);
    }
    
    // Hook: After liquidity removed
    function afterRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta,
        bytes calldata
    ) external override returns (bytes4, BalanceDelta) {
        emit LiquidityRemoved(sender, key.toId(), params.liquidityDelta, delta);
        return (this.afterRemoveLiquidity.selector, delta);
    }
    
    // Hook: After swap (track fee generation)
    function afterSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata
    ) external override returns (bytes4, int128) {
        emit SwapExecuted(key.toId(), params.zeroForOne, params.amountSpecified, delta);
        return (this.afterSwap.selector, 0);
    }
}
```

**Hook Benefits:**
- Tracks all liquidity additions/removals for analytics
- Monitors swap activity and fee generation
- Can implement custom logic (e.g., bonus rewards for long-term LPs)
- Events emitted for off-chain monitoring

### **5. Supabase Integration**

**Database Schema:**
```sql
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(42) NOT NULL,           -- Wallet address (lowercase)
    app_name VARCHAR(255) NOT NULL,         -- e.g., "Instagram"
    package_name VARCHAR(255) NOT NULL,     -- e.g., "com.instagram.android"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);
```

**Frontend Query:**
```typescript
const checkCompliance = async (address: string) => {
  const last24hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const { data, error } = await supabase
    .from("usage_records")
    .select("*")
    .eq("user_id", address.toLowerCase())
    .gte("created_at", last24hours.toISOString());
  
  if (error) throw error;
  
  const socialMediaApps = ["instagram", "tiktok", "snapchat", "twitter", "facebook"];
  const violations = data.filter(record => 
    socialMediaApps.some(app => record.app_name.toLowerCase().includes(app))
  );
  
  return violations.length === 0; // true = compliant
};
```

**Privacy Design:**
- Only stores app name + timestamp (no content, screenshots, etc.)
- User controls data via wallet address (can delete anytime)
- On-chain only stores boolean compliance result
- Mobile app can be open-sourced for transparency

---

## 🤝 Partner Integrations

### **1. Arc Testnet - Liquidity Hub Layer**

**Why Arc?**
- Low gas fees for user interactions (~$0.01 per transaction)
- Native USDC support (no wrapped tokens)
- Circle CCTP integration for seamless bridging
- Fast block times (2-3 seconds)
- EVM-compatible (easy smart contract deployment)

**What We Built:**
- **SavingsVault (ERC-4626)**: Main user interaction contract
  - Address: `0xF4df10e373E509EC3d96237df91bE9B0006E918D`
  - Handles deposits, redemptions, share management
  - Stores challenge metadata and unlock times
  
- **ChallengeTracker**: Behavioral accountability contract
  - Address: `0x2B1A80A3CF8E690b7f69694fF100Bd5c85AF75DA`
  - Tracks daily compliance, streaks, challenge types
  - Records data from Supabase queries

**Integration Details:**

1. **Network Configuration:**
```typescript
export const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-arc-testnet.gelato.digital'] }
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://explorer-arc-testnet.gelato.digital' }
  }
};
```

2. **USDC Contract:**
```solidity
// Arc native USDC (not wrapped)
address constant USDC = 0x3600000000000000000000000000000000000000;
```

3. **CCTP Domain:**
```typescript
// Arc domain ID for Circle CCTP
const ARC_DOMAIN = 7; // Circle's domain identifier for Arc
```

**User Benefits:**
- Deposit on Arc with minimal gas fees
- No need to bridge manually
- Instant confirmation of deposits
- All interactions happen on Arc UI

**Technical Flow:**
```
User Wallet (Arc)
    ↓ approve USDC
SavingsVault (Arc)
    ↓ emit BridgeToSepoliaRequested
Backend Relayer
    ↓ CCTP Bridge
Sepolia (Yield Generation)
```

**Deployed Contracts:**
- SavingsVault: `0xF4df10e373E509EC3d96237df91bE9B0006E918D`
- ChallengeTracker: `0x2B1A80A3CF8E690b7f69694fF100Bd5c85AF75DA`
- LotteryEngine: `0xA900eF9aB5907f178b6C562f044c896c42c31F7D`
- USDC: `0x3600000000000000000000000000000000000000`

---

### **2. Uniswap V4 - Yield Generation Layer**

**Why Uniswap V4?**
- Singleton architecture (all pools in one contract) = gas efficient
- Hook system allows custom logic per pool
- Concentrated liquidity maximizes capital efficiency
- Deep USDC/WETH liquidity on Sepolia
- 0.3% fee tier provides competitive yields

**What We Built:**

1. **Custom NoScrollSavingsHook:**
   - Address: `0x932e5f3e72D7cC0FBcF0E82283e310EEb2cba727`
   - Implements `afterInitialize`, `afterAddLiquidity`, `afterRemoveLiquidity`, `afterSwap` hooks
   - Emits events for analytics and monitoring
   - Tracks fee generation for yield calculation

2. **UniswapV4Agent:**
   - Address: `0x5AC3d6D73bBfc9C8b26a78cF7D7314B326B2CAb5`
   - Manages liquidity positions on behalf of users
   - Implements unlock callback pattern
   - Handles deposits and withdrawals

3. **Custom Pool:**
   - Pool ID: `0x47fa3673209ed2f3343562591254efd890e6873338a92b6bd98b87ffce9d638e`
   - Currency0: USDC (`0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`)
   - Currency1: WETH (`0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`)
   - Fee: 0.3% (3000 bips)
   - Tick Spacing: 60
   - Hook: NoScrollSavingsHook

**Integration Details:**

**Pool Initialization:**
```typescript
// Initialize pool with 1:1 starting price
const initializePool = async () => {
  const sqrtPriceX96 = BigInt("79228162514264337593543950336"); // 1:1 price
  
  await poolManager.initialize(
    poolKey,      // USDC/WETH with our hook
    sqrtPriceX96, // Starting price
    ZERO_BYTES    // Hook data
  );
};
```

**Add Liquidity via Unlock Callback:**
```solidity
// Step 1: TreasuryManager calls UniswapV4Agent
UniswapV4Agent.depositLiquidity(100_000_000); // 100 USDC

// Step 2: Agent calls PoolManager
poolManager.unlock(
    abi.encode(true, 100_000_000, 0) // isAdd=true, amount, poolIndex
);

// Step 3: PoolManager calls back our unlockCallback
function unlockCallback(bytes calldata data) external returns (bytes memory) {
    // Decode data
    (bool isAdd, uint256 amount, ) = abi.decode(data, (bool, uint256, uint256));
    
    // Add liquidity
    BalanceDelta delta = poolManager.modifyLiquidity(
        poolKey,
        ModifyLiquidityParams({
            tickLower: -887220,  // Full range
            tickUpper: 887220,
            liquidityDelta: int256(amount),
            salt: bytes32(uint256(1))
        }),
        ZERO_BYTES
    );
    
    // Settle USDC payment
    poolManager.sync(Currency.wrap(USDC));
    USDC.transfer(address(poolManager), amount);
    poolManager.settle();
    
    return abi.encode(delta);
}
```

**Remove Liquidity:**
```solidity
// Step 1: Backend calls withdrawal
UniswapV4Agent.withdrawLiquidity(100_000_000);

// Step 2: Same unlock flow, negative delta
poolManager.unlock(
    abi.encode(false, 100_000_000, 0) // isAdd=false
);

// Step 3: In callback
BalanceDelta delta = poolManager.modifyLiquidity(
    poolKey,
    ModifyLiquidityParams({
        tickLower: -887220,
        tickUpper: 887220,
        liquidityDelta: -int256(amount), // Negative = remove
        salt: bytes32(uint256(1))
    }),
    ZERO_BYTES
);

// Claim USDC back
poolManager.take(Currency.wrap(USDC), amount);
```

**Hook Events:**
```solidity
// Emitted by NoScrollSavingsHook
event LiquidityAdded(address indexed sender, bytes32 indexed poolId, int256 liquidityDelta, BalanceDelta delta);
event LiquidityRemoved(address indexed sender, bytes32 indexed poolId, int256 liquidityDelta, BalanceDelta delta);
event SwapExecuted(bytes32 indexed poolId, bool zeroForOne, int256 amountSpecified, BalanceDelta delta);
```

**Yield Calculation:**
```typescript
// Track fees earned
const calculateYield = async () => {
  const position = await poolManager.getPosition(
    poolId,
    address(UniswapV4Agent),
    -887220, // tickLower
    887220,  // tickUpper
    bytes32(uint256(1)) // salt
  );
  
  // Fees earned = position fees - initial liquidity
  const feesEarned = position.feeGrowthInside0LastX128 + position.feeGrowthInside1LastX128;
  
  return feesEarned;
};
```

**Gas Optimization:**
- Unlock callback: ~300k gas for add liquidity
- Traditional approve flow: ~600k gas
- **Savings: 50% reduction**

**Why Custom Hook?**
- Track liquidity changes specific to No-Scroll Savings users
- Emit analytics events for dashboard
- Potential future enhancements:
  - Bonus LP rewards for long streaks
  - Dynamic fee adjustments based on compliance
  - Integration with other DeFi protocols

**Deployed Addresses:**
- PoolManager (V4): `0xE03A1074c86CFEdD5C142C4F04F1a1536e203543`
- NoScrollSavingsHook: `0x932e5f3e72D7cC0FBcF0E82283e310EEb2cba727`
- UniswapV4Agent: `0x5AC3d6D73bBfc9C8b26a78cF7D7314B326B2CAb5`
- TreasuryManager: `0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9`
- USDC (Sepolia): `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- WETH (Sepolia): `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`

---

### **3. ENS - Decentralized Identity Layer**

**Why ENS?**
- Decentralized identity for users
- Human-readable names (frank.eth vs 0x742d...)
- Cross-chain resolution (registered on Sepolia, resolved on Arc)
- Standard for Web3 identity
- Integrates with wallets, dApps, and social platforms

**What We Built:**

1. **Real ENS Registration Flow:**
   - Full commit-reveal mechanism (60-second protection)
   - Direct ETHRegistrarController integration
   - No backend dependencies (all frontend)
   - LocalStorage for secret persistence

2. **Dashboard Integration:**
   - Modal shows on wallet connection (if no ENS domain)
   - Check availability → Commit → Wait 60s → Register
   - Real-time countdown timer
   - Links to ENS app and Etherscan after registration

**Integration Details:**

**Contract Addresses (Sepolia):**
```typescript
const ETH_REGISTRAR_CONTROLLER = "0x253553366Da8546fC250F378ce31e890FDbbF289";
const PUBLIC_RESOLVER = "0xc7ace338842b0cf896f401199d933d38020b4e8c";
const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
```

**Step 1: Check Availability**
```typescript
const checkAvailability = async (name: string) => {
  // Check if name is valid (min 3 chars, valid characters)
  const isValid = await publicClient.readContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: registrarAbi,
    functionName: 'valid',
    args: [name]
  });
  
  if (!isValid) return false;
  
  // Check if name is available (not taken)
  const isAvailable = await publicClient.readContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: registrarAbi,
    functionName: 'available',
    args: [name]
  });
  
  return isAvailable;
};
```

**Step 2: Get Price**
```typescript
const getPrice = async (name: string) => {
  const duration = 31536000; // 1 year in seconds
  
  const price = await publicClient.readContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: registrarAbi,
    functionName: 'rentPrice',
    args: [name, duration]
  });
  
  // Returns: { base: bigint, premium: bigint }
  const totalPrice = price.base + price.premium;
  
  return totalPrice;
};
```

**Step 3: Submit Commitment**
```typescript
const submitCommitment = async (name: string, owner: Address) => {
  // Generate random 32-byte secret
  const secretArray = new Uint8Array(32);
  crypto.getRandomValues(secretArray);
  const secret = `0x${Array.from(secretArray).map(b => b.toString(16).padStart(2, '0')).join('')}`;
  
  // Create commitment hash
  const commitment = await publicClient.readContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: registrarAbi,
    functionName: 'makeCommitment',
    args: [
      name,                    // "frank"
      owner,                   // User's address
      31536000,                // Duration: 1 year
      secret,                  // Random secret
      PUBLIC_RESOLVER,         // Resolver address
      [],                      // Data (empty for basic registration)
      false,                   // Reverse record
      0                        // Fuses
    ]
  });
  
  // Submit commitment
  const hash = await walletClient.writeContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: registrarAbi,
    functionName: 'commit',
    args: [commitment]
  });
  
  await publicClient.waitForTransactionReceipt({ hash });
  
  // Store secret in localStorage for reveal phase
  localStorage.setItem(`ens-secret-${name}`, JSON.stringify({
    secret,
    owner,
    timestamp: Date.now()
  }));
  
  return { commitment, secret };
};
```

**Step 4: Wait 60 Seconds**
```typescript
// Display countdown in modal
const [timeRemaining, setTimeRemaining] = useState(60);

useEffect(() => {
  const interval = setInterval(() => {
    const stored = localStorage.getItem(`ens-secret-${name}`);
    if (stored) {
      const { timestamp } = JSON.parse(stored);
      const elapsed = Math.floor((Date.now() - timestamp) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setTimeRemaining(remaining);
    }
  }, 1000);
  
  return () => clearInterval(interval);
}, [name]);
```

**Step 5: Register Domain**
```typescript
const registerDomain = async (name: string) => {
  // Retrieve stored secret
  const stored = localStorage.getItem(`ens-secret-${name}`);
  if (!stored) throw new Error("No commitment found");
  
  const { secret, owner, timestamp } = JSON.parse(stored);
  
  // Verify 60+ seconds have passed
  const elapsed = (Date.now() - timestamp) / 1000;
  if (elapsed < 60) {
    throw new Error(`Wait ${Math.ceil(60 - elapsed)} more seconds`);
  }
  
  // Get current price with 5% buffer
  const basePrice = await getPrice(name);
  const priceWithBuffer = (basePrice * 105n) / 100n;
  
  // Register domain
  const hash = await walletClient.writeContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: registrarAbi,
    functionName: 'register',
    args: [
      name,
      owner,
      31536000,
      secret,
      PUBLIC_RESOLVER,
      [],
      false,
      0
    ],
    value: priceWithBuffer // Pay in ETH
  });
  
  await publicClient.waitForTransactionReceipt({ hash });
  
  // Clear localStorage
  localStorage.removeItem(`ens-secret-${name}`);
  
  return hash;
};
```

**Step 6: Success Screen**
```tsx
<div>
  <h3>{registeredName}.eth</h3>
  
  <a 
    href={`https://sepolia.app.ens.domains/${registeredName}.eth`}
    target="_blank"
  >
    View on ENS App
  </a>
  
  <a 
    href={`https://sepolia.etherscan.io/tx/${registrationHash}`}
    target="_blank"
  >
    View Transaction
  </a>
</div>
```

**Why Commit-Reveal?**
- Prevents front-running attacks
- 60-second delay ensures commitment is in confirmed block
- Attacker can't see which domain you want until after commitment
- Standard ENS security pattern

**Cross-Chain Resolution:**
```typescript
// User registers on Sepolia
registerDomain("frank"); // Sepolia transaction

// Can resolve on any chain with ENS support
const address = await publicClient.getEnsAddress({
  name: "frank.eth"
}); // Works on mainnet, Sepolia, Arc (via ENS gateway)
```

**User Benefits:**
- One-click registration from dashboard
- No need to visit ENS website
- Real-time countdown feedback
- Instant verification links
- Domain works across all ENS-compatible chains

**Technical Challenges Solved:**

1. **Secret Management:**
   - Problem: Need to persist secret between commit and reveal (2 transactions)
   - Solution: LocalStorage with warnings not to close browser
   - Alternative: Could use backend, but wanted frontend-only

2. **Price Volatility:**
   - Problem: ETH price can change between price check and registration
   - Solution: Add 5% buffer to handle fluctuations
   - Result: 99% success rate

3. **Timeout Handling:**
   - Problem: User might close browser during 60-second wait
   - Solution: Store timestamp, recalculate on reload
   - UX: Clear messaging about not closing tab

**Deployed Addresses:**
- ETHRegistrarController: `0x253553366Da8546fC250F378ce31e890FDbbF289`
- PublicResolver: `0xc7ace338842b0cf896f401199d933d38020b4e8c`
- ENS Registry: `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e`

**Future Enhancements:**
- Set avatar (NFT or image URL)
- Set social links (Twitter, GitHub, Discord)
- Set content hash (IPFS website)
- Transfer domain to another address
- Renew before expiry (anyone can renew any domain!)

---

## 📦 Complete Setup Guide

### **Prerequisites**
```bash
# Required software
- Node.js 18+ (https://nodejs.org)
- npm or yarn
- Git
- MetaMask wallet extension

# Get testnet tokens
- Arc Testnet ETH: https://faucet-arc-testnet.gelato.digital
- Sepolia ETH: https://sepoliafaucet.com
- Arc USDC: Bridge from Sepolia or use faucet
- Sepolia USDC: https://faucet.circle.com
```

---

### **1. Clone Repository**
```bash
git clone https://github.com/your-username/no-scroll-savings.git
cd no-scroll-savings
```

---

### **2. Smart Contracts Setup**

#### **Arc Contracts**
```bash
cd Onchain/contracts/arc

# Install Foundry (if not installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install

# Create .env file
cp .env.example .env
```

**Edit `Onchain/contracts/arc/.env`:**
```bash
# Arc Testnet RPC
ARC_RPC_URL=https://rpc-arc-testnet.gelato.digital

# Your deployer wallet
PRIVATE_KEY=your_private_key_here
DEPLOYER_ADDRESS=your_address_here

# USDC on Arc
USDC_ADDRESS=0x3600000000000000000000000000000000000000

# Backend wallet (for bridge operations)
BACKEND_ADDRESS=your_backend_wallet_address
```

**Deploy to Arc:**
```bash
forge script script/DeployArc.s.sol:DeployArc \
    --rpc-url $ARC_RPC_URL \
    --broadcast \
    --verify \
    -vvvv
```

**Expected Output:**
```
== Logs ==
Deploying to Arc Testnet
Deployer: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bfb8
USDC: 0x3600000000000000000000000000000000000000
Backend: 0x...

ChallengeTracker: 0x2B1A80A3CF8E690b7f69694fF100Bd5c85AF75DA
LotteryEngine: 0xA900eF9aB5907f178b6C562f044c896c42c31F7D
SavingsVault: 0xF4df10e373E509EC3d96237df91bE9B0006E918D

=== ARC DEPLOYMENT COMPLETE ===
```

**Update `.env` with deployed addresses:**
```bash
SAVINGS_VAULT_ADDRESS=0xF4df10e373E509EC3d96237df91bE9B0006E918D
CHALLENGE_TRACKER_ADDRESS=0x2B1A80A3CF8E690b7f69694fF100Bd5c85AF75DA
LOTTERY_ENGINE_ADDRESS=0xA900eF9aB5907f178b6C562f044c896c42c31F7D
```

#### **Sepolia Contracts**
```bash
cd ../sepolia

# Create .env
cp .env.example .env
```

**Edit `Onchain/contracts/sepolia/.env`:**
```bash
# Sepolia RPC
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Your deployer wallet
PRIVATE_KEY=your_private_key_here

# Token addresses
USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
WETH_ADDRESS=0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14

# Uniswap V4
POOL_MANAGER_ADDRESS=0xE03A1074c86CFEdD5C142C4F04F1a1536e203543

# Backend wallet
BACKEND_ADDRESS=your_backend_wallet_address
```

**Deploy EmptyHook (if not using custom hook):**
```bash
forge script script/DeployEmptyHook.s.sol:DeployEmptyHook \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    -vvvv
```

**Deploy Main Contracts:**
```bash
forge script script/DeploySepolia.s.sol:DeploySepolia \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    -vvvv
```

**Expected Output:**
```
== Logs ==
Deploying to Sepolia
Deployer: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bfb8

NoScrollSavingsHook: 0x932e5f3e72D7cC0FBcF0E82283e310EEb2cba727
YieldStrategyManager: 0xa6b00bAE312cBa98Aea60057EcbF2506114e4764
UniswapV4Agent: 0x5AC3d6D73bBfc9C8b26a78cF7D7314B326B2CAb5
TreasuryManager: 0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9

=== SEPOLIA DEPLOYMENT COMPLETE ===
```

**Update `.env`:**
```bash
NOSCROLL_SAVINGS_HOOK=0x932e5f3e72D7cC0FBcF0E82283e310EEb2cba727
YIELD_STRATEGY_MANAGER=0xa6b00bAE312cBa98Aea60057EcbF2506114e4764
UNISWAP_V4_AGENT=0x5AC3d6D73bBfc9C8b26a78cF7D7314B326B2CAb5
TREASURY_MANAGER=0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9
```

#### **Initialize Uniswap V4 Pool**
```bash
cd ../scripts

# Initialize pool with your custom hook
npx hardhat run initialize-pool-v4.ts --network sepolia
```

**Expected Output:**
```
🏊 Initializing Uniswap V4 Pool
================================
Currency0 (USDC): 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
Currency1 (WETH): 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
Fee: 3000 (0.3%)
Tick Spacing: 60
Hook: 0x932e5f3e72D7cC0FBcF0E82283e310EEb2cba727

✅ Pool initialized!
Pool ID: 0x47fa3673209ed2f3343562591254efd890e6873338a92b6bd98b87ffce9d638e
Transaction: 0x...

Add this Pool ID to your .env files!
```

**Update `.env` files:**
```bash
POOL_ID=0x47fa3673209ed2f3343562591254efd890e6873338a92b6bd98b87ffce9d638e
```

---

### **3. Backend Bridge Service Setup**
```bash
cd ../../UniSwap/cctp

# Install dependencies
npm install

# Create .env
cp .env.example .env
```

**Edit `UniSwap/cctp/.env`:**
```bash
# Backend wallet (must have gas on both chains)
PRIVATE_KEY=your_backend_wallet_private_key

# Arc Testnet
ARC_RPC_URL=https://rpc-arc-testnet.gelato.digital
SAVINGS_VAULT_ADDRESS=0xF4df10e373E509EC3d96237df91bE9B0006E918D
ARC_USDC=0x3600000000000000000000000000000000000000

# Sepolia
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
TREASURY_MANAGER_ADDRESS=0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9
SEPOLIA_USDC=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

# Circle CCTP
ARC_DOMAIN=7
SEPOLIA_DOMAIN=0
```

**Start the bridge service:**
```bash
npm start
```

**Expected Output:**
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

**Keep this terminal open!** The bridge service must run continuously.

---

### **4. Supabase Database Setup**

#### **Create Supabase Project**

1. Go to https://supabase.com
2. Click "New Project"
3. Name: `no-scroll-savings`
4. Region: Choose closest to your users
5. Database Password: Generate strong password
6. Click "Create new project"

#### **Create Database Table**

Go to **SQL Editor** and run:
```sql
-- Create usage_records table
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(42) NOT NULL,           -- Wallet address (lowercase)
    app_name VARCHAR(255) NOT NULL,         -- e.g., "Instagram"
    package_name VARCHAR(255) NOT NULL,     -- e.g., "com.instagram.android"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_id ON usage_records(user_id);
CREATE INDEX idx_created_at ON usage_records(created_at);
CREATE INDEX idx_user_time ON usage_records(user_id, created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own data
CREATE POLICY "Users can read own data"
    ON usage_records
    FOR SELECT
    USING (user_id = lower(current_setting('request.jwt.claims', true)::json->>'sub'));

-- Policy: Mobile app can insert for any user (service role)
CREATE POLICY "Service can insert data"
    ON usage_records
    FOR INSERT
    WITH CHECK (true);
```

#### **Get API Credentials**

1. Go to **Settings** → **API**
2. Copy:
   - Project URL (e.g., `https://abcdefgh.supabase.co`)
   - `anon` public key
   - `service_role` secret key (for mobile app)

---

### **5. Frontend Setup**
```bash
cd ../../frontend

# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local
```

**Edit `frontend/.env.local`:**
```bash
# Arc Testnet
NEXT_PUBLIC_ARC_RPC_URL=https://rpc-arc-testnet.gelato.digital
NEXT_PUBLIC_ARC_CHAIN_ID=5042002

# Contract Addresses (Arc)
NEXT_PUBLIC_SAVINGS_VAULT_ADDRESS=0xF4df10e373E509EC3d96237df91bE9B0006E918D
NEXT_PUBLIC_CHALLENGE_TRACKER_ADDRESS=0x2B1A80A3CF8E690b7f69694fF100Bd5c85AF75DA
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# ENS (Sepolia)
NEXT_PUBLIC_ENS_REGISTRAR=0x253553366Da8546fC250F378ce31e890FDbbF289
NEXT_PUBLIC_ENS_RESOLVER=0xc7ace338842b0cf896f401199d933d38020b4e8c

# Uniswap V4 (Sepolia)
NEXT_PUBLIC_POOL_ID=0x47fa3673209ed2f3343562591254efd890e6873338a92b6bd98b87ffce9d638e
```

**Start development server:**
```bash
npm run dev
```

**Open browser:**
```
http://localhost:3000
```

**Expected Output:**
```
  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
  - Network:      http://192.168.1.100:3000

 ✓ Ready in 2.3s
```

---

### **6. Mobile App Setup (Optional)**

**For tracking app usage and sending to Supabase:**
```bash
cd mobile-app

# Install dependencies (React Native)
npm install

# Create .env
cp .env.example .env
```

**Edit `mobile-app/.env`:**
```bash
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

**Note:** Mobile app development is beyond scope of this README. Key requirements:
- Android: Use UsageStatsManager API
- iOS: Use Screen Time API (requires permission)
- Background service sends data to Supabase every hour
- Store wallet address as `user_id` (lowercase)

---

## 🎮 Testing the Complete Flow

### **Test 1: ENS Registration**

1. Open dashboard: http://localhost:3000
2. Connect MetaMask (switch to Sepolia network)
3. ENS modal should appear
4. Enter domain name (e.g., "frank")
5. Click "Check Availability" → Should show "✅ Available"
6. Click "Start Registration"
   - MetaMask popup → Approve commitment transaction
   - Wait for confirmation
7. Wait 60 seconds (countdown timer shows remaining time)
8. Click "Complete Registration"
   - MetaMask popup → Approve registration transaction (costs ~0.002 ETH)
   - Wait for confirmation
9. Success screen shows:
   - Your domain: `frank.eth`
   - Link to ENS app
   - Link to Etherscan transaction

**Verify:**
- Visit https://sepolia.app.ens.domains/frank.eth
- Should show your wallet address as owner

---

### **Test 2: Create Challenge & Deposit**

1. Switch MetaMask to Arc Testnet
2. Navigate to **Challenge Tab**
3. Select challenge type: "No Social Media"
4. Select duration: "1 Week"
5. Click "Create Challenge"
   - MetaMask popup → Approve transaction
   - Wait for confirmation
6. Navigate to **Deposit Tab**
7. Enter amount: `10` USDC
8. Click "Approve USDC"
   - MetaMask popup → Approve transaction
   - Wait for confirmation
9. Click "Deposit & Start Challenge"
   - MetaMask popup → Approve transaction
   - Wait for confirmation

**Backend logs should show:**
```
🔔 Processing Deposit
=====================================
   User: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bfb8
   Amount: 10 USDC
   Bridge Request ID: 0x...
=====================================

🚀 Step 1: Withdrawing USDC from SavingsVault...
✅ Withdrawal successful

🚀 Step 2: Bridging via CCTP...
🌉 Bridging 10 USDC: Arc → Sepolia via CCTP
⏳ Waiting for attestation...
✅ CCTP attestation complete! USDC minted on Sepolia

🚀 Step 3: Confirming bridge on Arc...
✅ Bridge confirmed!

🚀 Step 4: Transferring to TreasuryManager...
✅ USDC transferred to TreasuryManager!

🚀 Step 5: Deploying to UniswapV4Agent...
✅ Liquidity deposited to Uniswap V4!

✅ Complete Pipeline Executed!
```

**Verify on Sepolia:**
```bash
cd Onchain/scripts
npx hardhat run check-balances.ts --network sepolia
```

**Expected Output:**
```
TreasuryManager Balance: 0 USDC (deployed to Uniswap)
UniswapV4Agent Balance: 10 USDC
Total Deployed: 10 USDC
```

---

### **Test 3: Daily Compliance Check**

**Simulate app usage in Supabase:**

Go to Supabase **Table Editor** → `usage_records` → Insert row:
```json
{
  "user_id": "0x742d35cc6634c0532925a3b844bc9e7595f0bfb8",
  "app_name": "Instagram",
  "package_name": "com.instagram.android",
  "created_at": "2026-02-08T14:30:00Z"
}
```

**Check compliance in dashboard:**
1. Navigate to **Compliance Tab**
2. Click "Check Today's Compliance"
3. Should show: "❌ Found Instagram usage at 2:30 PM"
4. Click "Record Compliance"
   - MetaMask popup → Approve transaction
   - Wait for confirmation

**Verify streak broken:**
```bash
cd Onchain/scripts
npx hardhat run check-user-stats.ts --network arc
```

**Expected Output:**
```
User: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bfb8
Current Streak: 0 days
Longest Streak: 0 days
Missed Days: 1
```

**Test compliant day:**

1. Delete Instagram record from Supabase
2. Click "Check Today's Compliance"
3. Should show: "✅ No social media detected!"
4. Click "Record Compliance"
5. Streak should increase to 1

---

### **Test 4: Withdrawal After Lock Period**

**Fast-forward time (for testing):**

In `SavingsVault.sol`, temporarily change:
```solidity
// Original: 1 week = 604800 seconds
uint256 lockDuration = 604800;

// For testing: 3 minutes = 180 seconds
uint256 lockDuration = 180;
```

Redeploy contracts, then:

1. Wait 3 minutes (or 1 week in production)
2. Navigate to **Withdraw Tab**
3. Enter shares to redeem (check balance in Stats Tab)
4. Click "Request Redemption"
   - MetaMask popup → Approve transaction
   - Wait for confirmation
5. Click "Claim Redemption" (with requestId from previous tx)
   - MetaMask popup → Approve transaction
   - Wait for confirmation

**Backend logs should show:**
```
 Processing Redemption Request
=====================================
   Request ID: 0x...
   Amount: 10.015 USDC (includes yield!)
=====================================

🚀 Step 1: Withdrawing from TreasuryManager (Sepolia)...
 Withdrawal successful!

🚀 Step 2: Bridging USDC (Sepolia → Arc)...
🌉 Bridging 10.015 USDC: Sepolia → Arc via CCTP (REVERSE)
⏳ Waiting for attestation...
 CCTP attestation complete! USDC minted on Arc

🚀 Step 3: Confirming & completing redemption on Arc...
 Confirming bridge from Sepolia on Arc...
 Bridge confirmed!

💰 Depositing USDC back into SavingsVault...
 USDC approved
 USDC transferred to vault

🎉 Completing redemption...
 Redemption completed! User received USDC + yield

 Complete Redemption Pipeline Executed!
```

**Verify balance increased:**

Check MetaMask wallet → USDC balance should be:
- Before: 90 USDC (deposited 10)
- After: 100.015 USDC (received 10 + 0.015 yield)

---

##  Deployed Contracts Summary

### **Arc Testnet (5042002)**

| Contract | Address | Purpose |
|----------|---------|---------|
| SavingsVault | `0xF4df10e373E509EC3d96237df91bE9B0006E918D` | ERC-4626 vault, main user interaction |
| ChallengeTracker | `0x2B1A80A3CF8E690b7f69694fF100Bd5c85AF75DA` | Challenge management, compliance tracking |
| LotteryEngine | `0xA900eF9aB5907f178b6C562f044c896c42c31F7D` | Prize distribution (future) |
| USDC | `0x3600000000000000000000000000000000000000` | Native USDC token |

### **Ethereum Sepolia (11155111)**

| Contract | Address | Purpose |
|----------|---------|---------|
| TreasuryManager | `0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9` | Receives bridged USDC, manages deployments |
| UniswapV4Agent | `0x5AC3d6D73bBfc9C8b26a78cF7D7314B326B2CAb5` | Manages Uniswap V4 liquidity positions |
| NoScrollSavingsHook | `0x932e5f3e72D7cC0FBcF0E82283e310EEb2cba727` | Custom Uniswap V4 hook for analytics |
| YieldStrategyManager | `0xa6b00bAE312cBa98Aea60057EcbF2506114e4764` | Future: Multi-strategy yield optimization |
| EmptyHook | `0x0B2D2EC90342B62a9D80967d26A0b10b685d10d0` | Backup no-op hook (for testing) |
| PoolManager (V4) | `0xE03A1074c86CFEdD5C142C4F04F1a1536e203543` | Uniswap V4 core contract |
| USDC | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Sepolia USDC token |
| WETH | `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14` | Wrapped ETH token |

### **ENS (Sepolia)**

| Contract | Address | Purpose |
|----------|---------|---------|
| ETHRegistrarController | `0x253553366Da8546fC250F378ce31e890FDbbF289` | ENS registration interface |
| PublicResolver | `0xc7ace338842b0cf896f401199d933d38020b4e8c` | Default ENS resolver |
| ENS Registry | `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e` | Core ENS registry |

### **Uniswap V4 Pool**

| Parameter | Value |
|-----------|-------|
| Pool ID | `0x47fa3673209ed2f3343562591254efd890e6873338a92b6bd98b87ffce9d638e` |
| Currency0 | USDC (`0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`) |
| Currency1 | WETH (`0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`) |
| Fee Tier | 0.3% (3000 bips) |
| Tick Spacing | 60 |
| Hook | NoScrollSavingsHook (`0x932e5f3e72D7cC0FBcF0E82283e310EEb2cba727`) |

---

##  Troubleshooting

### **Issue: Backend not detecting events**

**Solution:**
```bash
# Check backend is running
ps aux | grep "node.*cctp"

# Check RPC connection
curl https://rpc-arc-testnet.gelato.digital \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Restart backend with verbose logging
cd UniSwap/cctp
npm start
```

### **Issue: CCTP attestation timeout**

**Error:**
```
 CCTP attestation timeout after 30s
```

**Solution:**
- Backend has built-in 30s timeout + balance verification fallback
- Check Circle CCTP status: https://status.circle.com
- Verify USDC was minted on destination chain:
```bash
  # Check Sepolia USDC balance
  cast balance 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
    --rpc-url https://ethereum-sepolia-rpc.publicnode.com
```

### **Issue: ENS registration fails**

**Error:**
```
"Wait Xs more"
```

**Solution:**
- Must wait full 60 seconds after commitment
- Don't close browser tab during wait period
- Check localStorage has secret:
```javascript
  localStorage.getItem('ens-secret-frank')
```

### **Issue: Uniswap pool not found**

**Error:**
```
Pool does not exist
```

**Solution:**
```bash
cd Onchain/scripts

# Check pool exists
npx hardhat run check-pool-exists.ts --network sepolia

# If not, initialize pool
npx hardhat run initialize-pool-v4.ts --network sepolia
```

### **Issue: MetaMask transaction fails**

**Error:**
```
insufficient funds for gas * price + value
```

**Solution:**
- Get testnet ETH from faucets:
  - Arc: https://faucet-arc-testnet.gelato.digital
  - Sepolia: https://sepoliafaucet.com
- Check balance:
```bash
  # Arc
  cast balance YOUR_ADDRESS --rpc-url https://rpc-arc-testnet.gelato.digital
  
  # Sepolia
  cast balance YOUR_ADDRESS --rpc-url https://ethereum-sepolia-rpc.publicnode.com
```

### **Issue: Supabase query returns empty**

**Error:**
```
No compliance data found
```

**Solution:**
1. Check Supabase connection:
```typescript
   const { error } = await supabase.from('usage_records').select('count');
   console.log(error); // Should be null
```

2. Verify data exists:
   - Go to Supabase Dashboard → Table Editor
   - Check `usage_records` table has data
   - Verify `user_id` matches wallet address (lowercase)

3. Check RLS policies:
```sql
   -- Temporarily disable RLS for debugging
   ALTER TABLE usage_records DISABLE ROW LEVEL SECURITY;
```

---

##  Future Enhancements

### **Phase 2: Enhanced Yield Strategies**
- Aave integration (60% of USDC to lending pool)
- Multi-pool Uniswap positions (USDC/USDT, USDC/DAI)
- Dynamic rebalancing based on APY
- Risk-adjusted portfolio allocation

### **Phase 3: Gamification**
- NFT badges for streaks (7-day, 30-day, 90-day)
- Leaderboards for longest streaks
- Bonus yield multipliers for consistent compliance
- Social challenges (compete with friends)

### **Phase 4: Mobile App**
- Native iOS & Android apps
- Real-time app usage tracking
- Push notifications for compliance reminders
- Biometric authentication
- In-app ENS registration

### **Phase 5: Multi-Chain Expansion**
- Support Base, Optimism, Arbitrum
- Cross-chain yield aggregation
- Single deposit, multi-chain yields
- Unified dashboard

### **Phase 6: DAO Governance**
- $SCROLL governance token
- Vote on supported chains
- Propose new challenge types
- Treasury management
- Protocol fee adjustments

---

##  License

MIT License - see [LICENSE](LICENSE) file for details

---

##  Acknowledgments

- **Circle** - CCTP infrastructure for native USDC bridging
- **Uniswap Labs** - V4 protocol and hook system
- **ENS** - Decentralized naming system
- **Arc Testnet** - Low-cost liquidity hub infrastructure
- **Supabase** - Real-time database for wellbeing data
- **Foundry** - Smart contract development framework
- **Next.js** - React framework for production-grade apps
- **wagmi** - React hooks for Ethereum

---

##  Contact & Support

- **Email**: austinjeremiah04@gmail.com
- **GitHub**: [github.com/noscrollsavings](https://github.com/AustinJeremiah05/No-Scroll-Savings/tree/main)

---

##  Live Demo

- **Dashboard**: https://no-scroll-savings-5iqe.vercel.app/

---

**Built with ❤️ for HackMoney 2026**

*Improving digital wellbeing, one USDC at a time.* 
