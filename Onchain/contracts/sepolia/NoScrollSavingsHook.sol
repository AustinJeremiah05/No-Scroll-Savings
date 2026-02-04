// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NoScrollSavingsHook
 * @notice Custom Uniswap v4 Hook for No-Scroll Savings risk management
 * @dev Implements safety checks and monitoring for liquidity positions
 */
contract NoScrollSavingsHook {
    
    /* ========== CONSTANTS ========== */
    
    uint256 public constant MAX_PRICE_IMPACT = 200; // 2% max price impact
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant CIRCUIT_BREAKER_THRESHOLD = 1000; // 10% price movement
    
    /* ========== STATE VARIABLES ========== */
    
    address public agent;
    address public owner;
    
    bool public circuitBreakerActive;
    uint256 public lastPriceCheck;
    
    // Pool safety tracking
    struct PoolSafety {
        uint256 lastPrice;
        uint256 priceUpdateTime;
        uint256 totalVolume24h;
        uint256 suspiciousActivityCount;
        bool paused;
    }
    
    mapping(bytes32 => PoolSafety) public poolSafety;
    
    /* ========== EVENTS ========== */
    
    event CircuitBreakerTriggered(bytes32 indexed poolId, uint256 priceChange);
    event PriceImpactExceeded(bytes32 indexed poolId, uint256 impact);
    event PoolPaused(bytes32 indexed poolId, string reason);
    event PoolResumed(bytes32 indexed poolId);
    event SuspiciousActivityDetected(bytes32 indexed poolId, string reason);
    
    /* ========== CONSTRUCTOR ========== */
    
    constructor(address _agent, address _owner) {
        agent = _agent;
        owner = _owner;
        circuitBreakerActive = false;
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
    
    modifier whenNotPaused(bytes32 poolId) {
        require(!poolSafety[poolId].paused, "Pool paused");
        require(!circuitBreakerActive, "Circuit breaker active");
        _;
    }
    
    /* ========== HOOK FUNCTIONS ========== */
    
    /**
     * @notice Called before swap execution
     * @dev Validates price impact and market conditions
     */
    function beforeSwap(
        bytes32 poolId,
        address sender,
        uint256 amountIn,
        uint256 expectedAmountOut,
        uint256 currentPrice
    ) public onlyAgent whenNotPaused(poolId) returns (bool) {
        
        // Check price impact
        uint256 priceImpact = _calculatePriceImpact(poolId, amountIn, currentPrice);
        if (priceImpact > MAX_PRICE_IMPACT) {
            emit PriceImpactExceeded(poolId, priceImpact);
            return false;
        }
        
        // Check circuit breaker conditions
        if (_checkCircuitBreaker(poolId, currentPrice)) {
            circuitBreakerActive = true;
            emit CircuitBreakerTriggered(poolId, priceImpact);
            return false;
        }
        
        // Update pool tracking
        _updatePoolSafety(poolId, currentPrice, amountIn);
        
        return true;
    }
    
    /**
     * @notice Called after swap execution
     * @dev Monitors execution and updates metrics
     */
    function afterSwap(
        bytes32 poolId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 finalPrice
    ) public onlyAgent returns (bool) {
        
        PoolSafety storage safety = poolSafety[poolId];
        
        // Update 24h volume
        safety.totalVolume24h += amountIn;
        
        // Check for anomalies
        if (_detectAnomalies(poolId, amountIn, amountOut, finalPrice)) {
            safety.suspiciousActivityCount++;
            emit SuspiciousActivityDetected(poolId, "Unusual swap pattern");
            
            // Pause pool if too many suspicious activities
            if (safety.suspiciousActivityCount >= 3) {
                safety.paused = true;
                emit PoolPaused(poolId, "Multiple suspicious activities");
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @notice Called before adding liquidity
     * @dev Validates liquidity addition safety
     */
    function beforeAddLiquidity(
        bytes32 poolId,
        uint256 amount,
        uint256 currentPrice
    ) public onlyAgent whenNotPaused(poolId) returns (bool) {
        
        // Ensure pool is healthy
        PoolSafety memory safety = poolSafety[poolId];
        
        if (safety.suspiciousActivityCount > 0) {
            // Wait for suspicious activity to clear
            if (block.timestamp < safety.priceUpdateTime + 1 hours) {
                return false;
            }
        }
        
        // Update price before adding liquidity
        poolSafety[poolId].lastPrice = currentPrice;
        poolSafety[poolId].priceUpdateTime = block.timestamp;
        
        return true;
    }
    
    /**
     * @notice Called before removing liquidity
     * @dev Validates liquidity removal safety
     */
    function beforeRemoveLiquidity(
        bytes32 poolId,
        uint256 amount,
        uint256 currentPrice
    ) public onlyAgent returns (bool) {
        
        // Always allow liquidity removal (but check for sandwiching)
        if (_detectSandwichAttack(poolId)) {
            emit SuspiciousActivityDetected(poolId, "Potential sandwich attack");
            // Don't block, but alert
        }
        
        return true;
    }
    
    /* ========== INTERNAL FUNCTIONS ========== */
    
    /**
     * @notice Calculate price impact of a trade
     */
    function _calculatePriceImpact(
        bytes32 poolId,
        uint256 amountIn,
        uint256 currentPrice
    ) internal view returns (uint256) {
        PoolSafety memory safety = poolSafety[poolId];
        
        if (safety.lastPrice == 0) return 0;
        
        uint256 priceDiff = currentPrice > safety.lastPrice
            ? currentPrice - safety.lastPrice
            : safety.lastPrice - currentPrice;
        
        return (priceDiff * BASIS_POINTS) / safety.lastPrice;
    }
    
    /**
     * @notice Check if circuit breaker should trigger
     */
    function _checkCircuitBreaker(
        bytes32 poolId,
        uint256 currentPrice
    ) internal view returns (bool) {
        PoolSafety memory safety = poolSafety[poolId];
        
        if (safety.lastPrice == 0) return false;
        
        uint256 priceChange = _calculatePriceImpact(poolId, 0, currentPrice);
        
        return priceChange > CIRCUIT_BREAKER_THRESHOLD;
    }
    
    /**
     * @notice Update pool safety metrics
     */
    function _updatePoolSafety(
        bytes32 poolId,
        uint256 currentPrice,
        uint256 volume
    ) internal {
        PoolSafety storage safety = poolSafety[poolId];
        
        safety.lastPrice = currentPrice;
        safety.priceUpdateTime = block.timestamp;
        
        // Reset 24h volume if needed
        if (block.timestamp > safety.priceUpdateTime + 24 hours) {
            safety.totalVolume24h = volume;
        } else {
            safety.totalVolume24h += volume;
        }
    }
    
    /**
     * @notice Detect anomalous trading patterns
     */
    function _detectAnomalies(
        bytes32 poolId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 finalPrice
    ) internal view returns (bool) {
        PoolSafety memory safety = poolSafety[poolId];
        
        // Check for unusual price movements
        if (safety.lastPrice > 0) {
            uint256 priceChange = finalPrice > safety.lastPrice
                ? ((finalPrice - safety.lastPrice) * BASIS_POINTS) / safety.lastPrice
                : ((safety.lastPrice - finalPrice) * BASIS_POINTS) / safety.lastPrice;
            
            if (priceChange > 500) { // 5% sudden change
                return true;
            }
        }
        
        // Check for suspiciously large trades
        if (amountIn > safety.totalVolume24h / 10) { // Single trade > 10% of 24h volume
            return true;
        }
        
        return false;
    }
    
    /**
     * @notice Detect potential sandwich attacks
     */
    function _detectSandwichAttack(bytes32 poolId) internal view returns (bool) {
        PoolSafety memory safety = poolSafety[poolId];
        
        // Check for rapid price movements in short time
        if (block.timestamp < safety.priceUpdateTime + 30 seconds) {
            return true;
        }
        
        return false;
    }
    
    /* ========== ADMIN FUNCTIONS ========== */
    
    /**
     * @notice Manually pause a pool
     */
    function pausePool(bytes32 poolId, string memory reason) public onlyOwner {
        poolSafety[poolId].paused = true;
        emit PoolPaused(poolId, reason);
    }
    
    /**
     * @notice Resume a paused pool
     */
    function resumePool(bytes32 poolId) public onlyOwner {
        poolSafety[poolId].paused = false;
        poolSafety[poolId].suspiciousActivityCount = 0;
        emit PoolResumed(poolId);
    }
    
    /**
     * @notice Reset circuit breaker
     */
    function resetCircuitBreaker() public onlyOwner {
        circuitBreakerActive = false;
    }
    
    /**
     * @notice Update agent address
     */
    function setAgent(address _agent) public onlyOwner {
        agent = _agent;
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    function getPoolSafety(bytes32 poolId) public view returns (
        uint256 lastPrice,
        uint256 priceUpdateTime,
        uint256 totalVolume24h,
        uint256 suspiciousActivityCount,
        bool paused
    ) {
        PoolSafety memory safety = poolSafety[poolId];
        return (
            safety.lastPrice,
            safety.priceUpdateTime,
            safety.totalVolume24h,
            safety.suspiciousActivityCount,
            safety.paused
        );
    }
    
    function isPoolSafe(bytes32 poolId) public view returns (bool) {
        PoolSafety memory safety = poolSafety[poolId];
        return !safety.paused && 
               !circuitBreakerActive && 
               safety.suspiciousActivityCount < 3;
    }
}
