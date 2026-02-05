# 📊 Supabase Database Setup Guide - Digital Wellbeing App

## 🚀 Step-by-Step Setup

### Step 1: Delete Old Tables (In Supabase Dashboard)
1. Go to **Table Editor**
2. Delete `usage_records` table
3. Delete `daily_usage_summary` table

### Step 2: Run Complete Setup Script
1. Go to **SQL Editor** in Supabase
2. Open file: `SUPABASE_COMPLETE_SETUP.sql`
3. **Copy ALL the content**
4. Paste into Supabase SQL Editor
5. Click **RUN** ✅

This will create:
- ✅ 2 Tables (usage_records, daily_usage_summary)
- ✅ 10 Indexes (for fast queries)
- ✅ 6 Views (pre-formatted, ordered data)
- ✅ RLS Policies (security)

### Step 3: Verify Setup
Run this query to check everything was created:
```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check views
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
**Tables:** daily_usage_summary, usage_records
**Views:** v_daily_app_usage, v_daily_summary_readable, v_hourly_usage_today, v_records_by_date, v_top_apps, v_usage_records_readable

---

## 📋 How to Query Your Data (All Pre-Ordered!)

### In Table Editor:
Simply click on these views:
- `v_usage_records_readable` → See all records (newest first)
- `v_daily_app_usage` → See daily usage per app (ordered by date & usage)
- `v_daily_summary_readable` → See daily totals (newest first)
- `v_top_apps` → See most used apps (highest usage first)
- `v_hourly_usage_today` → See today's hourly breakdown (latest hour first)
- `v_records_by_date` → See record counts per day (newest first)

### In SQL Editor:
Use queries from `SUPABASE_ORDERED_QUERIES.sql`

**Quick Examples:**

**Latest 100 records:**
```sql
SELECT * FROM v_usage_records_readable 
ORDER BY row_num 
LIMIT 100;
```

**Today's app usage:**
```sql
SELECT * FROM v_daily_app_usage 
WHERE date = CURRENT_DATE 
ORDER BY daily_rank;
```

**Top 20 apps all time:**
```sql
SELECT * FROM v_top_apps 
ORDER BY rank 
LIMIT 20;
```

---

## 📊 Understanding the Data

### Tables Created:

#### 1. `usage_records` (Raw Data)
- **id** - Unique record ID
- **device_id** - Device identifier
- **user_id** - User wallet/ENS address
- **package_name** - App package (e.g., com.discord)
- **app_name** - App display name (e.g., Discord)
- **usage_time** - Time used in milliseconds
- **first_used** - First usage timestamp (milliseconds)
- **last_used** - Last usage timestamp (milliseconds)
- **timestamp** - Record timestamp (milliseconds)
- **start_period** - Sync period start (milliseconds)
- **end_period** - Sync period end (milliseconds)
- **created_at** - Database insert time (auto)

**ORDER:** Indexed by `timestamp DESC` (newest first)

#### 2. `daily_usage_summary` (Daily Totals)
- **id** - Unique summary ID
- **device_id** - Device identifier
- **user_id** - User wallet/ENS address
- **date** - Summary date
- **total_screen_time** - Total usage in milliseconds
- **app_count** - Number of apps used
- **most_used_app** - App with highest usage
- **created_at** - Database insert time (auto)

**ORDER:** Indexed by `date DESC` (newest first)

---

## 🎯 Views Explained (All Pre-Ordered)

### 1. v_usage_records_readable
**Purpose:** Human-readable version of all usage records
**Ordered by:** Newest records first (row_num 1 = latest)
**Columns:**
- `row_num` - Row number (1, 2, 3...)
- `usage_minutes` - Usage in minutes (converted from ms)
- `usage_hours` - Usage in hours
- `first_used_time` - Readable IST timestamp
- `last_used_time` - Readable IST timestamp
- `recorded_at` - Readable IST timestamp

### 2. v_daily_app_usage
**Purpose:** Daily usage breakdown by app
**Ordered by:** Date DESC, then usage DESC (newest day first, most used app first)
**Columns:**
- `daily_rank` - Rank within each day (1 = most used)
- `date` - Date
- `total_minutes` - Total usage in minutes
- `sync_count` - Number of times synced

### 3. v_daily_summary_readable
**Purpose:** Daily totals with readable times
**Ordered by:** Date DESC (newest first)
**Columns:**
- `row_num` - Row number (1 = today, 2 = yesterday...)
- `total_minutes` - Total screen time in minutes
- `total_hours` - Total screen time in hours
- `app_count` - Apps used that day

### 4. v_top_apps
**Purpose:** Most used apps of all time
**Ordered by:** Total usage DESC (most used first)
**Columns:**
- `rank` - All-time rank (1 = most used)
- `total_minutes` - Total minutes used
- `total_hours` - Total hours used
- `days_used` - Number of days app was used

### 5. v_hourly_usage_today
**Purpose:** Today's usage by hour
**Ordered by:** Hour DESC (latest hour first)
**Columns:**
- `hour` - Hour of day (0-23)
- `total_minutes` - Minutes used in that hour
- `unique_apps` - Different apps used

### 6. v_records_by_date
**Purpose:** Statistics per day
**Ordered by:** Date DESC (newest first)
**Columns:**
- `date` - Date
- `total_records` - Number of records
- `unique_apps` - Different apps tracked
- `total_minutes` - Total usage

---

## 🔍 Common Queries

### See what's syncing RIGHT NOW:
```sql
SELECT * FROM v_usage_records_readable 
WHERE created_at_ist >= NOW() - INTERVAL '1 hour'
ORDER BY row_num;
```

### Check if sync is working:
```sql
SELECT 
    MAX(created_at_ist) as last_sync,
    COUNT(*) as records_last_hour
