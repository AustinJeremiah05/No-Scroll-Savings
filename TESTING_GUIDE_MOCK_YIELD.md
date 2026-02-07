# No-Scroll Savings - Mock Yield & Withdrawal Testing Guide

## ✅ What's Been Implemented

### 1. Mock Yield Display (Frontend)
- Added to **Stats Tab** in dashboard
- Shows calculated yield based on 5% APY
- Displays: `Principal + Mock Yield` that user will receive on withdrawal
- Updates in real-time based on deposit time

### 2. Improved Withdrawal UI (Frontend)
- Enhanced **Withdraw Tab** with:
  - Current deposit overview (amount, shares, lock status)
  - Pre-filled shares amount
  - Better status messages  
  - Clear next steps after each action

### 3. Reverse Bridge Flow (Backend)
- Already implemented in `UniSwap/cctp/index.ts`
- Watches for `RedeemRequested` events on Arc
- Automatically:
  1. Withdraws USDC from TreasuryManager (Sepolia)
  2. Pulls from UniswapV4Agent if needed
  3. Bridges USDC via CCTP (Sepolia → Arc)
  4. Sends to SavingsVault on Arc
  5. User claims final USDC

---

## 🧪 Testing the Full Flow

### Prerequisites
- Have an active deposit in SavingsVault (use dashboard Launch tab)
- CCTP bridge service running: `cd UniSwap/cctp && npm start`
- Wallet connected to Arc testnet

### Method 1: Using Frontend Dashboard (Recommended)

1. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Go to Dashboard** → **Stats Tab**
   - View your mock yield earnings
   - See total expected withdrawal amount

3. **Go to Withdraw Tab**
   - Check if deposit is unlocked (green status)
   - Click "Request Redemption" (shares pre-filled)
   - Wait for transaction confirmation

4. **Monitor CCTP Bridge**
   - Check bridge logs for processing
   - Wait ~1-2 minutes for Sepolia → Arc bridging

5. **Claim Your USDC**
   - Get Request ID from redemption transaction
   - Enter Request ID in "Claim" section
   - Click "Claim (After Unlock)"
   - USDC appears in your wallet!

### Method 2: Using Hardhat Scripts

#### Request Withdrawal
```bash
cd Onchain
npx hardhat run scripts/test-withdrawal.ts --network arc
```

This will:
- Show your current deposit
- Request redemption (if unlocked)
- Provide Request ID for claiming

#### Claim After Bridge Completes
```bash
npx hardhat run scripts/claim-redemption.ts --network arc -- --requestId=0xYOUR_REQUEST_ID
```

---

## 📊 Check Balances Anytime

### Sepolia (Treasury & Agent)
```bash
cd Onchain
npx hardhat run scripts/check-balances-all.ts --network sepolia
```

Shows:
- Backend wallet USDC
- TreasuryManager USDC
- UniswapV4Agent USDC
- Total deployed
- Total yield earned (currently 0, will show real yield when Uniswap v4 is active)

### Arc (Your Wallet)
Check your wallet in Arc testnet for USDC balance before/after claiming.

---

## 🔄 Full User Journey

```
1. User deposits USDC in dashboard (Launch tab)
   ↓
2. USDC flows: Arc → Sepolia (via CCTP bridge)
   ↓
3. Deploys to TreasuryManager → UniswapV4Agent
   ↓
4. Mock yield accrues (shown in Stats tab, 5% APY)
   ↓
5. User requests withdrawal (Withdraw tab)
   ↓
6. CCTP bridge processes:
   - Withdraws from TreasuryManager
   - Bridges Sepolia → Arc
   - Sends to SavingsVault
   ↓
7. User claims redemption
   ↓
8. USDC (principal + mock yield) appears in wallet ✅
```

---

## 🎭 Mock Yield Details

**Current Implementation:**
- **APY:** 5% (hardcoded in frontend)
- **Formula:** `(depositAmount * 0.05 / 365) * daysSinceDeposit`
- **Display:** Stats tab shows current accumulated yield
- **Payout:** Added to principal when user claims withdrawal

**To Make Yield Real:**
- Fix Uniswap v4 pool liquidity deployment
- Implement actual yield harvesting from trading fees
- Update `TreasuryManager.harvestYield()` to collect real earnings
- Pass yield data to frontend via contract queries

---

## 🐛 Troubleshooting

### "Redemption not ready" when claiming
- CCTP bridge is still processing
- Wait 1-2 more minutes
- Check bridge logs: `cd UniSwap/cctp && npm start`

### "Zero amount" error
- No deposit found or shares = 0  
- Make a deposit first using dashboard Launch tab

### "Only treasury" error
- ✅ Already fixed! TreasuryManager now points to correct UniswapV4Agent
- If persists, run: `npx hardhat run scripts/check-config.ts --network sepolia`

### Can't request redemption
- Deposit may still be locked
- Check unlock time in Withdraw tab
- Wait until status shows "✅ Unlocked"

---

## 📝 Next Steps (Future Enhancements)

1. **Fix Uniswap V4 Integration**
   - Properly initialize pool
   - Deploy liquidity (remove workaround)
   - Collect real trading fees

2. **Real Yield Distribution**
   - Harvest yield from Uniswap positions
   - Track per-user yield allocation
   - Replace mock calculations with on-chain data

3. **Automated Oracle**
   - Implement compliance checking oracle
   - Auto-record daily challenge compliance
   - Integrate with Android app data

4. **Lottery System**
   - Automate weekly drawings
   - Integrate Chainlink VRF
   - Distribute prizes based on lottery entries

---

## 💡 Key Files

**Frontend:**
- `frontend/app/dashboard/page.tsx` - Dashboard with mock yield & withdrawal UI
- `frontend/hooks/useContract.ts` - Contract interaction hooks

**Contracts:**
- `Onchain/contracts/arc/SavingsVault.sol` - Main vault on Arc
- `Onchain/contracts/sepolia/TreasuryManager.sol` - Manages funds on Sepolia
- `Onchain/contracts/sepolia/UniswapV4Agent.sol` - Yield generation (placeholder)

**Bridge:**
- `UniSwap/cctp/index.ts` - CCTP bridge service (handles both directions)

**Scripts:**
- `Onchain/scripts/test-withdrawal.ts` - Request redemption via CLI
- `Onchain/scripts/claim-redemption.ts` - Claim redemption via CLI
- `Onchain/scripts/check-balances-all.ts` - View all USDC locations

---

## ✅ Testing Checklist

- [ ] Frontend shows mock yield in Stats tab
- [ ] Withdraw tab displays current deposit info
- [ ] Can request redemption (if unlocked)
- [ ] CCTP bridge processes withdrawal automatically
- [ ] Can claim redemption after bridge completes
- [ ] USDC appears in wallet (principal + mock yield)
- [ ] Dashboard updates after withdrawal

---

**Ready to test!** Follow Method 1 for the easiest user experience.
