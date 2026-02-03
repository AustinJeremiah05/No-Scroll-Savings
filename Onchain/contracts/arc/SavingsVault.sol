// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IChallengeTracker {
    function registerChallenge(address user, string memory challengeType, uint256 duration) external;
    function getCurrentStreak(address user) external view returns (uint256);
    function getLotteryEntries(address user) external view returns (uint256);
}

/**
 * @title SavingsVault
 * @notice ERC-4626 Tokenized Vault + ERC-7540 Async Redemption + ERC-2612 Permit
 * @dev Arc Liquidity Hub for No-Scroll Savings
 */
contract SavingsVault is ERC4626, ERC20Permit, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    /* ========== CONSTANTS ========== */
    
    uint256 public constant MIN_DEPOSIT = 10 * 10**6; // 10 USDC
    uint256 public constant ONE_WEEK = 7 days;
    uint256 public constant ONE_MONTH = 30 days;
    uint256 public constant THREE_MONTHS = 90 days;
    
    /* ========== STATE VARIABLES ========== */
    
    address public challengeTracker;
    address public lotteryEngine;
    address public backend;
    
    /* ========== STRUCTS ========== */
    
    // Metadata beyond ERC-4626 shares
    struct DepositMetadata {
        uint256 depositTime;
        uint256 unlockTime;
        string challengeType;
        uint256 sourceChainId;
        bool hasActiveDeposit;
    }
    
    // ERC-7540: Async Redemption Request
    struct RedemptionRequest {
        address owner;
        address receiver;
        uint256 shares;
        uint256 assets;
        uint256 requestTime;
        uint256 unlockTime;
        uint256 destinationChainId;
        RedemptionStatus status;
    }
    
    enum RedemptionStatus {
        Pending,
        Claimable,
        Processing,
        Completed,
        Cancelled
    }
    
    struct ChainStats {
        uint256 totalDeposited;
        uint256 activeUsers;
        uint256 lastDepositTime;
    }
    
    struct HubMetrics {
        uint256 totalPooledOnArc;
        uint256 totalBridgedToSepolia;
        uint256 totalYieldOnSepolia;
        uint256 arcBuffer;
        uint256 activeDeposits;
    }
    
    /* ========== MAPPINGS ========== */
    
    mapping(address => DepositMetadata) public depositMetadata;
    mapping(bytes32 => RedemptionRequest) public redemptionRequests;
    mapping(address => bytes32[]) public userRedemptionRequests;
    mapping(uint256 => ChainStats) public chainStats;
    mapping(uint256 => bool) public supportedChains;
    
    HubMetrics public hubMetrics;
    uint256 public totalSupportedChains;
    
    /* ========== EVENTS ========== */
    
    event DepositWithChallenge(
        address indexed caller,
        address indexed owner,
        uint256 assets,
        uint256 shares,
        string challengeType,
        uint256 lockDuration,
        uint256 sourceChainId
    );
    
    event BridgeToSepoliaRequested(
        address indexed user,
        uint256 amount,
        bytes32 indexed bridgeRequestId
    );
    
    event FundsBridgedToSepolia(
        uint256 amount,
        bytes32 indexed bridgeRequestId
    );
    
    event RedemptionRequested(
        bytes32 indexed requestId,
        address indexed owner,
        address indexed receiver,
        uint256 shares,
        uint256 assets,
        uint256 destinationChainId
    );
    
    event BridgeFromSepoliaRequested(
        bytes32 indexed requestId,
        uint256 amount
    );
    
    event RedemptionCompleted(
        bytes32 indexed requestId,
        address indexed receiver,
        uint256 assets
    );
    
    event HubMetricsUpdated(
        uint256 totalPooledOnArc,
        uint256 totalBridgedToSepolia,
        uint256 arcBuffer
    );
    
    /* ========== CONSTRUCTOR ========== */
    
    constructor(
        address _asset,
        address _initialOwner
    )
        ERC4626(IERC20(_asset))
        ERC20("No-Scroll Savings Shares", "nsSHARE")
        ERC20Permit("No-Scroll Savings Shares")
        Ownable(_initialOwner)
    {
        // Initialize supported chains
        supportedChains[0] = true; // Arc
        supportedChains[11155111] = true; // Ethereum Sepolia
        supportedChains[84532] = true; // Base Sepolia
        supportedChains[80002] = true; // Polygon Amoy
        totalSupportedChains = 4;
    }
    
    /* ========== MODIFIERS ========== */
    
    modifier onlyBackend() {
        require(msg.sender == backend, "Only backend");
        _;
    }
    
    /* ========== OVERRIDES ========== */
    
    /**
     * @dev Override decimals to match underlying asset
     */
    function decimals() public view virtual override(ERC4626, ERC20) returns (uint8) {
        return ERC4626.decimals();
    }
    
    /* ========== ERC-4626 OVERRIDES WITH CHALLENGE LOGIC ========== */
    
    /**
     * @notice ERC-4626 deposit with challenge metadata
     * @dev Overrides standard deposit to add lock period + challenge tracking
     */
    function deposit(
        uint256 assets,
        address receiver,
        uint256 lockDuration,
        string memory challengeType,
        uint256 sourceChainId
    ) public nonReentrant returns (uint256 shares, bytes32 bridgeRequestId) {
        require(assets >= MIN_DEPOSIT, "Below minimum deposit");
        require(
            lockDuration == ONE_WEEK || 
            lockDuration == ONE_MONTH || 
            lockDuration == THREE_MONTHS,
            "Invalid lock duration"
        );
        require(!depositMetadata[receiver].hasActiveDeposit, "Already has active deposit");
        
        // ERC-4626: Calculate shares
        shares = previewDeposit(assets);
        
        // ERC-4626: Transfer assets and mint shares
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), assets);
        _mint(receiver, shares);
        
        // Store metadata
        depositMetadata[receiver] = DepositMetadata({
            depositTime: block.timestamp,
            unlockTime: block.timestamp + lockDuration,
            challengeType: challengeType,
            sourceChainId: sourceChainId,
            hasActiveDeposit: true
        });
        
        // Update chain tracking
        if (!supportedChains[sourceChainId]) {
            supportedChains[sourceChainId] = true;
            totalSupportedChains++;
        }
        
        chainStats[sourceChainId].totalDeposited += assets;
        chainStats[sourceChainId].activeUsers += 1;
        chainStats[sourceChainId].lastDepositTime = block.timestamp;
        
        // Update Hub metrics
        hubMetrics.totalPooledOnArc += assets;
        hubMetrics.activeDeposits += 1;
        hubMetrics.arcBuffer += assets;
        
        // Register challenge
        if (challengeTracker != address(0)) {
            IChallengeTracker(challengeTracker).registerChallenge(
                receiver,
                challengeType,
                lockDuration
            );
        }
        
        // Generate bridge request ID
        bridgeRequestId = keccak256(abi.encodePacked(
            receiver,
            assets,
            block.timestamp,
            "bridge-to-sepolia"
        ));
        
        emit Deposit(msg.sender, receiver, assets, shares);
        emit DepositWithChallenge(msg.sender, receiver, assets, shares, challengeType, lockDuration, sourceChainId);
        emit BridgeToSepoliaRequested(receiver, assets, bridgeRequestId);
        emit HubMetricsUpdated(hubMetrics.totalPooledOnArc, hubMetrics.totalBridgedToSepolia, hubMetrics.arcBuffer);
        
        return (shares, bridgeRequestId);
    }
    
    /**
     * @notice Backend confirms funds bridged to Sepolia
     */
    function confirmBridgeToSepolia(
        bytes32 bridgeRequestId,
        uint256 amount
    ) external onlyBackend {
        hubMetrics.arcBuffer -= amount;
        hubMetrics.totalBridgedToSepolia += amount;
        hubMetrics.totalYieldOnSepolia += amount;
        
        emit FundsBridgedToSepolia(amount, bridgeRequestId);
        emit HubMetricsUpdated(hubMetrics.totalPooledOnArc, hubMetrics.totalBridgedToSepolia, hubMetrics.arcBuffer);
    }
    
    /* ========== ERC-7540: ASYNC REDEMPTION ========== */
    
    /**
     * @notice Request async redemption (ERC-7540)
     * @dev Supports cross-chain redemptions
     */
    function requestRedeem(
        uint256 shares,
        address receiver,
        address owner,
        uint256 destinationChainId
    ) external nonReentrant returns (bytes32 requestId) {
        require(shares > 0, "Zero shares");
        require(
            msg.sender == owner || allowance(owner, msg.sender) >= shares,
            "ERC20: insufficient allowance"
        );
        require(supportedChains[destinationChainId], "Chain not supported");
        
        DepositMetadata storage metadata = depositMetadata[owner];
        require(metadata.hasActiveDeposit, "No active deposit");
        
        // Calculate assets
        uint256 assets = previewRedeem(shares);
        
        // Generate request ID
        requestId = keccak256(abi.encodePacked(
            owner,
            receiver,
            shares,
            block.timestamp,
            destinationChainId
        ));
        
        // Burn shares (ERC-4626)
        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }
        _burn(owner, shares);
        
        // Create redemption request
        redemptionRequests[requestId] = RedemptionRequest({
            owner: owner,
            receiver: receiver,
            shares: shares,
            assets: assets,
            requestTime: block.timestamp,
            unlockTime: metadata.unlockTime,
            destinationChainId: destinationChainId,
            status: RedemptionStatus.Pending
        });
        
        userRedemptionRequests[owner].push(requestId);
        
        // Mark deposit as inactive
        metadata.hasActiveDeposit = false;
        hubMetrics.activeDeposits -= 1;
        
        emit RedemptionRequested(requestId, owner, receiver, shares, assets, destinationChainId);
        
        return requestId;
    }
    
    /**
     * @notice Claim redemption after lock period
     */
    function claimRedemption(bytes32 requestId) external nonReentrant {
        RedemptionRequest storage request = redemptionRequests[requestId];
        
        require(request.status == RedemptionStatus.Pending, "Invalid status");
        require(block.timestamp >= request.unlockTime, "Still locked");
        require(
            msg.sender == request.owner || msg.sender == backend,
            "Not authorized"
        );
        
        request.status = RedemptionStatus.Processing;
        
        // Emit event for backend to bridge Sepolia → Arc
        emit BridgeFromSepoliaRequested(requestId, request.assets);
    }
    
    /**
     * @notice Backend confirms funds arrived from Sepolia
     */
    function confirmBridgeFromSepolia(
        bytes32 requestId,
        uint256 amount
    ) external onlyBackend {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(request.status == RedemptionStatus.Processing, "Not processing");
        
        hubMetrics.totalYieldOnSepolia -= amount;
        hubMetrics.totalBridgedToSepolia -= amount;
        hubMetrics.arcBuffer += amount;
        
        request.status = RedemptionStatus.Claimable;
    }
    
    /**
     * @notice Complete redemption - send to user
     */
    function completeRedemption(bytes32 requestId) external onlyBackend {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(request.status == RedemptionStatus.Claimable, "Not claimable");
        
        if (request.destinationChainId == 0) {
            // Same-chain (Arc)
            IERC20(asset()).safeTransfer(request.receiver, request.assets);
            hubMetrics.arcBuffer -= request.assets;
            hubMetrics.totalPooledOnArc -= request.assets;
        }
        // else: backend handles cross-chain bridge
        
        request.status = RedemptionStatus.Completed;
        
        emit RedemptionCompleted(requestId, request.receiver, request.assets);
        emit HubMetricsUpdated(hubMetrics.totalPooledOnArc, hubMetrics.totalBridgedToSepolia, hubMetrics.arcBuffer);
    }
    
    /**
     * @notice Transfer assets to backend for cross-chain bridge
     */
    function transferForBridge(
        bytes32 requestId,
        uint256 amount
    ) external onlyBackend {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(request.status == RedemptionStatus.Completed, "Not completed");
        
        IERC20(asset()).safeTransfer(backend, amount);
        
        hubMetrics.arcBuffer -= amount;
        hubMetrics.totalPooledOnArc -= amount;
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    function getHubMetrics() external view returns (
        uint256 totalPooledOnArc,
        uint256 totalBridgedToSepolia,
        uint256 totalYieldOnSepolia,
        uint256 arcBuffer,
        uint256 activeDeposits
    ) {
        return (
            hubMetrics.totalPooledOnArc,
            hubMetrics.totalBridgedToSepolia,
            hubMetrics.totalYieldOnSepolia,
            hubMetrics.arcBuffer,
            hubMetrics.activeDeposits
        );
    }
    
    function getChainStats(uint256 chainId) external view returns (
        uint256 totalDeposited,
        uint256 activeUsers,
        uint256 lastDepositTime
    ) {
        ChainStats memory stats = chainStats[chainId];
        return (stats.totalDeposited, stats.activeUsers, stats.lastDepositTime);
    }
    
    function getUserRedemptionRequests(address user) external view returns (bytes32[] memory) {
        return userRedemptionRequests[user];
    }
    
    function canWithdraw(address user) external view returns (bool) {
        DepositMetadata memory metadata = depositMetadata[user];
        return metadata.hasActiveDeposit && block.timestamp >= metadata.unlockTime;
    }
    
    function getUserDeposit(address user) external view returns (
        uint256 shares,
        uint256 assets,
        uint256 depositTime,
        uint256 unlockTime,
        string memory challengeType,
        bool active
    ) {
        shares = balanceOf(user);
        assets = convertToAssets(shares);
        DepositMetadata memory metadata = depositMetadata[user];
        return (
            shares,
            assets,
            metadata.depositTime,
            metadata.unlockTime,
            metadata.challengeType,
            metadata.hasActiveDeposit
        );
    }
    
    /* ========== ADMIN FUNCTIONS ========== */
    
    function setChallengeTracker(address _tracker) external onlyOwner {
        challengeTracker = _tracker;
    }
    
    function setLotteryEngine(address _engine) external onlyOwner {
        lotteryEngine = _engine;
    }
    
    function setBackend(address _backend) external onlyOwner {
        backend = _backend;
    }
    
    function addSupportedChain(uint256 chainId) external onlyOwner {
        if (!supportedChains[chainId]) {
            supportedChains[chainId] = true;
            totalSupportedChains++;
        }
    }
    
    /* ========== DISABLE STANDARD ERC-4626 (force our custom version) ========== */
    
    function deposit(uint256, address) public pure override returns (uint256) {
        revert("Use deposit with challenge parameters");
    }
    
    function mint(uint256, address) public pure override returns (uint256) {
        revert("Use deposit with challenge parameters");
    }
    
    function withdraw(uint256, address, address) public pure override returns (uint256) {
        revert("Use requestRedeem and claimRedemption");
    }
    
    function redeem(uint256, address, address) public pure override returns (uint256) {
        revert("Use requestRedeem and claimRedemption");
    }
}
