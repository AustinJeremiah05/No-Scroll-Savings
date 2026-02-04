# Navigation Guide 🧭

## Flow to Dashboard

### 1. **Home Page → Connect Wallet**
- Visit the home page (default `/`)
- In the center of the hero section, you'll see the **Connect Wallet** button
- Click it to connect your wallet using RainbowKit
- Make sure you're on **Arc Testnet** (Chain ID: 5042002)

### 2. **Navbar → Dashboard Link**
After connecting your wallet:
- A **DASHBOARD →** button will appear in the top navbar
- Click it to navigate directly to the dashboard

**Desktop:** The button appears in the navigation bar (right side)
**Mobile:** The button appears in the mobile menu

### 3. **Dashboard Page**
Once on the dashboard (`/dashboard`), you'll see 5 tabs:

1. **New Challenge** (Start here!)
   - Select challenge type: "No Social Media", "Screen Time < 2 hours", "No Notifications"
   - Select duration: 1 Week, 1 Month, or 3 Months
   - Click "Create Challenge"

2. **Deposit** (Second step)
   - Enter USDC amount (min: 10, suggested: 100, 500)
   - Click "Deposit & Fund Challenge"
   - Funds will bridge to Sepolia automatically

3. **Check Compliance** (Daily monitoring)
   - Click "Check Compliance" to query your app usage
   - System checks Supabase for Instagram/Snapchat usage
   - Shows results: ✅ Compliant or ❌ Not Compliant
   - Click "Record On-Chain" to save compliance status

4. **Withdraw** (After lock period)
   - Enter number of shares to redeem
   - Click "Request Redemption"
   - Wait for unlock period to complete
   - Enter Request ID and click "Claim"

5. **Stats** (View progress)
   - Current balance in shares
   - Streak count
   - Lottery entries earned
   - Active challenge details

## Navigation Code Changes

### Added to Navbar
- Import `useAccount` from `wagmi` to detect wallet connection status
- Import `Link` from `next/link` for client-side navigation
- **Desktop Navigation:** Added "DASHBOARD →" button that only shows when wallet is connected
- **Mobile Navigation:** Added "Dashboard →" link in mobile menu that only shows when wallet is connected

### Automatic Redirect
The dashboard page has automatic redirect:
- If wallet is NOT connected → redirects to home page (`/`)
- If wallet IS connected → shows dashboard

## Chain Requirements

**Arc Testnet:**
- Network: Arc Testnet
- Chain ID: 5042002
- Used for: Creating challenges, recording compliance

**Sepolia (Secondary):**
- Network: Sepolia
- Chain ID: 11155111
- Used for: Yield farming, treasury management
- Bridged via CCTP when you deposit

**Make sure you have Arc Testnet configured in your wallet!**

## Next Steps

1. ✅ Connect wallet on Arc testnet
2. ✅ See "DASHBOARD →" button in navbar
3. ✅ Click to navigate to `/dashboard`
4. ✅ Create challenge → Deposit → Monitor → Withdraw

---

**Status:** Navigation complete! The navbar now shows the Dashboard link after wallet connection. 🚀
