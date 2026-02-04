# Quick Start

## Setup

```bash
cd frontend
pnpm install
pnpm dev
```

Go to `http://localhost:3000`

## Test Flow

1. **Landing Page**: Click "Connect Wallet"
2. **Auto Redirect**: Should go to `/dashboard`
3. **Deposit Tab**: 
   - Enter amount (min 10 USDC)
   - Select lock duration
   - Select challenge type
   - Click Deposit (check browser console for logs)

4. **Compliance Tab**:
   - Click "✓ Compliant" or "✗ Failed"
   - Status updates

5. **Withdraw Tab**:
   - Click "Request Redemption" (after lock expires)
   - Click "Claim" (to claim after unlock time)

6. **Stats Tab**:
   - View your balance, streak, lottery entries

## Contract Addresses (Arc Testnet)

- **SavingsVault**: `0x4Aafe0898BBd6Ed86E51D96667Fca2A7C2d2f574`
- **ChallengeTracker**: `0x2B1A80A3CF8E690b7f69694fF100Bd5c85AF75DA`
- **LotteryEngine**: `0xA900eF9aB5907f178b6C562f044c896c42c31F7D`
- **USDC**: `0x3600000000000000000000000000000000000000`

## Contract Addresses (Sepolia)

- **TreasuryManager**: `0xc4534a320Ff1561EC173A76103E43afe52dBC2B5`
- **USDC**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **Aave Pool**: `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2`

## Next Steps

Connect the contract calls in:
- `DepositTab`: Call `SavingsVault.deposit()`
- `ComplianceTab`: Call `ChallengeTracker.recordDailyCompliance()`
- `WithdrawTab`: Call `SavingsVault.requestRedeem()` and `claimRedemption()`
- `StatsTab`: Call view functions to fetch data

All contract ABIs are in `lib/contracts.ts`
