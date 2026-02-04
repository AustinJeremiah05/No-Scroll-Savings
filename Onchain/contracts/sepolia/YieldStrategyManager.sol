// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title YieldStrategyManager
 * @notice Advanced yield optimization and strategy management for No-Scroll Savings
 * @dev Manages multiple strategies and automatically selects optimal pools
 */
contract YieldStrategyManager {
    
    /* ========== STRUCTS ========== */
    
    struct PoolMetrics {
        uint256 apy; // Annual Percentage Yield in basis points
        uint256 tvl; // Total Value Locked
        uint256 volume24h; // 24-hour trading volume
        uint256 fees24h; // 24-hour fees collected
        uint256 liquidityDepth; // Available liquidity
        uint256 riskScore; // 0-100, lower is safer
        uint256 lastUpdated;
    }
    
    struct Strategy {
        string name;
        uint256 minAPY; // Minimum acceptable APY
        uint256 maxRisk; // Maximum acceptable risk score
        uint256 minLiquidity; // Minimum liquidity requirement
        uint256[] poolAllocation; // Percentage allocation per pool (basis points)
        bool active;
    }
    
    struct PerformanceMetrics {
        uint256 totalReturn; // Cumulative returns
        uint256 avgAPY; // Average APY over time
        uint256 sharpeRatio; // Risk-adjusted returns
        uint256 maxDrawdown; // Maximum loss from peak
        uint256 winRate; // Percentage of profitable periods
    }
    
    /* ========== STATE VARIABLES ========== */
    
    address public agent;
    address public owner;
    
    mapping(bytes32 => PoolMetrics) public poolMetrics;
    mapping(uint256 => Strategy) public strategies;
    mapping(uint256 => PerformanceMetrics) public strategyPerformance;
    
    uint256 public activeStrategyId;
    uint256 public strategyCount;
    
    bytes32[] public trackedPools;
    
    /* ========== CONSTANTS ========== */
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant LOW_RISK_THRESHOLD = 30;
    uint256 public constant MEDIUM_RISK_THRESHOLD = 60;
    uint256 public constant HIGH_RISK_THRESHOLD = 80;
    
    /* ========== EVENTS ========== */
    
    event StrategyCreated(uint256 indexed strategyId, string name);
    event StrategyActivated(uint256 indexed strategyId);
    event PoolMetricsUpdated(bytes32 indexed poolId, uint256 apy, uint256 riskScore);
    event AllocationRecommended(bytes32[] pools, uint256[] allocations);
    
    /* ========== CONSTRUCTOR ========== */
    
    constructor(address _agent, address _owner) {
        agent = _agent;
        owner = _owner;
        
        // Create default conservative strategy
        _createDefaultStrategy();
    }
    
    /* ========== MODIFIERS ========== */
    
    modifier onlyAgent() {
        require(msg.sender == agent, "Only agent");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    /* ========== STRATEGY MANAGEMENT ========== */
    
    /**
     * @notice Create a new yield strategy
     */
    function createStrategy(
        string memory name,
        uint256 minAPY,
        uint256 maxRisk,
        uint256 minLiquidity,
        uint256[] memory poolAllocation
    ) public onlyOwner returns (uint256 strategyId) {
        strategyId = strategyCount++;
        
        strategies[strategyId] = Strategy({
            name: name,
            minAPY: minAPY,
            maxRisk: maxRisk,
            minLiquidity: minLiquidity,
            poolAllocation: poolAllocation,
            active: false
        });
        
        emit StrategyCreated(strategyId, name);
        return strategyId;
    }
    
    /**
     * @notice Activate a strategy
     */
    function activateStrategy(uint256 strategyId) public onlyOwner {
        require(strategyId < strategyCount, "Invalid strategy");
        require(strategies[strategyId].active || strategyId == 0, "Strategy exists");
        
        // Deactivate current strategy
        if (activeStrategyId != strategyId) {
            strategies[activeStrategyId].active = false;
        }
        
        // Activate new strategy
        strategies[strategyId].active = true;
        activeStrategyId = strategyId;
        
        emit StrategyActivated(strategyId);
    }
    
    /**
     * @notice Create default conservative strategy
     */
    function _createDefaultStrategy() internal {
        uint256[] memory allocation = new uint256[](0);
        
        strategies[0] = Strategy({
            name: "Conservative",
            minAPY: 200, // 2%
            maxRisk: LOW_RISK_THRESHOLD,
            minLiquidity: 100000 * 10**6, // $100k
            poolAllocation: allocation,
            active: true
        });
        
        strategyCount = 1;
        activeStrategyId = 0;
    }
    
    /* ========== POOL ANALYSIS ========== */
    
    /**
     * @notice Update pool metrics
     */
    function updatePoolMetrics(
        bytes32 poolId,
        uint256 apy,
        uint256 tvl,
        uint256 volume24h,
        uint256 fees24h,
        uint256 liquidityDepth
    ) public onlyAgent {
        uint256 riskScore = _calculateRiskScore(tvl, volume24h, liquidityDepth);
        
        poolMetrics[poolId] = PoolMetrics({
            apy: apy,
            tvl: tvl,
            volume24h: volume24h,
            fees24h: fees24h,
            liquidityDepth: liquidityDepth,
            riskScore: riskScore,
            lastUpdated: block.timestamp
        });
        
        // Add to tracked pools if new
        if (!_isPoolTracked(poolId)) {
            trackedPools.push(poolId);
        }
        
        emit PoolMetricsUpdated(poolId, apy, riskScore);
    }
    
    /**
     * @notice Calculate risk score for a pool
     */
    function _calculateRiskScore(
        uint256 tvl,
        uint256 volume24h,
        uint256 liquidityDepth
    ) internal pure returns (uint256) {
        uint256 riskScore = 50; // Base score
        
        // Lower TVL = higher risk
        if (tvl < 1000000 * 10**6) { // < $1M
            riskScore += 20;
        } else if (tvl < 10000000 * 10**6) { // < $10M
            riskScore += 10;
        }
        
        // Low volume = higher risk
        if (volume24h < tvl / 100) { // < 1% of TVL
            riskScore += 15;
        }
        
        // Low liquidity depth = higher risk
        if (liquidityDepth < tvl / 10) { // < 10% of TVL
            riskScore += 15;
        }
        
        return riskScore > 100 ? 100 : riskScore;
    }
    
    /**
     * @notice Check if pool is tracked
     */
    function _isPoolTracked(bytes32 poolId) internal view returns (bool) {
        for (uint256 i = 0; i < trackedPools.length; i++) {
            if (trackedPools[i] == poolId) return true;
        }
        return false;
    }
    
    /* ========== YIELD OPTIMIZATION ========== */
    
    /**
     * @notice Get optimal pool allocation based on active strategy
     */
    function getOptimalAllocation(uint256 totalAmount) public view returns (
        bytes32[] memory pools,
        uint256[] memory amounts
    ) {
        Strategy memory strategy = strategies[activeStrategyId];
        
        // Find eligible pools
        bytes32[] memory eligiblePools = _getEligiblePools(strategy);
        
        if (eligiblePools.length == 0) {
            return (new bytes32[](0), new uint256[](0));
        }
        
        // Allocate based on risk-adjusted returns
        uint256[] memory allocations = _calculateOptimalAllocations(
            eligiblePools,
            totalAmount,
            strategy
        );
        
        return (eligiblePools, allocations);
    }
    
    /**
     * @notice Get pools that meet strategy criteria
     */
    function _getEligiblePools(Strategy memory strategy) internal view returns (bytes32[] memory) {
        uint256 eligibleCount = 0;
        
        // First pass: count eligible pools
        for (uint256 i = 0; i < trackedPools.length; i++) {
            PoolMetrics memory metrics = poolMetrics[trackedPools[i]];
            
            if (metrics.apy >= strategy.minAPY &&
                metrics.riskScore <= strategy.maxRisk &&
                metrics.liquidityDepth >= strategy.minLiquidity) {
                eligibleCount++;
            }
        }
        
        // Second pass: populate array
        bytes32[] memory eligible = new bytes32[](eligibleCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < trackedPools.length; i++) {
            PoolMetrics memory metrics = poolMetrics[trackedPools[i]];
            
            if (metrics.apy >= strategy.minAPY &&
                metrics.riskScore <= strategy.maxRisk &&
                metrics.liquidityDepth >= strategy.minLiquidity) {
                eligible[index++] = trackedPools[i];
            }
        }
        
        return eligible;
    }
    
    /**
     * @notice Calculate optimal allocations across pools
     */
    function _calculateOptimalAllocations(
        bytes32[] memory pools,
        uint256 totalAmount,
        Strategy memory strategy
    ) internal view returns (uint256[] memory) {
        uint256[] memory allocations = new uint256[](pools.length);
        
        if (pools.length == 0) return allocations;
        
        // Calculate risk-adjusted scores
        uint256[] memory scores = new uint256[](pools.length);
        uint256 totalScore = 0;
        
        for (uint256 i = 0; i < pools.length; i++) {
            PoolMetrics memory metrics = poolMetrics[pools[i]];
            
            // Score = APY / (Risk Score + 1)
            // Higher APY, lower risk = higher score
            scores[i] = (metrics.apy * BASIS_POINTS) / (metrics.riskScore + 1);
            totalScore += scores[i];
        }
        
        // Allocate proportionally to scores
        uint256 allocated = 0;
        for (uint256 i = 0; i < pools.length; i++) {
            if (i == pools.length - 1) {
                // Last pool gets remainder
                allocations[i] = totalAmount - allocated;
            } else {
                allocations[i] = (totalAmount * scores[i]) / totalScore;
                allocated += allocations[i];
            }
        }
        
        return allocations;
    }
    
    /**
     * @notice Recommend rebalancing if needed
     */
    function shouldRebalance(
        bytes32[] memory currentPools,
        uint256[] memory currentAllocations
    ) public view returns (bool, bytes32[] memory, uint256[] memory) {
        Strategy memory strategy = strategies[activeStrategyId];
        
        // Get optimal allocation
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < currentAllocations.length; i++) {
            totalAmount += currentAllocations[i];
        }
        
        (bytes32[] memory optimalPools, uint256[] memory optimalAllocations) = 
            this.getOptimalAllocation(totalAmount);
        
        // Check if rebalance needed (>5% deviation)
        bool needsRebalance = _checkRebalanceThreshold(
            currentPools,
            currentAllocations,
            optimalPools,
            optimalAllocations
        );
        
        return (needsRebalance, optimalPools, optimalAllocations);
    }
    
    /**
     * @notice Check if current allocation deviates from optimal
     */
    function _checkRebalanceThreshold(
        bytes32[] memory currentPools,
        uint256[] memory currentAllocations,
        bytes32[] memory optimalPools,
        uint256[] memory optimalAllocations
    ) internal pure returns (bool) {
        // Simplified check: if pool count differs, rebalance
        if (currentPools.length != optimalPools.length) return true;
        
        // Check allocation deviation
        for (uint256 i = 0; i < currentPools.length; i++) {
            if (currentAllocations[i] == 0) continue;
            
            uint256 deviation = currentAllocations[i] > optimalAllocations[i]
                ? ((currentAllocations[i] - optimalAllocations[i]) * BASIS_POINTS) / currentAllocations[i]
                : ((optimalAllocations[i] - currentAllocations[i]) * BASIS_POINTS) / currentAllocations[i];
            
            if (deviation > 500) { // >5% deviation
                return true;
            }
        }
        
        return false;
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    function getPoolMetrics(bytes32 poolId) public view returns (
        uint256 apy,
        uint256 tvl,
        uint256 volume24h,
        uint256 riskScore,
        uint256 lastUpdated
    ) {
        PoolMetrics memory metrics = poolMetrics[poolId];
        return (
            metrics.apy,
            metrics.tvl,
            metrics.volume24h,
            metrics.riskScore,
            metrics.lastUpdated
        );
    }
    
    function getActiveStrategy() public view returns (
        string memory name,
        uint256 minAPY,
        uint256 maxRisk,
        uint256 minLiquidity
    ) {
        Strategy memory strategy = strategies[activeStrategyId];
        return (
            strategy.name,
            strategy.minAPY,
            strategy.maxRisk,
            strategy.minLiquidity
        );
    }
    
    function getTrackedPoolsCount() public view returns (uint256) {
        return trackedPools.length;
    }
    
    /* ========== ADMIN FUNCTIONS ========== */
    
    function setAgent(address _agent) public onlyOwner {
        agent = _agent;
    }
}
