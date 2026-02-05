# 🔄 Auto-Sync Configuration - Digital Wellbeing App

## ✅ Current Setup

Your app is configured to **automatically fetch and push** digital wellbeing data to Supabase **every 15 minutes**.

---

## 📱 How It Works

### 1. **App Installation & First Launch**
- User installs the app
- Opens the app for the first time
- Grants "Usage Access" permission
- `scheduleUsageSync()` runs automatically in `MainActivity.onCreate()`
- WorkManager schedules periodic background sync

### 2. **Automatic Background Sync (Every 15 Minutes)**
- WorkManager wakes up `UsageSyncWorker`
- Worker queries Android's `UsageStatsManager` API
- Fetches digital wellbeing data since last sync
- Uploads to Supabase `usage_records` table
- Uploads daily summary to `daily_usage_summary` table
- Repeats every 15 minutes forever

### 3. **Works Even When:**
- ✅ App is closed
- ✅ Phone is locked
- ✅ Phone restarts (WorkManager auto-restarts)
- ✅ User hasn't opened the app in days
- ✅ Device is charging or on battery

---

## ⚙️ Configuration Details

### File: `MainActivity.kt`
```kotlin
private fun scheduleUsageSync() {
    val syncWorkRequest = PeriodicWorkRequestBuilder<UsageSyncWorker>(
        15, TimeUnit.MINUTES // Sync every 15 minutes (Android minimum)
    )
    .setConstraints(
        Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED) // Requires internet
            .build()
    )
    .build()
    
    WorkManager.getInstance(applicationContext).enqueueUniquePeriodicWork(
        "usage_sync",
        ExistingPeriodicWorkPolicy.REPLACE,
        syncWorkRequest
    )
}
```

### File: `UsageSyncWorker.kt`
- Fetches usage data since last sync
- Creates `UsageRecord` objects for each app
- Uploads to Supabase via `UsageRepository`
- Calculates daily totals
- Uploads `DailyUsageSummary`

---

## 📊 Data Being Pushed

### Every 15 Minutes → `usage_records` Table
For each app used:
- ✅ App name (e.g., "Discord", "Chrome")
- ✅ Package name (e.g., "com.discord")
- ✅ Usage time (milliseconds)
- ✅ First used timestamp
- ✅ Last used timestamp
- ✅ Device ID
- ✅ User ID (currently placeholder)
- ✅ Sync period (start/end time)

### Daily → `daily_usage_summary` Table
Once per day:
- ✅ Total screen time
- ✅ Number of apps used
- ✅ Most used app
- ✅ Date

---

## 🔍 How to Verify It's Working

### Method 1: Check Supabase Table
1. Go to Supabase → Table Editor
2. Open `usage_records` table
3. Click refresh every 15 minutes
4. See new records appearing ✅

### Method 2: Use SQL Query
```sql
SELECT 
    MAX(created_at AT TIME ZONE 'Asia/Kolkata') as last_sync,
    COUNT(*) as records_last_hour
FROM usage_records
WHERE created_at >= NOW() - INTERVAL '1 hour';
```

Should show records from last hour.

### Method 3: Check Android Logs
1. Connect phone via USB
2. Open Android Studio → Logcat
3. Filter by "UsageSyncWorker"
4. See logs every 15 minutes:
   - "Starting background sync..."
   - "Found X apps to upload"
   - "Successfully uploaded to Supabase!"

---

## ⏰ Sync Frequency

### Why 15 Minutes?
**Android OS enforces a minimum of 15 minutes** for periodic background work (`PeriodicWorkRequest`) to preserve battery life.

Even if code says 5 minutes, Android will adjust it to 15 minutes.

### Can It Be Faster?
**Yes, but with trade-offs:**

**Option A: Use ForegroundService (Not Recommended)**
- Can sync every 1-5 minutes
- ❌ Requires persistent notification (annoying)
- ❌ Uses more battery
- ❌ Can be killed by battery optimization

**Option B: Keep Current (Recommended)**
- Syncs every 15 minutes
- ✅ No persistent notification
- ✅ Battery efficient
- ✅ Reliable (WorkManager handles everything)

---

## 🛠️ Testing Immediately

Want to test without waiting 15 minutes?

### Option 1: Use "Sync Now" Button
The app has a "Sync to Supabase Now" button that triggers immediate upload.

### Option 2: Force Sync via ADB
```bash
adb shell am broadcast -a androidx.work.diagnostics.REQUEST_DIAGNOSTICS \
  -p com.example.digitalwellbeingviewer
```

### Option 3: Reinstall App
1. Uninstall app
2. Reinstall app
3. Grant permissions
4. WorkManager starts fresh sync

---

## 📱 User Experience

### What User Sees:
1. Opens app
2. Grants "Usage Access" permission
3. Toast message: "Auto-sync every 15 minutes enabled ✓"
4. App works in background automatically
5. No further action needed!

### What User Doesn't See:
- Background syncs (completely silent)
- No notifications
- No battery drain warnings
- No interruptions

---

## 🔧 Troubleshooting

### Sync Not Working?

**Check 1: Permission Granted?**
- Settings → Apps → Digital Wellbeing Viewer → Permissions
- "Usage Access" should be ON

**Check 2: Internet Connected?**
- Sync requires network connection
- Check if WiFi/Data is on

**Check 3: Battery Optimization?**
- Settings → Battery → Battery Optimization
- Set app to "Not Optimized" (optional, WorkManager should handle this)

**Check 4: WorkManager Status**
Run this SQL in Supabase:
```sql
SELECT COUNT(*) FROM usage_records 
WHERE created_at >= NOW() - INTERVAL '1 hour';
```
If 0, sync might be paused.

**Fix: Restart Sync**
1. Open app
2. WorkManager restarts automatically
3. Or click "Sync Now" button

---

## 📈 Expected Data Volume

### Per Device:
- **Per Sync (15 min):** ~10-30 records (depends on apps used)
- **Per Hour:** ~40-120 records
- **Per Day:** ~1000-3000 records
- **Per Month:** ~30,000-90,000 records

### Storage:
- Each record ~500 bytes
- 1 month ≈ 45 MB
- 1 year ≈ 540 MB (very manageable)

---

## 🚀 Deployment Checklist

When deploying to users:

- [x] WorkManager scheduled in `onCreate()`
- [x] Set to 15-minute interval
- [x] Network constraint enabled
- [x] Unique work name: "usage_sync"
- [x] Policy set to REPLACE (ensures restart)
- [x] Supabase credentials configured
- [x] User ID field ready (update from placeholder)
- [x] Proper logging enabled
- [x] Error handling in worker

---

## 📝 Next Steps

### For Production:
1. Replace `"user_wallet_address_or_ens"` with actual user wallet/ENS
2. Test with multiple devices
3. Monitor Supabase storage limits
4. Set up Supabase RLS policies for user isolation
5. Add user authentication

### For Monitoring:
1. Check Supabase dashboard daily
2. Run analytics queries from `SUPABASE_ORDERED_QUERIES.sql`
3. Monitor sync failures in logs
4. Track data volume growth

---

## ✅ Summary

**Your app is ready!** 🎉

Once installed on any device:
1. User grants permission (one-time)
2. App automatically syncs every 15 minutes
3. Data appears in Supabase (ordered by timestamp)
4. Continues forever in background
5. No user interaction needed

**The automatic sync is working as designed!**
