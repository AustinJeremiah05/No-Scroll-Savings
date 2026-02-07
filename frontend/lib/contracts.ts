// Contract addresses from deployment
export const CONTRACTS = {

  // Arc Testnet Contracts
  CHALLENGE_TRACKER: "0x84D9368253712AB404fc3D986ef2497bFAA61c5E",
  LOTTERY_ENGINE: "0xfD50a4e04731b50d20089c2bda7517693cb10173",
  SAVINGS_VAULT: "0xF4df10e373E509EC3d96237df91bE9B0006E918D",
  USDC_ARC: "0x3600000000000000000000000000000000000000",

  // Sepolia Testnet Contracts (Latest Deployment: Feb 7, 2026)
  TREASURY_MANAGER: "0xbE51ad59f4a68089fc86697c7d5EFe756268F0d9",
  UNISWAP_V4_AGENT: "0x5AC3d6D73bBfc9C8b26a78cF7D7314B326B2CAb5", // 0.3% fee tier with EmptyHook
  EMPTY_HOOK: "0x0B2D2EC90342B62a9D80967d26A0b10b685d10d0", // V4 hook (required)
  NOSCRLL_SAVINGS_HOOK: "0x932e5f3e72D7cC0FBcF0E82283e310EEb2cba727",
  YIELD_STRATEGY_MANAGER: "0xa6b00bAE312cBa98Aea60057EcbF2506114e4764",
  USDC_SEPOLIA: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  WETH_SEPOLIA: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
  AAVE_POOL: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
  UNISWAP_V4_POOL_MANAGER: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
} as const;


export const SAVINGS_VAULT_ABI = [
  {
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "lockDuration", type: "uint256" },
      { name: "challengeType", type: "string" },
      { name: "sourceChainId", type: "uint256" },
    ],
    name: "deposit",
    outputs: [
      { name: "shares", type: "uint256" },
      { name: "bridgeRequestId", type: "bytes32" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
      { name: "destinationChainId", type: "uint256" },
    ],
    name: "requestRedeem",
    outputs: [{ name: "requestId", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "requestId", type: "bytes32" }],
    name: "claimRedemption",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserDeposit",
    outputs: [
      { name: "shares", type: "uint256" },
      { name: "assets", type: "uint256" },
      { name: "depositTime", type: "uint256" },
      { name: "unlockTime", type: "uint256" },
      { name: "challengeType", type: "string" },
      { name: "active", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const CHALLENGE_TRACKER_ABI = [
  {
    inputs: [
      { name: "user", type: "address" },
      { name: "isCompliant", type: "bool" },
    ],
    name: "recordDailyCompliance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getCurrentStreak",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getLotteryEntries",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "challenges",
    outputs: [
      { name: "challengeType", type: "string" },
      { name: "startTime", type: "uint256" },
      { name: "duration", type: "uint256" },
      { name: "currentStreak", type: "uint256" },
      { name: "longestStreak", type: "uint256" },
      { name: "missedDays", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Constants
export const LOCK_DURATIONS = {
  ONE_WEEK: 7 * 24 * 60 * 60,
  ONE_MONTH: 30 * 24 * 60 * 60,
  THREE_MONTHS: 90 * 24 * 60 * 60,
} as const;

export const CHALLENGE_TYPES = [
  "No Social Media",
  "Max 2hrs Screen Time",
  "Weekend Digital Detox",
] as const;

export const ARC_TESTNET_ID = 5042002;
export const SEPOLIA_ID = 11155111;
