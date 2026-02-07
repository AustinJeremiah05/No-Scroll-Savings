# Uniswap V4 Integration - Complete Implementation

## Overview
Successfully implemented complete Uniswap V4 liquidity integration using the deployed PoolManager contract on Sepolia. The implementation uses the unlock callback pattern for adding and removing liquidity to/from the USDC/WETH pool.

## What Was Implemented

### 1. Interface Files Created

#### `contracts/sepolia/interfaces/IPoolManager.sol`
- Interface for interacting with the deployed Uniswap V4 PoolManager at `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`
- Key functions:
  - `unlock()` - Initiates the unlock callback flow
  - `modifyLiquidity()` - Adds or removes liquidity from pools
  - `settle()` - Settles token debts to the PoolManager
  - `take()` - Claims tokens from the PoolManager
  - `sync()` - Syncs currency balances

#### `contracts/sepolia/interfaces/PoolKey.sol`
- Type definitions required for Uniswap V4:
  - `Currency` - Type for token addresses
  - `PoolKey` - Identifies a specific pool (currencies, fee, tick spacing, hooks)
  - `ModifyLiquidityParams` - Parameters for liquidity operations
  - `BalanceDelta` - Tracks token deltas during operations
- Helper library `CurrencyLibrary` for token transfers and balance checks

### 2. UniswapV4Agent.sol Updates

#### Constructor Changes
```solidity
constructor(
    address _usdc,
    address _poolManager,  // 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543
    address _owner,
    address _weth          // NEW: WETH address for pool configuration
)
```

- Now accepts WETH address as 4th parameter
- Initializes `PoolKey` for USDC/WETH pool with:
  - 1% fee tier (10000 bips) for maximum yield generation
  - 200 tick spacing
  - Full range liquidity (ticks -887220 to 887220)
  - No hooks (address(0))

#### State Variables Added
```solidity
IPoolManager public immutable poolManager;
PoolKey public usdcWethPool;
int24 public constant TICK_LOWER = -887220;
int24 public constant TICK_UPPER = 887220;
bytes32 public constant POSITION_SALT = bytes32(uint256(1));
```

#### New Function: `unlockCallback()`
The critical function that enables Uniswap V4 integration:

```solidity
function unlockCallback(bytes calldata data) external returns (bytes memory)
```

**How it works:**
1. PoolManager calls this function during `unlock()` flow
2. Decodes operation type (add/remove), amount, and pool index
3. For adding liquidity:
   - Creates `ModifyLiquidityParams` with positive `liquidityDelta`
   - Calls `poolManager.modifyLiquidity()` to add liquidity
   - Syncs currency balance
   - Transfers USDC to PoolManager and calls `settle()` to pay debt
4. For removing liquidity:
   - Creates `ModifyLiquidityParams` with negative `liquidityDelta`
   - Calls `poolManager.modifyLiquidity()` to remove liquidity
   - Calls `take()` to claim USDC back from PoolManager

#### Updated Functions
- `_addLiquidityToPool()`: Now calls `poolManager.unlock()` with encoded add operation
- `_removeLiquidityFromPool()`: Now calls `poolManager.unlock()` with encoded remove operation
- Removed `setPoolManager()`: PoolManager is now immutable (set only in constructor)

## Deployment Configuration

### Addresses (Sepolia Testnet)

**Uniswap V4 (Already Deployed):**
- PoolManager: `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`
- UniversalRouter: `0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b`
- PositionManager: `0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4`
- Permit2: `0x000000000022D473030F116dDEE9F6B43aC78BA3`

