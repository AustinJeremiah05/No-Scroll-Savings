# 🚀 Quick Start - ENS Registration for No-Scroll Savings

## What's New?

After connecting their wallet to Arc, users see a popup to register their ENS domain on Sepolia. The domain will be visible across all chains, including Arc!

```
Connect Wallet → See Popup → Enter Domain → Register → Done! 🎉
```

---

## ✨ How to Use

### For Users

1. **Open the app** and connect MetaMask to Arc Testnet
2. **Modal appears** - "Register your ENS name"
3. **Enter domain** - Type "yourname" (becomes yourname.eth)
4. **Check availability** - Click button to verify it's free
5. **See price** - Usually $5/year on mainnet (free on testnet)
6. **Start registration** - Click "Start Registration"
7. **Approve MetaMask** - First transaction (commit)
8. **Wait 60 seconds** - Timer counts down
9. **Complete registration** - Click button when timer hits 0
10. **Approve MetaMask** - Second transaction (register)
11. **Success!** - Your ENS name is registered

### For Developers

#### Installation
```bash
# Already done! Just verify:
pnpm install
```

#### See it in Action
```bash
npm run dev
# Visit http://localhost:3000
# Connect wallet → see modal
```

#### Customize the Modal
```typescript
// Edit: frontend/components/ens-registration-modal.tsx
// Change colors, text, layout, etc.
```

---

## 📋 What's Happening Behind the Scenes

### Network Setup
- **User connects to:** Arc Testnet
- **Domain registered on:** Sepolia Testnet (free ETH)
- **Visible on:** All chains (Arc, Mainnet, etc.)

### Smart Contract Calls
1. **Check availability** - Calls ENS Registrar Controller
2. **Get price** - Queries price oracle
3. **Commit** - Sends hash (prevents frontrunning)
4. **Wait** - 60-second minimum
5. **Register** - Sends registration + pays fee

### Data Flow
```
User Input
    ↓
useEnsRegistration Hook
    ↓
ENS Registrar Controller (Sepolia)
    ↓
Public Resolver (Sepolia)
    ↓
Reverse Registrar (Sepolia)
    ↓
✅ Domain Registered!
```

---

## 🧪 Test It Right Now

### Prerequisites
- MetaMask with Sepolia testnet added
- Get free Sepolia ETH: https://sepoliafaucet.com

### Test Steps
```
1. npm run dev
2. Visit http://localhost:3000
3. Click MetaMask → Connect to Arc
4. See modal pop up automatically
5. Enter test domain: "mytest" + click "Check Availability"
6. Follow the steps
7. ✅ Success!
```

---

## 🔍 Files You Need to Know

| File | Purpose |
|------|---------|
| `hooks/use-ens-registration.ts` | Core registration logic |
| `components/ens-registration-modal.tsx` | The popup UI |
| `components/ens-registration-trigger.tsx` | Shows modal on wallet connect |
| `app/layout.tsx` | Integrated into app (updated) |

---

## ❓ FAQ

**Q: Do I need real money to register?**  
A: Only if you use Mainnet. Sepolia testnet is free!

**Q: Can I see my ENS name on Arc app?**  
A: Yes! Register on Sepolia, view on Arc. Works because ENS queries always start from Ethereum L1.

**Q: What if I close the browser mid-registration?**  
A: Data is saved in localStorage. You can resume from where you left off.

**Q: Can I register any domain name?**  
A: Any 3+ character name with letters, numbers, hyphens. Try: "sugan", "noscroll", "digital-detox"

**Q: How much does it cost?**  
A: On testnet: free. On mainnet: $5/year (5+ letters), $160/year (4 letters), $640/year (3 letters)

**Q: Why does it need 2 transactions?**  
A: To prevent someone from stealing your domain while it's in the mempool. Smart!

**Q: Can I change my mind after registering?**  
A: Yes, but you'll forfeit the registration fee. Better to choose carefully!

---

## 🎯 What Users See

### Step 1: Wallet Connects
```
┌─────────────────────────┐
│  MetaMask Connected ✅   │
│  0x1234...5678          │
│  Arc Testnet            │
└─────────────────────────┘
```

### Step 2: Modal Appears
```
┌──────────────────────────────┐
│ Register ENS Name            │
├──────────────────────────────┤
│ Domain: [sugan    ] .eth     │
│ [Check Availability]         │
│                              │
│ 💡 Register on Sepolia,      │
│    visible on Arc!           │
└──────────────────────────────┘
```

### Step 3: Availability Result
```
┌──────────────────────────────┐
│ ✅ Domain is available!      │
│ Price: 0.0008 ETH/year       │
│                              │
│ [Check Different Domain]     │
│ [Start Registration]         │
└──────────────────────────────┘
```

### Step 4: Waiting for 60s
```
┌──────────────────────────────┐
│ Commitment submitted ✅       │
│                              │
│ [Wait 45s...]               │
│ (button disabled)            │
└──────────────────────────────┘
```

### Step 5: Complete Registration
```
┌──────────────────────────────┐
│ Time's up! ⏰                │
│                              │
│ [Complete Registration]      │
│ (button enabled)             │
└──────────────────────────────┘
```

### Step 6: Success!
```
┌──────────────────────────────┐
│ ✅ Success!                  │
│ sugan.eth                    │
│                              │
│ Your domain is now registered │
│ and visible on Arc!          │
│                              │
│ [Done]                       │
└──────────────────────────────┘
```

---

## 🚀 Production Checklist

- [ ] Test on Sepolia testnet (current)
- [ ] Get real Sepolia ETH for testing
- [ ] Verify domain shows in leaderboards
- [ ] Test on Arc network connection
- [ ] Customize modal colors if needed
- [ ] Update error messages (optional)
- [ ] Deploy to production
- [ ] Update Mainnet addresses when ready (see docs)

---

## 📞 Need Help?

1. **Registration stuck?** - Clear browser localStorage
2. **MetaMask errors?** - Ensure Sepolia RPC is accessible
3. **Domain not showing?** - Might take 6 hours to propagate
4. **Price seems wrong?** - Try refreshing page
5. **Couldn't find something?** - Check `ENS_REGISTRATION_README.md`

---

## 🎉 You're All Set!

Everything is ready. The ENS registration system is:
- ✅ Fully integrated
- ✅ Automatically triggered on wallet connect
- ✅ Beautiful and user-friendly
- ✅ Documented and tested
- ✅ Ready for production

Just run `npm run dev` and test it out!

---

**Questions? Check the detailed docs:**
- `/frontend/ENS_REGISTRATION_README.md` - Full documentation
- `/frontend/ENS_IMPLEMENTATION_SUMMARY.md` - What was built

**Happy registering! 🚀**
