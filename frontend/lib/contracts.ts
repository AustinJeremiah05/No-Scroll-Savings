// Contract addresses from deployment
export const CONTRACTS = {

  CHALLENGE_TRACKER: "0x2B1A80A3CF8E690b7f69694fF100Bd5c85AF75DA",
  LOTTERY_ENGINE: "0xA900eF9aB5907f178b6C562f044c896c42c31F7D",
  SAVINGS_VAULT: "0x9D416d7aeB87fd18b5fB46c2193Da9CCEbC51231",
  USDC_ARC: "0x3600000000000000000000000000000000000000",

  TREASURY_MANAGER: "0xc4534a320Ff1561EC173A76103E43afe52dBC2B5",
  USDC_SEPOLIA: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  AAVE_POOL: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
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