**Tokens (Sepolia):**
- USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- WETH: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`

**Our Deployed Contracts (Latest: Feb 7, 2026):**
- TreasuryManager (Sepolia): `0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9`
- UniswapV4Agent (Sepolia): `0x5AC3d6D73bBfc9C8b26a78cF7D7314B326B2CAb5` (0.3% fee + EmptyHook)
- EmptyHook (Sepolia): `0x0B2D2EC90342B62a9D80967d26A0b10b685d10d0` (Required V4 hook)
- NoScrollSavingsHook (Sepolia): `0x932e5f3e72D7cC0FBcF0E82283e310EEb2cba727`
- YieldStrategyManager (Sepolia): `0xa6b00bAE312cBa98Aea60057EcbF2506114e4764`
- SavingsVault (Arc): `0xF4df10e373E509EC3d96237df91bE9B0006E918D`

### Pool Configuration
- Pool: USDC/WETH (Initialized at 1:1 price)
- Pool ID: `0x2293facea404ca68d90c17616cbb286bc3d96408229137d78bb8e8b3ca6129cf`
- Fee Tier: 0.3% (3000 bips) - Standard fee tier
- Tick Spacing: 60 (aligned to 0.3% fee)
- Position Range: USDC-only liquidity (-887220 to -60)
- Initialization TX: `0xa96dd78641ef96aec8dec8940d5f299253249ae5f6ed6e009ca51370220eb370`
- Hooks: EmptyHook at `0x0B2D2EC90342B62a9D80967d26A0b10b685d10d0` (V4 requirement)

## How to Deploy

### 1. Environment Setup

Copy `.env.example` to `.env` and configure:
```bash
cd Onchain
cp .env.example .env
```

Edit `.env`:
```env
SEPOLIA_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
SEPOLIA_WETH_ADDRESS=0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
SEPOLIA_UNISWAP_POOL_MANAGER=0xE03A1074c86CFeDd5C142C4F04F1a1536e203543
PRIVATE_KEY=your_deployer_private_key
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
BACKEND_ADDRESS=your_backend_wallet_address
```

### 2. Deploy Contracts

```bash
cd Onchain
npm run deploy:sepolia
```

This will deploy:
- NoScrollSavingsHook
- YieldStrategyManager
- **UniswapV4Agent** (with Uniswap V4 integration)
- TreasuryManager

And automatically link them together.

### 3. Verify on Etherscan

The deploy script outputs verification commands. Run them to verify contracts on Etherscan.

## How It Works - Complete Flow

### Deposit Flow (Arc → Uniswap)
1. User deposits USDC on Arc via SavingsVault
2. SavingsVault sends USDC to TreasuryManager (Sepolia) via CCTP bridge
3. TreasuryManager receives USDC and calls `receiveFunds()`
4. TreasuryManager calls `UniswapV4Agent.depositLiquidity()`
5. UniswapV4Agent distributes USDC across pools:
   - Calls `_addLiquidityToPool()` which calls `poolManager.unlock(data)`
   - PoolManager calls back `unlockCallback()` with the data
   - In callback: calls `modifyLiquidity()` to add liquidity
   - Transfers USDC to PoolManager and calls `settle()` to pay
6. Liquidity is now in USDC/WETH pool generating fees

### Yield Generation (3 minutes)
- Position earns trading fees from USDC/WETH swaps
- 1% fee tier maximizes yield in short period
- Full range liquidity ensures fees on all price levels

### Withdrawal Flow (Uniswap → Arc)
1. After 3 minutes, challenge period ends
2. Backend calls `UniswapV4Agent.withdrawLiquidity()`
3. UniswapV4Agent withdraws from pools:
   - Calls `_removeLiquidityFromPool()` which calls `poolManager.unlock(data)`
   - PoolManager calls back `unlockCallback()` with the data
   - In callback: calls `modifyLiquidity()` with negative delta
   - Calls `take()` to claim USDC back
4. USDC returned to TreasuryManager
5. TreasuryManager bridges USDC back to Arc via CCTP
6. SavingsVault distributes to user + rewards

## Technical Details

### Unlock Callback Pattern
Uniswap V4 uses a novel "unlock" pattern for gas efficiency:

```
Contract                    PoolManager
    |                           |
    |------- unlock(data) ----->|
    |                           |
    |<-- unlockCallback(data) --|
    |                           |
    |-- modifyLiquidity() ----->|
    |-- settle() or take() ---->|
    |                           |
    |<------- return -----------|
