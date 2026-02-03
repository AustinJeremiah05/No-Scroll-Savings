// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ChallengeTracker is Ownable {
    
    struct Challenge {
        string challengeType;
        uint256 startTime;
        uint256 duration;
        uint256 currentStreak;
        uint256 longestStreak;
        uint256 missedDays;
        bool active;
    }
    
    mapping(address => Challenge) public challenges;
    mapping(address => uint256) public lotteryEntries;
    
    address public savingsVault;
    address public oracle;
    
    event ChallengeRegistered(address indexed user, string challengeType, uint256 duration);
    event ComplianceRecorded(address indexed user, bool compliant, uint256 newStreak);
    
    constructor(address _owner) Ownable(_owner) {}
    
    modifier onlyAuthorized() {
        require(
            msg.sender == savingsVault || msg.sender == oracle || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }
    
    function registerChallenge(
        address user,
        string memory challengeType,
        uint256 duration
    ) external onlyAuthorized {
        challenges[user] = Challenge({
            challengeType: challengeType,
            startTime: block.timestamp,
            duration: duration,
            currentStreak: 0,
            longestStreak: 0,
            missedDays: 0,
            active: true
        });
        
        lotteryEntries[user] = 1;
        emit ChallengeRegistered(user, challengeType, duration);
    }
    
    function recordDailyCompliance(address user, bool isCompliant) external onlyAuthorized {
        Challenge storage challenge = challenges[user];
        require(challenge.active, "No active challenge");
        
        if (isCompliant) {
            challenge.currentStreak += 1;
            if (challenge.currentStreak > challenge.longestStreak) {
                challenge.longestStreak = challenge.currentStreak;
            }
            lotteryEntries[user] = challenge.currentStreak ** 2;
        } else {
            challenge.missedDays += 1;
            if (challenge.missedDays >= 3) {
                challenge.currentStreak = 0;
                lotteryEntries[user] = 1;
            }
        }
        
        emit ComplianceRecorded(user, isCompliant, challenge.currentStreak);
    }
    
    function getCurrentStreak(address user) external view returns (uint256) {
        return challenges[user].currentStreak;
    }
    
    function getLotteryEntries(address user) external view returns (uint256) {
        return lotteryEntries[user];
    }
    
    function setSavingsVault(address _vault) external onlyOwner {
        savingsVault = _vault;
    }
    
    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }
}
