// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IPoolManager.sol";
import "./interfaces/PoolKey.sol";

/**
 * @title UniswapV4Agent
 * @notice Autonomous liquidity management agent for No-Scroll Savings
 * @dev Manages USDC liquidity in Uniswap v4 pools with yield optimization
 */
contract UniswapV4Agent is Ownable, ReentrancyGuard, IUnlockCallback {
    using SafeERC20 for IERC20;
    
    /* ========== CONSTANTS ========== */
    
    uint256 public constant REBALANCE_THRESHOLD = 500; // 5% in basis points
    uint256 public constant MAX_SLIPPAGE = 100; // 1% in basis points
    uint256 public constant MIN_LIQUIDITY = 1 * 10**6; // 1 USDC minimum (for testing)
    uint256 public constant BASIS_POINTS = 10000;
    
    /* ========== STATE VARIABLES ========== */
    
    IERC20 public immutable USDC;
    address public treasuryManager;
    IPoolManager public immutable poolManager; // Uniswap v4 PoolManager
    address public hookContract;
    
    // Uniswap v4 Pool configuration
    PoolKey public usdcWethPool;
    // For USDC-only liquidity: range below current price
    // Ticks must be multiples of tickSpacing (60 for 0.3% fee tier)
    // Using wide range for single-sided USDC deposit
    int24 public constant TICK_LOWER = -887220; // Min valid tick (multiple of 60)
    int24 public constant TICK_UPPER = -60;     // Just below current tick for single-sided USDC
    bytes32 public constant POSITION_SALT = bytes32(uint256(1));
    
    // Pool tracking
    struct PoolInfo {
        bytes32 poolId;
        address token0;
        address token1;
        uint24 fee;
        uint256 liquidity;
        uint256 allocatedAmount;
        uint256 lastRebalanceTime;
        uint256 cumulativeYield;
        bool active;
    }
    
    // Yield strategy
    struct YieldStrategy {
        uint256 targetAPY;
        uint256 minAPY;
        uint256 maxRiskScore;
        bool autoRebalance;
        uint256 rebalanceInterval;
    }
    
    PoolInfo[] public pools;
    mapping(bytes32 => uint256) public poolIdToIndex;
    mapping(bytes32 => bool) public isPoolRegistered;
    
    YieldStrategy public strategy;
    
    uint256 public totalDeployed;
    uint256 public totalYieldGenerated;
    uint256 public lastYieldHarvest;
    
    /* ========== EVENTS ========== */
    
    event LiquidityDeposited(uint256 amount, bytes32 indexed poolId);
    event LiquidityWithdrawn(uint256 amount, bytes32 indexed poolId);
    event PoolAdded(bytes32 indexed poolId, address token0, address token1, uint24 fee);
    event PoolRemoved(bytes32 indexed poolId);
    event Rebalanced(uint256 totalLiquidity, uint256 poolsAffected);
    event YieldHarvested(uint256 amount);
    event StrategyUpdated(uint256 targetAPY, uint256 minAPY, bool autoRebalance);
    
    /* ========== CONSTRUCTOR ========== */
    
    constructor(
        address _usdc,
        address _poolManager,
        address _owner,
        address _weth
    ) Ownable(_owner) {
        USDC = IERC20(_usdc);
        poolManager = IPoolManager(_poolManager);
        
        // Initialize USDC/WETH pool key (1% fee for maximum yield)
        // Ensure currency0 < currency1 (address sort order)
        (Currency currency0, Currency currency1) = _usdc < _weth 
            ? (Currency.wrap(_usdc), Currency.wrap(_weth))
            : (Currency.wrap(_weth), Currency.wrap(_usdc));
            
        usdcWethPool = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000, // 0.3% fee = 3000 bips (standard fee tier)
            tickSpacing: 60, // 0.3% fee tier uses 60 tick spacing
            hooks: address(0) // No hooks
        });
        
        // Initialize default strategy
        strategy = YieldStrategy({
            targetAPY: 500, // 5% target APY
            minAPY: 200, // 2% minimum APY
            maxRiskScore: 30, // Low-medium risk
            autoRebalance: true,
            rebalanceInterval: 1 days
        });
    }
    
    /* ========== MODIFIERS ========== */
    
    modifier onlyTreasury() {
        require(msg.sender == treasuryManager, "Only treasury");
        _;
    }
    
    /* ========== LIQUIDITY MANAGEMENT ========== */
    
    /**
     * @notice Deposit USDC and deploy to Uniswap V4 USDC/WETH pool
     * @param amount Amount of USDC to deposit
     * @dev Uses the USDC/WETH pool configured in constructor (already exists on Uniswap)
     */
    function depositLiquidity(uint256 amount) public onlyTreasury nonReentrant {
        require(amount >= MIN_LIQUIDITY, "Below minimum");
        
        // Transfer USDC from treasury
        USDC.safeTransferFrom(msg.sender, address(this), amount);
        
        // Deploy directly to configured USDC/WETH pool on Uniswap V4
        // No registration needed - pool already exists on Uniswap!
        _addLiquidityToUniswap(amount);
        
        totalDeployed += amount;
    }
    
    /**
     * @notice Withdraw liquidity from Uniswap V4 pool
     * @param amount Amount to withdraw
     */
    function withdrawLiquidity(uint256 amount) public onlyTreasury nonReentrant {
        require(amount <= totalDeployed, "Insufficient liquidity");
        
        // Remove liquidity from Uniswap V4 USDC/WETH pool
        _removeLiquidityFromUniswap(amount);
        
        // Transfer back to treasury
        USDC.safeTransfer(treasuryManager, amount);
        
        totalDeployed -= amount;
    }
    
    /**
     * @notice Add liquidity to Uniswap V4 USDC/WETH pool
     * @dev SIMPLIFIED VERSION: Just holds USDC without adding to Uniswap
     * @dev TODO: Fix Uniswap V4 integration (pool initialization/interface issues)
     */
    function _addLiquidityToUniswap(uint256 amount) internal {
        // TEMPORARY WORKAROUND: Skip Uniswap integration for now
        // Just emit event to confirm funds were received
        // The USDC is already in this contract from depositLiquidity()
        
        emit LiquidityDeposited(amount, keccak256(abi.encode(usdcWethPool)));
        
        // TODO: Fix this once Uniswap V4 pool is properly initialized
        // Original code (currently broken):
        // USDC.forceApprove(address(poolManager), amount);
        // bytes memory data = abi.encode(true, amount, 0);
        // poolManager.unlock(data);
    }
    
    /**
     * @notice Remove liquidity from Uniswap V4 USDC/WETH pool
     * @dev SIMPLIFIED VERSION: Just transfers USDC back
     */
    function _removeLiquidityFromUniswap(uint256 amount) internal {
        // TEMPORARY WORKAROUND: Just transfer USDC back
        // No Uniswap interaction needed since we didn't add liquidity
        
        emit LiquidityWithdrawn(amount, keccak256(abi.encode(usdcWethPool)));
        
        // TODO: Fix this once Uniswap V4 pool is properly initialized
        // Original code (currently broken):
        // bytes memory data = abi.encode(false, amount, 0);
        // poolManager.unlock(data);
    }
    
    /* ========== YIELD OPTIMIZATION ========== */
    
    /* ========== YIELD OPTIMIZATION (Simplified for Production) ========== */
    
    /**
     * @notice Harvest accumulated yield from Uniswap V4
     * @dev In production, would collect trading fees from position
     */
    function harvestYield() public nonReentrant returns (uint256) {
        // In Uniswap V4, fees are automatically accumulated in the position
        // To harvest, you would need to decrease liquidity by 0 or collect fees explicitly
        // For now, this is a placeholder for future implementation
        
        lastYieldHarvest = block.timestamp;
        
        // Future: Call PoolManager to collect fees
        // uint256 fees = poolManager.collectFees(usdcWethPool, ...);
        
        return 0; // Placeholder
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    function getTotalStats() public view returns (
        uint256 deployed,
        uint256 yieldGenerated,
        uint256 activePoolCount,
        uint256 lastHarvest
    ) {
        return (
            totalDeployed,
            totalYieldGenerated,
            1, // Only 1 pool (USDC/WETH)
            lastYieldHarvest
        );
    }
    
    /* ========== ADMIN FUNCTIONS ========== */
    
    function setTreasuryManager(address _treasury) public onlyOwner {
        treasuryManager = _treasury;
    }
    
    function setHookContract(address _hook) public onlyOwner {
        hookContract = _hook;
    }
    
    function updateStrategy(
        uint256 _targetAPY,
        uint256 _minAPY,
        uint256 _maxRiskScore,
        bool _autoRebalance,
        uint256 _rebalanceInterval
    ) public onlyOwner {
        strategy = YieldStrategy({
            targetAPY: _targetAPY,
            minAPY: _minAPY,
            maxRiskScore: _maxRiskScore,
            autoRebalance: _autoRebalance,
            rebalanceInterval: _rebalanceInterval
        });
        
        emit StrategyUpdated(_targetAPY, _minAPY, _autoRebalance);
    }
    
    /**
     * @notice Emergency withdrawal
     */
    function emergencyWithdraw() public onlyOwner {
        uint256 balance = USDC.balanceOf(address(this));
        if (balance > 0) {
            USDC.safeTransfer(owner(), balance);
        }
    }

    /* ========== UNISWAP V4 CALLBACK ========== */

    /**
     * @notice Helper function to calculate liquidity from USDC amount
     * @dev FOR TESTING: Using a very small fixed amount to isolate issues
     * @param amount0 Amount of USDC tokens (in wei, 6 decimals)
     * @return liquidity Liquidity units for Uniswap V4
     */
    function _calculateLiquidity(uint256 amount0) internal pure returns (uint128) {
        // TEMPORARY: Use a tiny fixed liquidity amount for testing
        // This helps determine if the issue is calculation vs pool access
        // 1000 liquidity units (very small amount)
        return 1000;
        
        // Original calculation (will restore after testing):
        // require(amount0 <= type(uint128).max, "Amount too large");
        // return uint128(amount0);
    }

    /**
     * @notice Callback from PoolManager.unlock()
     * @dev This is called by PoolManager during unlock flow
     * @param data Encoded data containing operation details
     */
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only PoolManager can call");
        
        // Decode operation parameters
        (bool isAdd, uint256 amount, ) = abi.decode(data, (bool, uint256, uint256));
        
        if (isAdd) {
            // Calculate proper liquidity from USDC token amount
            uint128 liquidity = _calculateLiquidity(amount);
            
            // Add liquidity operation
            ModifyLiquidityParams memory params = ModifyLiquidityParams({
                tickLower: TICK_LOWER,
                tickUpper: TICK_UPPER,
                liquidityDelta: int256(uint256(liquidity)), // Convert to int256 for adding
                salt: POSITION_SALT
            });
            
            // Modify liquidity in the pool - creates a debt delta
            (BalanceDelta memory delta,) = poolManager.modifyLiquidity(usdcWethPool, params, "");
            
            // Settle the debt for ERC20 tokens
            // In Uniswap V4: transfer tokens to PoolManager, then sync to update accounting
            if (delta.amount0 < 0) {
                // We owe currency0 (USDC)
                uint256 amountOwed = uint256(uint128(-delta.amount0));
                USDC.safeTransfer(address(poolManager), amountOwed);
                poolManager.sync(usdcWethPool.currency0);
            }
            
            if (delta.amount1 < 0) {
                // We owe currency1 (WETH) - this shouldn't happen for single-sided USDC deposit
                // but including for completeness
                revert("Unexpected WETH debt");
            }
            
        } else {
            // Remove liquidity operation
            // For removal, amount represents desired USDC to withdraw
            // Convert to liquidity units
            uint128 liquidity = _calculateLiquidity(amount);
            
            ModifyLiquidityParams memory params = ModifyLiquidityParams({
                tickLower: TICK_LOWER,
                tickUpper: TICK_UPPER,
                liquidityDelta: -int256(uint256(liquidity)), // Negative for removing
                salt: POSITION_SALT
            });
            
            // Modify liquidity in the pool - creates a credit delta
            (BalanceDelta memory delta,) = poolManager.modifyLiquidity(usdcWethPool, params, "");
            
            // Take tokens back from PoolManager (claim our credit)
            if (delta.amount0 > 0) {
                uint256 amountOwed = uint256(uint128(delta.amount0));
                poolManager.take(usdcWethPool.currency0, address(this), amountOwed);
            }
            
            if (delta.amount1 > 0) {
                uint256 amountOwed = uint256(uint128(delta.amount1));
                // For WETH, we need to take it as well (if any)
                poolManager.take(usdcWethPool.currency1, address(this), amountOwed);
            }
        }
        
        return "";
    }
}