```

All operations (add/remove liquidity, swaps, etc.) must happen within the unlock callback. This ensures proper accounting and prevents reentrancy attacks.

### Position Management
- **Salt**: `bytes32(uint256(1))` - Unique identifier for our position
- **Full Range**: Provides liquidity across entire price range
- **Single Position**: All USDC goes into one position for simplicity

### Fee Optimization
- **1% fee tier** chosen for:
  - Higher fees per trade
  - Less competition at higher fee tiers
  - Suitable for 3-minute yield generation
  - Common trading pair (USDC/WETH) ensures volume

## Testing Checklist

### Before Production:

- [ ] Deploy contracts to Sepolia
- [ ] Verify contracts on Etherscan
- [ ] Test deposit flow: Arc → Sepolia → UniswapV4Agent
- [ ] Verify liquidity appears in Uniswap V4 pool
- [ ] Monitor position for 3 minutes
- [ ] Check fee accrual
- [ ] Test withdrawal flow: UniswapV4Agent → TreasuryManager → Arc
- [ ] Verify USDC + yield returned to user
- [ ] Test emergency withdrawal
- [ ] Load test with multiple concurrent deposits
- [ ] Test rebalancing logic
- [ ] Monitor gas costs

### Integration Tests:

```bash
cd Onchain
npm test
```

## Next Steps

1. **Deploy**: Run `npm run deploy:sepolia` with configured `.env`
2. **Register Pool**: After deployment, call `UniswapV4Agent.registerPool()` to register the USDC/WETH pool
3. **Set Strategy**: Configure yield strategy parameters if needed
4. **Update Backend**: Update backend with new UniswapV4Agent address
5. **Update Frontend**: Update frontend contract addresses
6. **Test Flow**: Do end-to-end test with small amount
7. **Monitor**: Watch first few deposits closely for any issues
8. **Scale**: Gradually increase deposit limits

## Important Notes

### Interface Files Are NOT New Contracts
The files `IPoolManager.sol` and `PoolKey.sol` are **interface definitions**, not new contract deployments. They simply define the function signatures and types needed to interact with the **already deployed** Uniswap V4 PoolManager at `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`.

Think of it like knowing the "language" (interface) to communicate with a phone number (deployed contract address).

### Gas Optimization
- Unlock pattern is more gas efficient than traditional approval patterns
- Single transaction for add/remove liquidity reduces gas
- Full range position avoids rebalancing gas costs

### Security Considerations
- PoolManager address is immutable (can't be changed after deployment)
- Only PoolManager can call `unlockCallback()` (checked via `require`)
- All deltas must be settled before callback returns (enforced by PoolManager)
- TreasuryManager controls access to deposit/withdraw functions

## Compilation Status

✅ All contracts compile successfully with no errors
⚠️ Two minor warnings about unused variables (non-critical)

```
Compiled 3 Solidity files successfully (evm target: paris)
```

## Files Modified/Created

### Created:
- `contracts/sepolia/interfaces/IPoolManager.sol` (31 lines)
- `contracts/sepolia/interfaces/PoolKey.sol` (61 lines)
- `.env.example` (configuration template)
- `UNISWAP_V4_INTEGRATION.md` (this file)

### Modified:
- `contracts/sepolia/UniswapV4Agent.sol` (570 lines)
  - Added imports and interface implementation
  - Updated constructor
  - Added state variables for pool configuration
  - Implemented `unlockCallback()` function
  - Updated `_addLiquidityToPool()` and `_removeLiquidityFromPool()`
  - Removed `setPoolManager()` (now immutable)
- `scripts/deploy-sepolia.ts`
  - Added WETH address parameter
  - Updated constructor call with 4 parameters
  - Added validation for required addresses
  - Updated verification commands

## Summary

The Uniswap V4 integration is **complete and ready for deployment**. The contract now:
- ✅ Calls the actual deployed PoolManager on Sepolia
- ✅ Uses proper unlock callback pattern
- ✅ Handles adding liquidity with settle()
- ✅ Handles removing liquidity with take()
- ✅ Configured for USDC/WETH pool with 1% fee tier
- ✅ Optimized for 3-minute yield generation
- ✅ Compiles without errors

Next action: Configure `.env` and run deployment script.