FROM v_usage_records_readable
WHERE created_at_ist >= NOW() - INTERVAL '1 hour';
```

### Most used app today:
```sql
SELECT app_name, total_minutes 
FROM v_daily_app_usage 
WHERE date = CURRENT_DATE 
ORDER BY daily_rank 
LIMIT 1;
```

---

## 📱 Android App Sync Details

- **Sync Frequency:** Every 15 minutes (Android minimum)
- **Data Format:** Milliseconds timestamps, converted to IST in views
- **User ID:** Currently "user_wallet_address_or_ens" (placeholder)
- **Device ID:** Android device ID

---

## 🔐 Security (RLS Enabled)

Row Level Security is enabled but set to allow all operations.
Modify policies in `SUPABASE_COMPLETE_SETUP.sql` if needed.

---

## 📁 Files Reference

1. **SUPABASE_COMPLETE_SETUP.sql** - Run this FIRST to create everything
2. **SUPABASE_ORDERED_QUERIES.sql** - Use these queries after setup
3. **SUPABASE_QUERIES.sql** - Additional query examples
4. **SUPABASE_CREATE_VIEWS.sql** - View definitions only

---

## ✅ Success Checklist

After running setup, verify:
- [ ] Both tables created (usage_records, daily_usage_summary)
- [ ] 6 views created (v_usage_records_readable, etc.)
- [ ] Can see data in views (ordered correctly)
- [ ] Android app syncing every 15 minutes
- [ ] Data appears with correct timestamps (IST)

---

## 🆘 Troubleshooting

**No data appearing?**
- Check Android app has Usage Access permission
- Wait 15-20 minutes for first sync
- Check logs: `SELECT COUNT(*) FROM usage_records;`

**Times look wrong?**
- All views auto-convert to IST (Asia/Kolkata)
- Raw tables store milliseconds since epoch

**Want to reset data?**
- Run: `DELETE FROM usage_records;`
- Run: `DELETE FROM daily_usage_summary;`
- App will start syncing fresh data

---

## 📊 Expected Data Flow

1. Android app runs on phone
2. Every 15 minutes → UsageSyncWorker runs
3. Queries UsageStatsManager
4. Uploads to `usage_records` table
5. Uploads to `daily_usage_summary` table
6. Views auto-update with formatted data
7. All queries return ordered results ✅
