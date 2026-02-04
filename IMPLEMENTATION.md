# No-Scroll Savings - Full End-to-End Implementation

## Complete Flow Overview

### 1. **User Deposit (Arc Testnet)**
```
User deposits 100 USDC on Arc
→ SavingsVault.deposit(100e6, lockDuration, challengeType)
  - Burns 100 nsSHARE tokens
  - Registers challenge on ChallengeTracker
  - Emits BridgeToSepoliaRequested event
```

### 2. **Backend Relayer Listens (Arc)**
```
Event: BridgeToSepoliaRequested(user, 100e6, requestId)
Relayer handleBridgeToSepolia():
  1. Burn 100 USDC on Arc via CCTP
  2. Wait 15 sec (Arc finality)
  3. Mint 100 USDC on Sepolia via CCTP
  4. Call TreasuryManager.receiveFunds(100e6)
     - Deploy: 60% → Aave (earn aUSDC), 30% → Uniswap v4, 10% → Buffer
  5. Confirm bridge on Arc: confirmBridgeToSepolia(requestId, 100e6)
  6. Emit: BridgeToSepoliaCompleted
```

### 3. **Daily Compliance Check (Oracle)**
```
Every 60 seconds, Oracle runs:
  checkCompliance(userAddress):
    - Query Supabase usage_records for last 5 minutes
    - Check for Instagram + Snapchat usage
    - Return true if compliant, false if social media detected
  
  recordCompliance(userAddress, isCompliant):
    - Call ChallengeTracker.recordDailyCompliance(user, isCompliant)
    - If compliant: +1 streak
    - If non-compliant: +1 missed day, reset streak if ≥3 misses
```

### 4. **Withdrawal Request (Arc)**
```
After lock period expires:
User calls SavingsVault.requestRedemption()
→ Emits BridgeFromSepoliaRequested(user, amount, requestId)
```

### 5. **Backend Relayer Bridges Back (Sepolia → Arc)**
```
Event: BridgeFromSepoliaRequested(user, 100e6, requestId)
Relayer handleBridgeFromSepolia():
  1. Check user compliance status on ChallengeTracker
  2. Calculate yield from Treasury:
     - Aave interest + Uniswap v4 fees
  3. Total = principal + yield (e.g., 100e6 + 5e6)
  4. Burn 105 USDC on Sepolia via CCTP
  5. Wait 15 sec (Sepolia finality)
  6. Mint 105 USDC on Arc via CCTP
  7. Confirm bridge: confirmBridgeFromSepolia(requestId, 105e6)
  8. Call completeRedemption(user)
```

### 6. **Redemption Outcome**
```
If COMPLIANT:
  ✅ User receives 105 USDC (principal + yield)
  🎉 Wins lottery entry bonus

If NON-COMPLIANT (≥3 missed days):
  ⚠️  User receives 50 USDC (50% slashed)
  💸 50 USDC → Protocol treasury for lending operations
```

## Files

### Frontend
- **frontend/app/dashboard/page.tsx** - 4 tabs (Deposit, Compliance, Withdraw, Stats)
- **frontend/hooks/useContract.ts** - 8 wagmi hooks for contract calls
- **frontend/lib/contracts.ts** - ABIs and addresses

### Backend Relayer
- **arc/relayer/index.ts** - Main relayer with:
  - ✅ Compliance oracle (checks Supabase every 60s)
  - ✅ Event listeners (polls every 30s)
  - ✅ Bridge to Sepolia (Arc → Sepolia with CCTP)
  - ✅ Bridge from Sepolia (Sepolia → Arc with CCTP + yield)
- **arc/relayer/.env** - Configuration with all contract addresses, RPCs, Supabase creds
- **arc/relayer/package.json** - Dependencies (viem, supabase-js, tsx)

### Smart Contracts
- **Onchain/contracts/arc/SavingsVault.sol** - Deposit/redeem logic
- **Onchain/contracts/arc/ChallengeTracker.sol** - Compliance tracking, streak, lottery
- **Onchain/contracts/arc/LotteryEngine.sol** - Draws winners from lotteryEntries
- **Onchain/contracts/sepolia/TreasuryManager.sol** - Yield deployment & distribution

## Key Params

| Param | Value | Purpose |
|-------|-------|---------|
| Lock Duration | 5 min (test) | Time user must stay off Instagram/Snapchat |
| Oracle Interval | 60 sec | Check compliance every minute |
| Compliance Window | 5 min | Look back in Supabase usage_records |
| Aave Deploy | 60% | Earn stable interest |
| Uniswap Deploy | 30% | Earn v4 liquidity fees |
| Buffer | 10% | Gas costs, slippage buffer |
| Compliance Bonus | +Lottery entry | If compliant, extra raffle ticket |
| Non-Compliance Penalty | 50% slash | Lose half of deposits if ≥3 misses |

## Deployment

### Backend Relayer
```bash
cd arc/relayer
npm install
# Create .env from .env.example
npm run start
```

Output:
```
🚀 No-Scroll Relayer Started
Backend: 0xdB630944101765cfb1f6836AE7579Eee1cdBbCBC
Lock duration: 5 min
Social media apps: com.instagram.android, com.snapchat.android
Oracle interval: 60000ms

🔍 Oracle started (checking every 60000ms)
👂 Event listeners started...

⏰ [2024-01-15T10:30:00Z] Oracle check...
✅ 0xdB630944101765cfb1f6836AE7579Eee1cdBbCBC: Compliant

🌉 BridgeToSepoliaRequested event detected: [...]
🔄 Bridging 100000000 USDC (Arc → Sepolia)...
✅ CCTP Burn on Arc: 0x123...
✅ CCTP Mint on Sepolia: 0x456...
✅ TreasuryManager.receiveFunds() called: 0x789...
   Deploying: 60% Aave, 30% Uniswap v4, 10% Buffer
✅ confirmBridgeToSepolia() called: 0xabc...
🎉 DEPOSIT FLOW COMPLETE: Funds earning yield on Sepolia
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
# Connect wallet → Dashboard shows 4 tabs
```

## Live Contracts

| Chain | Contract | Address |
|-------|----------|---------|
| Arc 5042002 | SavingsVault | 0x4Aafe0898BBd6Ed86E51D96667Fca2A7C2d2f574 |
| Arc 5042002 | ChallengeTracker | 0x2B1A80A3CF8E690b7f69694fF100Bd5c85AF75DA |
| Arc 5042002 | LotteryEngine | 0xA900eF9aB5907f178b6C562f044c896c42c31F7D |
| Sepolia 11155111 | TreasuryManager | 0xc4534a320Ff1561EC173A76103E43afe52dBC2B5 |

## Backend Wallet

```
Address: 0xdB630944101765cfb1f6836AE7579Eee1cdBbCBC
Role: Signs CCTP transfers, calls contract functions, executes oracle
```

---

**Status**: ✅ Full end-to-end implementation complete  
**No mock-ups**: All flows are on-chain via CCTP bridge + Supabase oracle
