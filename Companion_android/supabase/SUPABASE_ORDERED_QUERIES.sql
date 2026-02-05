-- ============================================
-- USEFUL QUERIES AFTER DATABASE SETUP
-- All queries return data in ORDERED format
-- ============================================

-- ============================================
-- QUERY 1: Latest Usage Records (Newest First)
-- ============================================
SELECT * FROM v_usage_records_readable 
ORDER BY row_num 
LIMIT 100;

-- ============================================
-- QUERY 2: Today's App Usage (Most Used First)
-- ============================================
SELECT 
    daily_rank as rank,
    app_name,
    total_minutes,
    total_hours,
    sync_count,
    first_used,
    last_used
FROM v_daily_app_usage 
WHERE date = CURRENT_DATE 
ORDER BY daily_rank;

-- ============================================
-- QUERY 3: Yesterday's App Usage (Most Used First)
-- ============================================
SELECT 
    daily_rank as rank,
    app_name,
    total_minutes,
    total_hours,
    sync_count
FROM v_daily_app_usage 
WHERE date = CURRENT_DATE - INTERVAL '1 day'
ORDER BY daily_rank;

-- ============================================
-- QUERY 4: Last 7 Days Summary (Newest First)
-- ============================================
SELECT * FROM v_daily_summary_readable 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY row_num;

-- ============================================
-- QUERY 5: Top 20 Apps All Time (Most Used First)
-- ============================================
SELECT 
    rank,
    app_name,
    total_hours,
    total_minutes,
    days_used,
    first_seen,
    last_seen
FROM v_top_apps 
ORDER BY rank 
LIMIT 20;

-- ============================================
-- QUERY 6: Hourly Breakdown Today (Latest Hour First)
-- ============================================
SELECT * FROM v_hourly_usage_today 
ORDER BY row_num;

-- ============================================
-- QUERY 7: Records Count by Date (Newest First)
-- ============================================
SELECT 
    row_num,
    date,
    total_records,
    unique_apps,
    total_minutes,
    total_hours
FROM v_records_by_date 
ORDER BY row_num 
LIMIT 30;

-- ============================================
-- QUERY 8: Specific App Usage History (Ordered by Date DESC)
-- ============================================
-- Replace 'Discord' with your app name
SELECT 
    date,
    total_minutes,
    total_hours,
    sync_count,
    first_used,
    last_used
FROM v_daily_app_usage 
WHERE app_name = 'Discord'
ORDER BY date DESC;

-- ============================================
-- QUERY 9: Last Sync Time for Each Device (Newest First)
-- ============================================
SELECT 
    device_id,
    MAX(created_at AT TIME ZONE 'Asia/Kolkata') as last_sync,
    COUNT(*) as total_records,
    COUNT(DISTINCT app_name) as unique_apps,
    ROUND(SUM(usage_time) / 1000.0 / 60.0, 2) as total_minutes
FROM usage_records
GROUP BY device_id
ORDER BY MAX(created_at) DESC;

-- ============================================
-- QUERY 10: Raw Usage Records with Readable Time (Newest 50)
-- ============================================
SELECT 
    ROW_NUMBER() OVER (ORDER BY created_at DESC) as num,
    app_name,
    ROUND(usage_time / 60000.0, 1) as minutes,
    to_timestamp(first_used / 1000.0) AT TIME ZONE 'Asia/Kolkata' as first_used,
    to_timestamp(last_used / 1000.0) AT TIME ZONE 'Asia/Kolkata' as last_used,
    created_at AT TIME ZONE 'Asia/Kolkata' as synced_at
FROM usage_records
ORDER BY created_at DESC
LIMIT 50;

-- ============================================
-- QUERY 11: Weekly Comparison (Ordered by Week DESC)
-- ============================================
SELECT 
    DATE_TRUNC('week', date)::date as week_start,
    COUNT(DISTINCT date) as days_tracked,
    SUM(total_screen_time) as total_usage_ms,
    ROUND(SUM(total_screen_time) / 1000.0 / 60.0, 2) as total_minutes,
    ROUND(SUM(total_screen_time) / 1000.0 / 3600.0, 2) as total_hours,
    ROUND(AVG(total_screen_time) / 1000.0 / 60.0, 2) as avg_minutes_per_day,
    SUM(app_count) as total_app_instances
FROM daily_usage_summary
GROUP BY DATE_TRUNC('week', date)
ORDER BY DATE_TRUNC('week', date) DESC;

-- ============================================
-- QUERY 12: Monthly Summary (Ordered by Month DESC)
-- ============================================
SELECT 
    DATE_TRUNC('month', date)::date as month,
    TO_CHAR(date, 'Month YYYY') as month_name,
    COUNT(DISTINCT date) as days_tracked,
    SUM(total_screen_time) as total_usage_ms,
    ROUND(SUM(total_screen_time) / 1000.0 / 60.0, 2) as total_minutes,
    ROUND(SUM(total_screen_time) / 1000.0 / 3600.0, 2) as total_hours,
    ROUND(AVG(total_screen_time) / 1000.0 / 60.0, 2) as avg_minutes_per_day
FROM daily_usage_summary
GROUP BY DATE_TRUNC('month', date), TO_CHAR(date, 'Month YYYY')
ORDER BY DATE_TRUNC('month', date) DESC;

-- ============================================
-- QUERY 13: App Usage Trends (Last 30 Days, Ordered by Total Usage)
-- ============================================
SELECT 
    app_name,
    COUNT(DISTINCT date) as days_used,
    ROUND(SUM(total_minutes), 2) as total_minutes,
    ROUND(AVG(total_minutes), 2) as avg_minutes_per_day,
    ROUND(SUM(total_hours), 2) as total_hours
FROM v_daily_app_usage
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY app_name
ORDER BY SUM(total_minutes) DESC
LIMIT 20;

-- ============================================
-- QUERY 14: Get All Records for Export (Ordered by Timestamp DESC)
-- ============================================
SELECT 
    id,
    device_id,
    user_id,
    app_name,
    package_name,
    usage_time,
    first_used,
    last_used,
    timestamp,
    start_period,
    end_period,
    created_at
FROM usage_records
ORDER BY timestamp DESC;

-- ============================================
-- QUERY 15: Simple Count of Records (Total Stats)
-- ============================================
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT device_id) as unique_devices,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT app_name) as unique_apps,
    COUNT(DISTINCT DATE(created_at)) as days_tracked,
    MIN(created_at AT TIME ZONE 'Asia/Kolkata') as first_record,
    MAX(created_at AT TIME ZONE 'Asia/Kolkata') as last_record,
    ROUND(SUM(usage_time) / 1000.0 / 3600.0, 2) as total_hours_tracked
FROM usage_records;
