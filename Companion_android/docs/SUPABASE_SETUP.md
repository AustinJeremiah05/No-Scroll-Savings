# Supabase Setup Guide

## 1. Create Supabase Tables

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Usage Records Table
CREATE TABLE usage_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    user_id TEXT,
    package_name TEXT NOT NULL,
    app_name TEXT NOT NULL,
    usage_time BIGINT NOT NULL,
    first_used BIGINT NOT NULL,
    last_used BIGINT NOT NULL,
    timestamp BIGINT NOT NULL,
    start_period BIGINT NOT NULL,
    end_period BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Usage Summary Table
CREATE TABLE daily_usage_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    user_id TEXT,
    date DATE NOT NULL,
    total_screen_time BIGINT NOT NULL,
    app_count INTEGER NOT NULL,
    most_used_app TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id, date)
);

-- Indexes for better query performance
CREATE INDEX idx_usage_records_device_id ON usage_records(device_id);
CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX idx_usage_records_timestamp ON usage_records(timestamp DESC);
CREATE INDEX idx_daily_summary_device_id ON daily_usage_summary(device_id);
CREATE INDEX idx_daily_summary_user_id ON daily_usage_summary(user_id);
CREATE INDEX idx_daily_summary_date ON daily_usage_summary(date DESC);
```

## 2. Configure Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage_summary ENABLE ROW LEVEL SECURITY;

-- Allow inserts from service role (for now)
CREATE POLICY "Allow service role to insert" ON usage_records
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role to insert summary" ON daily_usage_summary
    FOR INSERT WITH CHECK (true);

-- Users can read their own data
CREATE POLICY "Users can read own data" ON usage_records
    FOR SELECT USING (user_id = auth.uid()::text OR device_id = auth.uid()::text);

CREATE POLICY "Users can read own summary" ON daily_usage_summary
    FOR SELECT USING (user_id = auth.uid()::text OR device_id = auth.uid()::text);
```

## 3. Update SupabaseClient.kt

Replace in `SupabaseClient.kt`:
```kotlin
private const val SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL"
private const val SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY"
```

Find these values in:
- Supabase Dashboard → Settings → API
- URL: Project URL
- Key: `anon` `public` key

## 4. Sync Schedule

The app syncs data every **15 minutes** in the background when:
- ✅ Device has internet connection
- ✅ Usage Access permission is granted
- ✅ App is installed (doesn't need to be open)

## 5. Query Data from Next.js

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Get user's usage data
const { data, error } = await supabase
  .from('usage_records')
  .select('*')
  .eq('user_id', userId)
  .gte('timestamp', startDate)
  .lte('timestamp', endDate)
  .order('timestamp', { ascending: false })

// Get daily summary
const { data: summary } = await supabase
  .from('daily_usage_summary')
  .select('*')
  .eq('user_id', userId)
  .gte('date', '2026-01-01')
  .order('date', { ascending: false })
```

## 6. Data Structure

### usage_records
- `device_id`: Unique Android device ID
- `user_id`: Wallet address or ENS name (set after login)
- `package_name`: App package (e.g., com.instagram.android)
- `app_name`: Friendly app name (e.g., Instagram)
- `usage_time`: Time in foreground (milliseconds)
- `timestamp`: When this record was created
- `start_period` / `end_period`: Time range measured

### daily_usage_summary
- `date`: Date of usage
- `total_screen_time`: Total ms spent on phone
- `app_count`: Number of apps used
- `most_used_app`: App with highest usage
