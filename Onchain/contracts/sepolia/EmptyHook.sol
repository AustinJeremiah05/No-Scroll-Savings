// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/PoolKey.sol";

/**
 * @title EmptyHook
 * @notice Minimal no-op hook for Uniswap V4
 * @dev This hook does nothing but allows pool creation by providing a valid hook address
 * All hook functions return their own selector to indicate success
 */
contract EmptyHook {
    
    address public immutable poolManager;
    
    constructor(address _poolManager) {
        poolManager = _poolManager;
    }
    
    modifier onlyPoolManager() {
        require(msg.sender == poolManager, "Only PoolManager");
        _;
    }
    
    // Hook functions - all return their selector and do nothing
    
    function beforeInitialize(address, PoolKey calldata, uint160) 
        external 
        view 
        onlyPoolManager 
        returns (bytes4) 
    {
        return this.beforeInitialize.selector;
    }
    
    function afterInitialize(address, PoolKey calldata, uint160, int24) 
        external 
        view 
        onlyPoolManager 
        returns (bytes4) 
    {
        return this.afterInitialize.selector;
    }
    
    function beforeAddLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata) 
        external 
        view 
        onlyPoolManager 
        returns (bytes4) 
    {
        return this.beforeAddLiquidity.selector;
    }
    
    function afterAddLiquidity(
        address, 
        PoolKey calldata, 
        ModifyLiquidityParams calldata, 
        BalanceDelta calldata, 
        BalanceDelta calldata,
        bytes calldata
    ) 
        external 
        view 
        onlyPoolManager 
        returns (bytes4, BalanceDelta memory) 
    {
        return (this.afterAddLiquidity.selector, BalanceDelta(0, 0));
    }
    
    function beforeRemoveLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata) 
        external 
        view 
        onlyPoolManager 
        returns (bytes4) 
    {
        return this.beforeRemoveLiquidity.selector;
    }
    
    function afterRemoveLiquidity(
        address, 
        PoolKey calldata, 
        ModifyLiquidityParams calldata, 
        BalanceDelta calldata,
        BalanceDelta calldata, 
        bytes calldata
    ) 
        external 
        view 
        onlyPoolManager 
        returns (bytes4, BalanceDelta memory) 
    {
        return (this.afterRemoveLiquidity.selector, BalanceDelta(0, 0));
    }
    
    function beforeSwap(address, PoolKey calldata, SwapParams calldata, bytes calldata) 
        external 
        view 
        onlyPoolManager 
        returns (bytes4, BeforeSwapDelta, uint24) 
    {
        return (this.beforeSwap.selector, BeforeSwapDelta.wrap(0), 0);
    }
    
    function afterSwap(
        address, 
        PoolKey calldata, 
        SwapParams calldata,
        BalanceDelta calldata, 
        bytes calldata
    ) 
        external 
        view 
        onlyPoolManager 
        returns (bytes4, int128) 
    {
        return (this.afterSwap.selector, 0);
    }
    
    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) 
        external 
        view 
        onlyPoolManager 
        returns (bytes4) 
    {
        return this.beforeDonate.selector;
    }
    
    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) 
        external 
        view 
        onlyPoolManager 
        returns (bytes4) 
    {
        return this.afterDonate.selector;
    }
}
