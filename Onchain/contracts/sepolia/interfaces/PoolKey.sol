// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

type Currency is address;
type PoolId is bytes32;

struct PoolKey {
    Currency currency0;  // Lower address token
    Currency currency1;  // Higher address token
    uint24 fee;          // Fee in hundredths of a bip (e.g., 3000 = 0.3%)
    int24 tickSpacing;   // Tick spacing for the pool
    address hooks;       // Hook contract address (address(0) for no hooks)
}

struct ModifyLiquidityParams {
    int24 tickLower;         // Lower tick of the position
    int24 tickUpper;         // Upper tick of the position
    int256 liquidityDelta;   // Amount of liquidity to add (positive) or remove (negative)
    bytes32 salt;            // Unique identifier for the position
}

struct BalanceDelta {
    int128 amount0;
    int128 amount1;
}

struct SwapParams {
    bool zeroForOne;
    int256 amountSpecified;
    uint160 sqrtPriceLimitX96;
}

type BeforeSwapDelta is int256;

library CurrencyLibrary {
    function transfer(Currency currency, address to, uint256 amount) internal {
        if (Currency.unwrap(currency) == address(0)) {
            // Native ETH
            (bool success,) = to.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // ERC20
            (bool success, bytes memory data) = Currency.unwrap(currency).call(
                abi.encodeWithSignature("transfer(address,uint256)", to, amount)
            );
            require(success && (data.length == 0 || abi.decode(data, (bool))), "Transfer failed");
        }
    }
    
    function balanceOf(Currency currency, address account) internal view returns (uint256) {
        if (Currency.unwrap(currency) == address(0)) {
            return account.balance;
        } else {
            (bool success, bytes memory data) = Currency.unwrap(currency).staticcall(
                abi.encodeWithSignature("balanceOf(address)", account)
            );
            require(success, "BalanceOf failed");
            return abi.decode(data, (uint256));
        }
    }
}
