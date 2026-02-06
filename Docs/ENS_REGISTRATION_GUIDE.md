# ENS Registration Guide

## Official ENS Documentation
🔗 **Complete Registration Guide**: https://docs.ens.domains/learn/registration

## How ENS Registration Works

ENS uses a **commit-reveal** process to prevent frontrunning attacks. The process takes 3 steps:

### Step 1: Commit (Make Commitment)
- Generate a random secret (32 bytes)
- Create a commitment hash using `makeCommitment()` with your registration details
- Submit the commitment hash onchain via `commit()`
- **Purpose**: Hides your intended domain from potential frontrunners

### Step 2: Wait
- **Required**: Wait at least 60 seconds (`MIN_COMMITMENT_AGE`)
- **Maximum**: Must register within 24 hours (`MAX_COMMITMENT_AGE`)
- **Why**: Ensures the commitment is in a confirmed block before revealing

### Step 3: Reveal (Register)
- Call `register()` with the same parameters used in Step 1
- Pay the registration fee in ETH (with 5-10% buffer for price fluctuations)
- Your domain is now registered! 🎉

## Implementation in This App

### Contract Addresses (Sepolia Testnet)
```typescript
ETH Registrar Controller: 0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968
Public Resolver: 0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5
ENS Registry: 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e
```

### Registration Parameters

According to ENS docs, the `makeCommitment()` and `register()` functions take:

```solidity
ETHRegistrarController.makeCommitment(
    name string,           // "myname" (without .eth)
    owner address,         // Your wallet address
    duration uint256,      // 31536000 (1 year in seconds)
    secret bytes32,        // Random 32-byte secret
    resolver address,      // Public Resolver address
    data bytes[],          // Encoded resolver calls (e.g., setAddr)
    reverseRecord bool,    // Set as primary name?
    ownerControlledFuses uint16  // NameWrapper fuses
)
```

### What Our Implementation Does

1. **Check Availability** (`checkAvailability`)
   - Calls `valid(label)` - checks if name meets requirements
   - Calls `available(label)` - checks if name is not taken
   - Returns `true` only if both pass

2. **Get Price** (`getPrice`)
   - Calls `rentPrice(label, duration)`
   - Returns tuple: `{base: uint256, premium: uint256}`
   - Total price = base + premium

3. **Submit Commitment** (`submitCommitment`)
   - Generates random 32-byte secret
   - Creates Registration struct with all parameters
   - Calls `makeCommitment(registration)` to get commitment hash
   - Submits commitment via `commit(hash)`
   - Stores registration details in localStorage (for reveal phase)
   - Starts 60-second countdown

4. **Register Domain** (`registerDomain`)
   - Retrieves stored registration data from localStorage
   - Verifies 60+ seconds have passed
   - Reconstructs Registration struct with same secret
   - Calls `register(registration)` with ETH payment (price + 10% buffer)
   - Returns transaction hash

## User Flow

### In Your App:
1. **Connect Wallet** → Auto-shows ENS registration modal
2. **Enter Domain** → Type "myname" (without .eth)
3. **Check Availability** → Verifies domain is valid and available
4. **Start Registration** → Submits commitment transaction
   - Approve MetaMask transaction
   - Wait for confirmation
5. **Wait 60 Seconds** → Watch countdown timer
6. **Complete Registration** → Submits registration transaction
   - Approve MetaMask transaction with ETH payment
   - Wait for confirmation
7. **Success!** → Domain registered ✅
   - View on ENS App: https://sepolia.app.ens.domains/yourname.eth
   - View transaction: https://sepolia.etherscan.io/tx/{hash}

## Important Requirements

### Before Registration:
- ✅ `available(label) == true`
- ✅ `duration >= MIN_REGISTRATION_DURATION` (28 days minimum)
- ✅ Commitment is between 60 seconds and 24 hours old
- ✅ `msg.value >= rentPrice(name, duration) + 5-10%`

### Why Add 5-10% Buffer?
Rent price is paid in ETH but denominated in USD. Fast price changes between your price check and registration could cause the transaction to fail. The excess is automatically refunded.

## Verification Links

After successful registration, verify your domain:

- **ENS App**: https://sepolia.app.ens.domains/{yourname}.eth
- **Etherscan**: https://sepolia.etherscan.io/tx/{transactionHash}
- **Manager App**: https://app.ens.domains (switch to Sepolia)

## ENS Features

### Check Functions (Read-Only)
```typescript
// Check name validity (min 3 chars, valid characters)
ETHRegistrarController.valid(name: string) → bool

// Check name availability (valid + not taken)
ETHRegistrarController.available(name: string) → bool

// Get rent price in ETH
ETHRegistrarController.rentPrice(name: string, duration: uint256) → {base: uint256, premium: uint256}

// Check commitment timestamp
ETHRegistrarController.commitments(commitment: bytes32) → uint256

// Get name expiry timestamp
BaseRegistrar.nameExpires(label: uint256) → uint256
```

### Constants
```typescript
MIN_COMMITMENT_AGE: 60 seconds
MAX_COMMITMENT_AGE: 24 hours
MIN_REGISTRATION_DURATION: 28 days
```

## Renewing Names

**Anyone can renew any domain!** You don't need to be the owner.

```typescript
ETHRegistrarController.renew(name: string, duration: uint256)
```

Send enough ETH to cover `rentPrice(name, duration)` + buffer.

## Transfer & Management

Domains are ERC-721 NFTs. You can:
- Transfer to another address
- Set resolver records (ETH address, avatar, Twitter, etc.)
- Set as primary name (reverse record)
- Wrap in NameWrapper for additional features

## Common Errors

### "Domain is not available"
- Name is already registered
- Try a different name or check expiry date

### "Wait Xs more"
- 60 seconds haven't passed since commitment
- Wait for countdown to finish

### "No commitment found"
- localStorage was cleared or you're on a different device
- Start registration process again

### "Price fetch failed"
- Network connection issue
- Refresh and try again

### Transaction Failed
- Insufficient Sepolia ETH in wallet
- Get testnet ETH from: https://sepoliafaucet.com
- Price changed significantly (increase buffer to 10%)

## Resources

- **Official ENS Docs**: https://docs.ens.domains
- **Registration Guide**: https://docs.ens.domains/learn/registration
- **Contract Deployments**: https://docs.ens.domains/learn/deployments
- **Sepolia Manager App**: https://app.ens.domains (switch network)
- **Sepolia Faucet**: https://sepoliafaucet.com
- **Etherscan (Sepolia)**: https://sepolia.etherscan.io

## Open Source Frontends

Other apps for registering ENS names:
- **ENS Manager App**: https://app.ens.domains
- **ENS Fairy**: Community-built interface
- **Rainbow Wallet**: Mobile wallet with ENS integration

## Architecture

### Contracts Hierarchy
```
ENS Registry (0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e)
    ↓
BaseRegistrar (0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85)
    ↓
ETHRegistrarController (0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968) ← We interact here
    ↓
PublicResolver (0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5)
```

### Why This Architecture?
- **Separation of concerns**: Registry vs Controller
- **Upgradeability**: Controllers can be upgraded without losing your domain
- **Security**: Your domain is safe even if the controller changes

## Next Steps

1. Get Sepolia ETH from faucet
2. Connect wallet on Sepolia network
3. Try registering a test domain
4. Verify on ENS website
5. Set resolver records (optional)
6. Enjoy your .eth domain! 🎉

---

**Need Help?** Check the official docs or ENS community Discord.
