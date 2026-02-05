-- ============================================
-- COMPLETE DATABASE SETUP FOR DIGITAL WELLBEING APP
-- Run this script in Supabase SQL Editor after deleting tables
-- ============================================

-- ============================================
-- STEP 1: DROP EXISTING TABLES (IF ANY)
-- ============================================

DROP VIEW IF EXISTS v_usage_records_readable CASCADE;
DROP VIEW IF EXISTS v_daily_app_usage CASCADE;
DROP VIEW IF EXISTS v_daily_summary_readable CASCADE;
DROP VIEW IF EXISTS v_top_apps CASCADE;

DROP TABLE IF EXISTS usage_records CASCADE;
DROP TABLE IF EXISTS daily_usage_summary CASCADE;

-- ============================================
-- STEP 2: CREATE TABLES
-- ============================================

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

-- ============================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Indexes for usage_records (ordered by timestamp DESC)
CREATE INDEX idx_usage_records_device_id ON usage_records(device_id);
CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX idx_usage_records_timestamp ON usage_records(timestamp DESC);
CREATE INDEX idx_usage_records_created_at ON usage_records(created_at DESC);
CREATE INDEX idx_usage_records_app_name ON usage_records(app_name);
CREATE INDEX idx_usage_records_package_name ON usage_records(package_name);

-- Indexes for daily_usage_summary (ordered by date DESC)
CREATE INDEX idx_daily_summary_device_id ON daily_usage_summary(device_id);
CREATE INDEX idx_daily_summary_user_id ON daily_usage_summary(user_id);
CREATE INDEX idx_daily_summary_date ON daily_usage_summary(date DESC);
CREATE INDEX idx_daily_summary_created_at ON daily_usage_summary(created_at DESC);

-- ============================================
-- STEP 4: CREATE VIEWS (ALL ORDERED)
-- ============================================

-- View 1: Readable Usage Records (Ordered by timestamp DESC - Newest First)
CREATE VIEW v_usage_records_readable AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY timestamp DESC) as row_num,
    id,
    device_id,
    user_id,
    app_name,
    package_name,
    usage_time as usage_time_ms,
    ROUND(usage_time / 1000.0, 0) as usage_seconds,
    ROUND(usage_time / 1000.0 / 60.0, 2) as usage_minutes,
    ROUND(usage_time / 1000.0 / 3600.0, 2) as usage_hours,
    to_timestamp(first_used / 1000.0) AT TIME ZONE 'Asia/Kolkata' as first_used_time,
    to_timestamp(last_used / 1000.0) AT TIME ZONE 'Asia/Kolkata' as last_used_time,
    to_timestamp(timestamp / 1000.0) AT TIME ZONE 'Asia/Kolkata' as recorded_at,
    to_timestamp(start_period / 1000.0) AT TIME ZONE 'Asia/Kolkata' as period_start,
    to_timestamp(end_period / 1000.0) AT TIME ZONE 'Asia/Kolkata' as period_end,
    created_at AT TIME ZONE 'Asia/Kolkata' as created_at_ist
FROM usage_records
ORDER BY timestamp DESC;

-- View 2: Daily App Usage (Ordered by date DESC, then usage DESC)
CREATE VIEW v_daily_app_usage AS
SELECT 
    ROW_NUMBER() OVER (PARTITION BY DATE(created_at AT TIME ZONE 'Asia/Kolkata') 
                       ORDER BY SUM(usage_time) DESC) as daily_rank,
    DATE(created_at AT TIME ZONE 'Asia/Kolkata') as date,
    app_name,
    package_name,
    COUNT(*) as sync_count,
    SUM(usage_time) as total_usage_ms,
    ROUND(SUM(usage_time) / 1000.0, 0) as total_seconds,
    ROUND(SUM(usage_time) / 1000.0 / 60.0, 2) as total_minutes,
    ROUND(SUM(usage_time) / 1000.0 / 3600.0, 2) as total_hours,
    MIN(to_timestamp(first_used / 1000.0) AT TIME ZONE 'Asia/Kolkata') as first_used,
    MAX(to_timestamp(last_used / 1000.0) AT TIME ZONE 'Asia/Kolkata') as last_used
