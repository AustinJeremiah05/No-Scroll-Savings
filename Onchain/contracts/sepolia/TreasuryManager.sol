// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

interface IUniswapV4Agent {
    function depositLiquidity(uint256 amount) external;
    function withdrawLiquidity(uint256 amount) external;
}

contract TreasuryManager is Ownable {
    using SafeERC20 for IERC20;
    
    IERC20 public immutable USDC;
    address public backend;
    address public uniswapV4Agent;
    address public aavePool;
    
    uint256 public totalReceived;
    uint256 public totalInAave;
    uint256 public totalInUniswap;
    uint256 public totalYieldEarned;
    
    event FundsReceived(uint256 amount);
    event DeployedToAave(uint256 amount);
    event DeployedToUniswap(uint256 amount);
    event YieldHarvested(uint256 amount);
    event FundsWithdrawn(uint256 amount);
    
    constructor(address _usdc, address _aavePool, address _owner) Ownable(_owner) {
        USDC = IERC20(_usdc);
        aavePool = _aavePool;
    }
    
    modifier onlyBackend() {
        require(msg.sender == backend, "Only backend");
        _;
    }
    
    function receiveFunds(uint256 amount) external onlyBackend {
        totalReceived += amount;
        
        uint256 toAave = (amount * 60) / 100;
        uint256 toUniswap = (amount * 30) / 100;
        
        if (aavePool != address(0) && toAave > 0) {
            USDC.forceApprove(aavePool, toAave);
            IAavePool(aavePool).supply(address(USDC), toAave, address(this), 0);
            totalInAave += toAave;
            emit DeployedToAave(toAave);
        }
        
        if (uniswapV4Agent != address(0) && toUniswap > 0) {
            USDC.forceApprove(uniswapV4Agent, toUniswap);
            IUniswapV4Agent(uniswapV4Agent).depositLiquidity(toUniswap);
            totalInUniswap += toUniswap;
            emit DeployedToUniswap(toUniswap);
        }
        
        emit FundsReceived(amount);
    }
    
    function withdrawFunds(uint256 amount) external onlyBackend {
        require(amount > 0, "Zero amount");
        
        uint256 buffer = USDC.balanceOf(address(this));
        
        if (buffer >= amount) {
            USDC.safeTransfer(backend, amount);
        } else {
            uint256 needed = amount - buffer;
            
            if (aavePool != address(0) && totalInAave >= needed) {
                IAavePool(aavePool).withdraw(address(USDC), needed, address(this));
                totalInAave -= needed;
            } else if (uniswapV4Agent != address(0)) {
                IUniswapV4Agent(uniswapV4Agent).withdrawLiquidity(needed);
                totalInUniswap -= needed;
            }
            
            USDC.safeTransfer(backend, amount);
        }
        
        emit FundsWithdrawn(amount);
    }
    
    function harvestYield() external onlyBackend returns (uint256 yield) {
        uint256 currentBalance = USDC.balanceOf(address(this));
        uint256 deployed = totalInAave + totalInUniswap;
        uint256 expectedBuffer = totalReceived - deployed;
        
        if (currentBalance > expectedBuffer) {
            yield = currentBalance - expectedBuffer;
            totalYieldEarned += yield;
            USDC.safeTransfer(backend, yield);
            emit YieldHarvested(yield);
        }
        
        return yield;
    }
    
    function getTotalDeployed() external view returns (uint256) {
        return totalInAave + totalInUniswap;
    }
    
    function setBackend(address _backend) external onlyOwner {
        backend = _backend;
    }
    
    function setUniswapV4Agent(address _agent) external onlyOwner {
        uniswapV4Agent = _agent;
    }
    
    function setAavePool(address _pool) external onlyOwner {
        aavePool = _pool;
    }
}
