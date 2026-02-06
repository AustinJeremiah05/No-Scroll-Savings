// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PoolKey.sol";

/// @notice Interface for Uniswap V4 PoolManager (Official)
/// @dev Simplified version containing only functions we use
interface IPoolManager {
    /// @notice Thrown when trying to interact with a non-initialized pool
    error PoolNotInitialized();
    
    /// @notice Thrown when a currency is not netted out after the contract is unlocked
    error CurrencyNotSettled();
    
    /// @notice All interactions require unlocking
    /// @param data Any data to pass to the callback
    /// @return The data returned by the unlock callback
    function unlock(bytes calldata data) external returns (bytes memory);
    
    /// @notice Initialize the state for a given pool ID
    /// @param key The pool key for the pool to initialize
    /// @param sqrtPriceX96 The initial square root price
    /// @return tick The initial tick of the pool
    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24 tick);
    
    /// @notice Modify liquidity for a pool
    /// @param key The pool to modify liquidity in
    /// @param params The parameters for modifying the liquidity
    /// @param hookData The data to pass through to hooks
    /// @return callerDelta The balance delta of the caller
    /// @return feesAccrued The balance delta of fees generated
    function modifyLiquidity(
        PoolKey memory key,
        ModifyLiquidityParams memory params,
        bytes calldata hookData
    ) external returns (BalanceDelta memory callerDelta, BalanceDelta memory feesAccrued);
    
    /// @notice Settle tokens owed to the pool
    /// @return paid The amount of currency settled
    function settle() external payable returns (uint256 paid);
    
    /// @notice Take tokens from the pool
    /// @param currency The currency to withdraw
    /// @param to The address to withdraw to
    /// @param amount The amount of currency to withdraw
    function take(Currency currency, address to, uint256 amount) external;
    
    /// @notice Sync currency balance (checkpoint for settlement)
    /// @param currency The currency to sync
    function sync(Currency currency) external;
}

interface IUnlockCallback {
    /// @notice Called by PoolManager during unlock
    function unlockCallback(bytes calldata data) external returns (bytes memory);
}
