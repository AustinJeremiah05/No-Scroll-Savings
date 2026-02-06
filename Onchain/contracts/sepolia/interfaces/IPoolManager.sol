// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PoolKey.sol";

interface IPoolManager {
    /// @notice All interactions require unlocking
    function unlock(bytes calldata data) external returns (bytes memory);
    
    /// @notice Modify liquidity for a pool
    function modifyLiquidity(
        PoolKey memory key,
        ModifyLiquidityParams memory params,
        bytes calldata hookData
    ) external returns (BalanceDelta memory, BalanceDelta memory);
    
    /// @notice Settle tokens owed to the pool
    function settle() external payable returns (uint256 paid);
    
    /// @notice Take tokens from the pool
    function take(Currency currency, address to, uint256 amount) external;
    
    /// @notice Sync currency balance
    function sync(Currency currency) external;
}

interface IUnlockCallback {
    /// @notice Called by PoolManager during unlock
    function unlockCallback(bytes calldata data) external returns (bytes memory);
}
