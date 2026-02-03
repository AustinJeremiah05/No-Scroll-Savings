// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LotteryEngine is Ownable {
    
    IERC20 public immutable USDC;
    
    struct Winner {
        address user;
        uint256 prize;
    }
    
    address public challengeTracker;
    address public savingsVault;
    
    uint256 public prizePool;
    uint256 public lastDrawTime;
    uint256 public drawInterval = 7 days;
    
    Winner[] public lastWinners;
    
    event PrizePoolUpdated(uint256 amount);
    event LotteryDrawn(uint256 totalPrize, uint256 winnersCount);
    event WinnerSelected(address indexed user, uint256 prize);
    
    constructor(address _usdc, address _owner) Ownable(_owner) {
        USDC = IERC20(_usdc);
    }
    
    function addToPrizePool(uint256 amount) external {
        prizePool += amount;
        emit PrizePoolUpdated(prizePool);
    }
    
    function conductDraw(address[] memory participants) external onlyOwner {
        require(block.timestamp >= lastDrawTime + drawInterval, "Too soon");
        require(prizePool > 0, "No prize pool");
        require(participants.length > 0, "No participants");
        
        delete lastWinners;
        
        uint256 grandPrize = (prizePool * 50) / 100;
        uint256 mediumTotal = (prizePool * 30) / 100;
        
        address grandWinner = participants[0];
        lastWinners.push(Winner(grandWinner, grandPrize));
        emit WinnerSelected(grandWinner, grandPrize);
        
        uint256 mediumPrize = mediumTotal / 5;
        for (uint i = 1; i <= 5 && i < participants.length; i++) {
            lastWinners.push(Winner(participants[i], mediumPrize));
            emit WinnerSelected(participants[i], mediumPrize);
        }
        
        prizePool = 0;
        lastDrawTime = block.timestamp;
        
        emit LotteryDrawn(grandPrize + mediumTotal, lastWinners.length);
    }
    
    function getLastWinners() external view returns (Winner[] memory) {
        return lastWinners;
    }
    
    function setChallengeTracker(address _tracker) external onlyOwner {
        challengeTracker = _tracker;
    }
    
    function setSavingsVault(address _vault) external onlyOwner {
        savingsVault = _vault;
    }
}
