# No-Scroll Savings - Smart Contracts

This directory contains the Solidity smart contracts for the No-Scroll Savings protocol.

## Architecture

### Arc Testnet (Liquidity Hub)
- **SavingsVault.sol** - ERC-4626 vault with ERC-7540 async redemption & ERC-2612 permit
- **ChallengeTracker.sol** - Tracks user challenges and compliance
- **LotteryEngine.sol** - Weekly lottery prize distribution

### Ethereum Sepolia (Yield Generation)
- **TreasuryManager.sol** - Manages funds and deploys to Aave/Uniswap

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your values:
- `DEPLOYER_PRIVATE_KEY` - Your wallet private key
- `ARC_USDC_ADDRESS` - USDC token on Arc Testnet
- `SEPOLIA_USDC_ADDRESS` - USDC token on Sepolia
- `SEPOLIA_AAVE_POOL` - Aave Pool address on Sepolia
- `BACKEND_ADDRESS` - Backend wallet address
- `ETHERSCAN_API_KEY` - For contract verification

## Deployment

### Deploy to Arc Testnet:
```bash
npm run deploy:arc
```

### Deploy to Sepolia:
```bash
npm run deploy:sepolia
```

## Testing

```bash
npm test
```

## Contract Addresses

### Arc Testnet
- Network: Arc Testnet (Chain ID: 5042002)
- RPC: https://rpc-arc-testnet.gelato.digital
- Explorer: https://arc-testnet-explorer.gelato.digital

### Ethereum Sepolia
- Network: Ethereum Sepolia (Chain ID: 11155111)
- RPC: https://sepolia.infura.io/v3/your_infura_project_id
- Explorer: https://sepolia.etherscan.io

## Key Features

### ERC Standards Implemented
- **ERC-4626**: Tokenized Vault Standard
- **ERC-7540**: Async Redemption Standard
- **ERC-2612**: Permit (gasless approvals)

### Flow
1. Users deposit USDC on any chain → bridged to Arc
2. Arc pools liquidity → bridges to Sepolia
3. Sepolia deploys to Aave (60%) + Uniswap V4 (30%)
4. Yield accrues on Sepolia
5. User requests redemption → async process
6. Funds bridge back Arc → user's destination chain

## Verification

After deployment, verify contracts:

### Arc Testnet:
```bash
npx hardhat verify --network arc <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Sepolia:
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Security Notes

- All contracts use OpenZeppelin libraries
- ReentrancyGuard on deposit/withdrawal functions
- Role-based access control (Owner, Backend)
- SafeERC20 for token transfers

## License

MIT
