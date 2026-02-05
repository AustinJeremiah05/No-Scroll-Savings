-- ============================================
-- USAGE RECORDS QUERIES (Ordered by Timestamp)
-- ============================================

-- 1. View Latest Usage Records (Newest First) - MOST USEFUL
SELECT 
    ROW_NUMBER() OVER (ORDER BY timestamp DESC) as row_num,
    app_name,
    ROUND(usage_time / 1000.0 / 60.0, 2) as usage_minutes,
    ROUND(usage_time / 1000.0, 0) as usage_seconds,
    to_timestamp(first_used / 1000.0) AT TIME ZONE 'Asia/Kolkata' as first_used_time,
    to_timestamp(last_used / 1000.0) AT TIME ZONE 'Asia/Kolkata' as last_used_time,
    to_timestamp(timestamp / 1000.0) AT TIME ZONE 'Asia/Kolkata' as recorded_at,
    device_id,
    package_name
FROM usage_records
ORDER BY timestamp DESC
LIMIT 100;

-- 2. View All Records Ordered by Creation Time (Newest First)
SELECT 
    ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num,
    id,
    app_name,
    package_name,
    usage_time,
    ROUND(usage_time / 1000.0 / 60.0, 2) as usage_minutes,
    first_used,
    last_used,
    timestamp,
    created_at,
    user_id,
    device_id
FROM usage_records
ORDER BY created_at DESC;

-- 3. Today's Usage - Ordered by Most Used First
SELECT 
    ROW_NUMBER() OVER (ORDER BY SUM(usage_time) DESC) as rank,
    app_name,
    COUNT(*) as sync_count,
    SUM(usage_time) as total_usage_ms,
    ROUND(SUM(usage_time) / 1000.0 / 60.0, 2) as total_minutes,
    ROUND(SUM(usage_time) / 1000.0 / 3600.0, 2) as total_hours,
    MAX(to_timestamp(last_used / 1000.0) AT TIME ZONE 'Asia/Kolkata') as last_used_time
FROM usage_records
WHERE DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
GROUP BY app_name
ORDER BY SUM(usage_time) DESC;

-- 4. Usage by App - All Time (Ordered by Total Usage)
SELECT 
    ROW_NUMBER() OVER (ORDER BY SUM(usage_time) DESC) as rank,
    app_name,
    COUNT(*) as total_records,
    SUM(usage_time) as total_usage_ms,
    ROUND(SUM(usage_time) / 1000.0 / 60.0, 2) as total_minutes,
    ROUND(SUM(usage_time) / 1000.0 / 3600.0, 2) as total_hours,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen
FROM usage_records
GROUP BY app_name
ORDER BY SUM(usage_time) DESC
LIMIT 50;

-- ============================================
-- DAILY USAGE SUMMARY QUERIES (Ordered by Date)
-- ============================================

-- 5. Daily Summary - Ordered by Date (Newest First)
SELECT 
    ROW_NUMBER() OVER (ORDER BY date DESC) as row_num,
    date,
    user_id,
    device_id,
    total_screen_time,
    ROUND(total_screen_time / 1000.0 / 60.0, 2) as total_minutes,
    ROUND(total_screen_time / 1000.0 / 3600.0, 2) as total_hours,
    app_count,
    most_used_app,
    created_at
FROM daily_usage_summary
ORDER BY date DESC;

-- 6. Weekly Summary (Last 7 Days) - Ordered by Date
SELECT 
    ROW_NUMBER() OVER (ORDER BY date DESC) as day_num,
    date,
    ROUND(total_screen_time / 1000.0 / 60.0, 2) as total_minutes,
    ROUND(total_screen_time / 1000.0 / 3600.0, 2) as total_hours,
    app_count as apps_used,
    most_used_app
FROM daily_usage_summary
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;

-- ============================================
-- ANALYTICS QUERIES
-- ============================================

-- 7. Count Records by Date (Ordered by Date)
SELECT 
    ROW_NUMBER() OVER (ORDER BY DATE(created_at AT TIME ZONE 'Asia/Kolkata') DESC) as row_num,
    DATE(created_at AT TIME ZONE 'Asia/Kolkata') as date,
    COUNT(*) as record_count,
    COUNT(DISTINCT app_name) as unique_apps,
    ROUND(SUM(usage_time) / 1000.0 / 60.0, 2) as total_minutes
FROM usage_records
GROUP BY DATE(created_at AT TIME ZONE 'Asia/Kolkata')
ORDER BY DATE(created_at AT TIME ZONE 'Asia/Kolkata') DESC;

-- 8. Hourly Breakdown Today (Ordered by Hour)
SELECT 
    ROW_NUMBER() OVER (ORDER BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kolkata') DESC) as row_num,
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kolkata') as hour,
    COUNT(*) as sync_count,
    COUNT(DISTINCT app_name) as apps_used,
    ROUND(SUM(usage_time) / 1000.0 / 60.0, 2) as total_minutes
FROM usage_records
WHERE DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kolkata')
ORDER BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kolkata') DESC;

-- ============================================
-- SIMPLE VIEWS FOR TABLE EDITOR
-- ============================================

-- 9. Simple View - Usage Records (Copy this for quick view)
SELECT 
    app_name,
    ROUND(usage_time / 60000.0, 1) as minutes,
    to_timestamp(timestamp / 1000.0) AT TIME ZONE 'Asia/Kolkata' as time,
    created_at
FROM usage_records
ORDER BY timestamp DESC
LIMIT 50;

-- 10. Simple View - Daily Summary (Copy this for quick view)
SELECT 
    date,
    ROUND(total_screen_time / 60000.0, 1) as total_minutes,
    app_count,
    most_used_app
FROM daily_usage_summary
ORDER BY date DESC;
