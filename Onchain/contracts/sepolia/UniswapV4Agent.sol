// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title UniswapV4Agent
 * @notice Autonomous liquidity management agent for No-Scroll Savings
 * @dev Manages USDC liquidity in Uniswap v4 pools with yield optimization
 */
contract UniswapV4Agent is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    /* ========== CONSTANTS ========== */
    
    uint256 public constant REBALANCE_THRESHOLD = 500; // 5% in basis points
    uint256 public constant MAX_SLIPPAGE = 100; // 1% in basis points
    uint256 public constant MIN_LIQUIDITY = 100 * 10**6; // 100 USDC minimum
    uint256 public constant BASIS_POINTS = 10000;
    
    /* ========== STATE VARIABLES ========== */
    
    IERC20 public immutable USDC;
    address public treasuryManager;
    address public poolManager; // Uniswap v4 PoolManager
    address public hookContract;
    
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
        address _owner
    ) Ownable(_owner) {
        USDC = IERC20(_usdc);
        poolManager = _poolManager;
        
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
     * @notice Deposit USDC and distribute across optimal pools
     * @param amount Amount of USDC to deposit
     */
    function depositLiquidity(uint256 amount) public onlyTreasury nonReentrant {
        require(amount >= MIN_LIQUIDITY, "Below minimum");
        
        // Transfer USDC from treasury
        USDC.safeTransferFrom(msg.sender, address(this), amount);
        
        // Distribute liquidity across active pools
        _distributeLiquidity(amount);
        
        totalDeployed += amount;
    }
    
    /**
     * @notice Withdraw liquidity from pools
     * @param amount Amount to withdraw
     */
    function withdrawLiquidity(uint256 amount) public onlyTreasury nonReentrant {
        require(amount <= totalDeployed, "Insufficient liquidity");
        
        // Withdraw from pools strategically
        _withdrawFromPools(amount);
        
        // Transfer back to treasury
        USDC.safeTransfer(treasuryManager, amount);
        
        totalDeployed -= amount;
    }
    
    /**
     * @notice Internal function to distribute liquidity across pools
     */
    function _distributeLiquidity(uint256 amount) internal {
        uint256 activePoolCount = _getActivePoolCount();
        require(activePoolCount > 0, "No active pools");
        
        uint256 remaining = amount;
        
        // Sort pools by APY and allocate proportionally
        for (uint256 i = 0; i < pools.length && remaining > 0; i++) {
            if (pools[i].active) {
                // Allocate based on pool performance and strategy
                uint256 allocation = _calculateOptimalAllocation(i, remaining);
                
                if (allocation > 0) {
                    _addLiquidityToPool(i, allocation);
                    remaining -= allocation;
                }
            }
        }
    }
    
    /**
     * @notice Internal function to withdraw from pools
     */
    function _withdrawFromPools(uint256 amount) internal {
        uint256 remaining = amount;
        
        // Withdraw from lowest performing pools first
        for (uint256 i = 0; i < pools.length && remaining > 0; i++) {
            if (pools[i].allocatedAmount > 0) {
                uint256 available = pools[i].allocatedAmount;
                uint256 toWithdraw = remaining > available ? available : remaining;
                
                _removeLiquidityFromPool(i, toWithdraw);
                remaining -= toWithdraw;
            }
        }
        
        require(remaining == 0, "Insufficient pool liquidity");
    }
    
    /**
     * @notice Add liquidity to specific pool
     */
    function _addLiquidityToPool(uint256 poolIndex, uint256 amount) internal {
        PoolInfo storage pool = pools[poolIndex];
        
        // Approve pool manager
        USDC.forceApprove(poolManager, amount);
        
        // Here you would call actual Uniswap v4 PoolManager.modifyLiquidity()
        // For now, we track the allocation
        pool.allocatedAmount += amount;
        pool.lastRebalanceTime = block.timestamp;
        
        emit LiquidityDeposited(amount, pool.poolId);
    }
    
    /**
     * @notice Remove liquidity from specific pool
     */
    function _removeLiquidityFromPool(uint256 poolIndex, uint256 amount) internal {
        PoolInfo storage pool = pools[poolIndex];
        require(pool.allocatedAmount >= amount, "Insufficient pool allocation");
        
        // Here you would call actual Uniswap v4 PoolManager.modifyLiquidity() with negative delta
        pool.allocatedAmount -= amount;
        
        emit LiquidityWithdrawn(amount, pool.poolId);
    }
    
    /* ========== YIELD OPTIMIZATION ========== */
    
    /**
     * @notice Calculate optimal allocation for a pool
     */
    function _calculateOptimalAllocation(
        uint256 poolIndex,
        uint256 availableAmount
    ) internal view returns (uint256) {
        PoolInfo memory pool = pools[poolIndex];
        
        // Simple strategy: equal distribution for now
        // In production, this would use:
        // - Current pool APY
        // - Pool TVL and liquidity depth
        // - Historical performance
        // - Risk score
        uint256 activeCount = _getActivePoolCount();
        return availableAmount / activeCount;
    }
    
    /**
     * @notice Automated rebalancing across pools
     */
    function rebalance() public nonReentrant {
        require(strategy.autoRebalance, "Auto-rebalance disabled");
        
        uint256 poolsRebalanced = 0;
        
        for (uint256 i = 0; i < pools.length; i++) {
            if (pools[i].active && 
                block.timestamp >= pools[i].lastRebalanceTime + strategy.rebalanceInterval) {
                
                // Check if rebalance is needed
                if (_shouldRebalancePool(i)) {
                    _rebalancePool(i);
                    poolsRebalanced++;
                }
            }
        }
        
        emit Rebalanced(totalDeployed, poolsRebalanced);
    }
    
    /**
     * @notice Check if pool needs rebalancing
     */
    function _shouldRebalancePool(uint256 poolIndex) internal view returns (bool) {
        PoolInfo memory pool = pools[poolIndex];
        
        // Calculate target allocation
        uint256 targetAllocation = totalDeployed / _getActivePoolCount();
        
        // Check if current allocation deviates beyond threshold
        if (pool.allocatedAmount == 0) return false;
        
        uint256 deviation = pool.allocatedAmount > targetAllocation
            ? ((pool.allocatedAmount - targetAllocation) * BASIS_POINTS) / targetAllocation
            : ((targetAllocation - pool.allocatedAmount) * BASIS_POINTS) / targetAllocation;
        
        return deviation > REBALANCE_THRESHOLD;
    }
    
    /**
     * @notice Rebalance specific pool
     */
    function _rebalancePool(uint256 poolIndex) internal {
        // Calculate target allocation
        uint256 targetAllocation = totalDeployed / _getActivePoolCount();
        PoolInfo storage pool = pools[poolIndex];
        
        if (pool.allocatedAmount > targetAllocation) {
            // Remove excess
            uint256 excess = pool.allocatedAmount - targetAllocation;
            _removeLiquidityFromPool(poolIndex, excess);
        } else if (pool.allocatedAmount < targetAllocation) {
            // Add deficit (if we have available funds)
            uint256 deficit = targetAllocation - pool.allocatedAmount;
            uint256 available = USDC.balanceOf(address(this));
            uint256 toAdd = deficit > available ? available : deficit;
            
            if (toAdd > 0) {
                _addLiquidityToPool(poolIndex, toAdd);
            }
        }
        
        pool.lastRebalanceTime = block.timestamp;
    }
    
    /**
     * @notice Harvest accumulated yield
     */
    function harvestYield() public nonReentrant returns (uint256 totalYield) {
        for (uint256 i = 0; i < pools.length; i++) {
            if (pools[i].active) {
                uint256 poolYield = _harvestPoolYield(i);
                totalYield += poolYield;
            }
        }
        
        if (totalYield > 0) {
            totalYieldGenerated += totalYield;
            lastYieldHarvest = block.timestamp;
            
            // Transfer yield to treasury
            USDC.safeTransfer(treasuryManager, totalYield);
            
            emit YieldHarvested(totalYield);
        }
        
        return totalYield;
    }
    
    /**
     * @notice Harvest yield from specific pool
     */
    function _harvestPoolYield(uint256 poolIndex) internal returns (uint256) {
        PoolInfo storage pool = pools[poolIndex];
        
        // Here you would collect fees from Uniswap v4 pool
        // For now, simulate yield calculation
        uint256 currentBalance = USDC.balanceOf(address(this));
        
        if (currentBalance > totalDeployed) {
            uint256 yield = currentBalance - totalDeployed;
            pool.cumulativeYield += yield;
            return yield;
        }
        
        return 0;
    }
    
    /* ========== POOL MANAGEMENT ========== */
    
    /**
     * @notice Add new pool to strategy
     */
    function addPool(
        bytes32 poolId,
        address token0,
        address token1,
        uint24 fee
    ) public onlyOwner {
        require(!isPoolRegistered[poolId], "Pool already registered");
        
        PoolInfo memory newPool = PoolInfo({
            poolId: poolId,
            token0: token0,
            token1: token1,
            fee: fee,
            liquidity: 0,
            allocatedAmount: 0,
            lastRebalanceTime: block.timestamp,
            cumulativeYield: 0,
            active: true
        });
        
        pools.push(newPool);
        poolIdToIndex[poolId] = pools.length - 1;
        isPoolRegistered[poolId] = true;
        
        emit PoolAdded(poolId, token0, token1, fee);
    }
    
    /**
     * @notice Deactivate pool
     */
    function deactivatePool(bytes32 poolId) public onlyOwner {
        require(isPoolRegistered[poolId], "Pool not registered");
        
        uint256 index = poolIdToIndex[poolId];
        PoolInfo storage pool = pools[index];
        
        // Withdraw all liquidity from pool
        if (pool.allocatedAmount > 0) {
            _removeLiquidityFromPool(index, pool.allocatedAmount);
        }
        
        pool.active = false;
        
        emit PoolRemoved(poolId);
    }
    
    /**
     * @notice Get active pool count
     */
    function _getActivePoolCount() internal view returns (uint256 count) {
        for (uint256 i = 0; i < pools.length; i++) {
            if (pools[i].active) count++;
        }
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    function getPoolInfo(bytes32 poolId) public view returns (
        address token0,
        address token1,
        uint24 fee,
        uint256 allocatedAmount,
        uint256 cumulativeYield,
        bool active
    ) {
        require(isPoolRegistered[poolId], "Pool not registered");
        PoolInfo memory pool = pools[poolIdToIndex[poolId]];
        
        return (
            pool.token0,
            pool.token1,
            pool.fee,
            pool.allocatedAmount,
            pool.cumulativeYield,
            pool.active
        );
    }
    
    function getTotalStats() public view returns (
        uint256 deployed,
        uint256 yieldGenerated,
        uint256 activePoolCount,
        uint256 lastHarvest
    ) {
        return (
            totalDeployed,
            totalYieldGenerated,
            _getActivePoolCount(),
            lastYieldHarvest
        );
    }
    
    function getStrategy() public view returns (
        uint256 targetAPY,
        uint256 minAPY,
        uint256 maxRiskScore,
        bool autoRebalance,
        uint256 rebalanceInterval
    ) {
        return (
            strategy.targetAPY,
            strategy.minAPY,
            strategy.maxRiskScore,
            strategy.autoRebalance,
            strategy.rebalanceInterval
        );
    }
    
    /* ========== ADMIN FUNCTIONS ========== */
    
    function setTreasuryManager(address _treasury) public onlyOwner {
        treasuryManager = _treasury;
    }
    
    function setPoolManager(address _poolManager) public onlyOwner {
        poolManager = _poolManager;
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
}