FROM usage_records
GROUP BY DATE(created_at AT TIME ZONE 'Asia/Kolkata'), app_name, package_name
ORDER BY DATE(created_at AT TIME ZONE 'Asia/Kolkata') DESC, SUM(usage_time) DESC;

-- View 3: Daily Summary Readable (Ordered by date DESC - Newest First)
CREATE VIEW v_daily_summary_readable AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY date DESC) as row_num,
    id,
    device_id,
    user_id,
    date,
    total_screen_time as total_ms,
    ROUND(total_screen_time / 1000.0, 0) as total_seconds,
    ROUND(total_screen_time / 1000.0 / 60.0, 2) as total_minutes,
    ROUND(total_screen_time / 1000.0 / 3600.0, 2) as total_hours,
    app_count,
    most_used_app,
    created_at AT TIME ZONE 'Asia/Kolkata' as created_at_ist
FROM daily_usage_summary
ORDER BY date DESC;

-- View 4: Top Apps All Time (Ordered by total usage DESC - Most Used First)
CREATE VIEW v_top_apps AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY SUM(usage_time) DESC) as rank,
    app_name,
    package_name,
    COUNT(*) as total_syncs,
    SUM(usage_time) as total_usage_ms,
    ROUND(SUM(usage_time) / 1000.0, 0) as total_seconds,
    ROUND(SUM(usage_time) / 1000.0 / 60.0, 2) as total_minutes,
    ROUND(SUM(usage_time) / 1000.0 / 3600.0, 2) as total_hours,
    MIN(created_at AT TIME ZONE 'Asia/Kolkata') as first_seen,
    MAX(created_at AT TIME ZONE 'Asia/Kolkata') as last_seen,
    COUNT(DISTINCT DATE(created_at AT TIME ZONE 'Asia/Kolkata')) as days_used
FROM usage_records
GROUP BY app_name, package_name
ORDER BY SUM(usage_time) DESC;

-- View 5: Hourly Usage Today (Ordered by hour DESC - Latest Hour First)
CREATE VIEW v_hourly_usage_today AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kolkata') DESC) as row_num,
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kolkata') as hour,
    COUNT(*) as sync_count,
    COUNT(DISTINCT app_name) as unique_apps,
    SUM(usage_time) as total_usage_ms,
    ROUND(SUM(usage_time) / 1000.0 / 60.0, 2) as total_minutes,
    ROUND(SUM(usage_time) / 1000.0 / 3600.0, 2) as total_hours
FROM usage_records
WHERE DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kolkata')
ORDER BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kolkata') DESC;

-- View 6: Records Count by Date (Ordered by date DESC - Newest First)
CREATE VIEW v_records_by_date AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY DATE(created_at AT TIME ZONE 'Asia/Kolkata') DESC) as row_num,
    DATE(created_at AT TIME ZONE 'Asia/Kolkata') as date,
    COUNT(*) as total_records,
    COUNT(DISTINCT app_name) as unique_apps,
    COUNT(DISTINCT device_id) as unique_devices,
    SUM(usage_time) as total_usage_ms,
    ROUND(SUM(usage_time) / 1000.0 / 60.0, 2) as total_minutes,
    ROUND(SUM(usage_time) / 1000.0 / 3600.0, 2) as total_hours,
    MIN(created_at AT TIME ZONE 'Asia/Kolkata') as first_record,
    MAX(created_at AT TIME ZONE 'Asia/Kolkata') as last_record
FROM usage_records
GROUP BY DATE(created_at AT TIME ZONE 'Asia/Kolkata')
ORDER BY DATE(created_at AT TIME ZONE 'Asia/Kolkata') DESC;

-- ============================================
-- STEP 5: ENABLE ROW LEVEL SECURITY (OPTIONAL)
-- ============================================

-- Enable RLS
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage_summary ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (modify based on your needs)
CREATE POLICY "Allow all operations for usage_records" 
ON usage_records FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations for daily_usage_summary" 
ON daily_usage_summary FOR ALL 
USING (true) 
WITH CHECK (true);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check views created
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check indexes created
SELECT 
    indexname,
    tablename
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
