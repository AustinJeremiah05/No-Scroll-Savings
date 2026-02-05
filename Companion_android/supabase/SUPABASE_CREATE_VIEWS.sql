-- ============================================
-- CREATE VIEWS FOR EASY DATA ACCESS
-- Run these in Supabase SQL Editor to create permanent views
-- ============================================

-- View 1: Readable Usage Records (Order by timestamp DESC)
CREATE OR REPLACE VIEW v_usage_records_readable AS
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

-- View 2: Daily App Usage Summary (Order by date DESC, usage DESC)
CREATE OR REPLACE VIEW v_daily_app_usage AS
SELECT 
    ROW_NUMBER() OVER (PARTITION BY DATE(created_at AT TIME ZONE 'Asia/Kolkata') 
                       ORDER BY SUM(usage_time) DESC) as daily_rank,
    DATE(created_at AT TIME ZONE 'Asia/Kolkata') as date,
    app_name,
    package_name,
    COUNT(*) as sync_count,
    SUM(usage_time) as total_usage_ms,
    ROUND(SUM(usage_time) / 1000.0 / 60.0, 2) as total_minutes,
    ROUND(SUM(usage_time) / 1000.0 / 3600.0, 2) as total_hours,
    MIN(to_timestamp(first_used / 1000.0) AT TIME ZONE 'Asia/Kolkata') as first_used,
    MAX(to_timestamp(last_used / 1000.0) AT TIME ZONE 'Asia/Kolkata') as last_used
FROM usage_records
GROUP BY DATE(created_at AT TIME ZONE 'Asia/Kolkata'), app_name, package_name
ORDER BY DATE(created_at AT TIME ZONE 'Asia/Kolkata') DESC, SUM(usage_time) DESC;

-- View 3: Daily Summary Readable (Order by date DESC)
CREATE OR REPLACE VIEW v_daily_summary_readable AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY date DESC) as row_num,
    id,
    device_id,
    user_id,
    date,
    total_screen_time as total_ms,
    ROUND(total_screen_time / 1000.0 / 60.0, 2) as total_minutes,
    ROUND(total_screen_time / 1000.0 / 3600.0, 2) as total_hours,
    app_count,
    most_used_app,
    created_at AT TIME ZONE 'Asia/Kolkata' as created_at_ist
FROM daily_usage_summary
ORDER BY date DESC;

-- View 4: Top Apps All Time (Order by total usage DESC)
CREATE OR REPLACE VIEW v_top_apps AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY SUM(usage_time) DESC) as rank,
    app_name,
    package_name,
    COUNT(*) as total_syncs,
    SUM(usage_time) as total_usage_ms,
    ROUND(SUM(usage_time) / 1000.0 / 60.0, 2) as total_minutes,
    ROUND(SUM(usage_time) / 1000.0 / 3600.0, 2) as total_hours,
    MIN(created_at AT TIME ZONE 'Asia/Kolkata') as first_seen,
    MAX(created_at AT TIME ZONE 'Asia/Kolkata') as last_seen
FROM usage_records
GROUP BY app_name, package_name
ORDER BY SUM(usage_time) DESC;

-- ============================================
-- AFTER CREATING VIEWS, USE THESE QUERIES:
-- ============================================

-- Query the readable usage records (newest first)
SELECT * FROM v_usage_records_readable 
ORDER BY row_num 
LIMIT 100;

-- Query today's app usage (most used first)
SELECT * FROM v_daily_app_usage 
WHERE date = CURRENT_DATE 
ORDER BY daily_rank;

-- Query daily summary (newest date first)
SELECT * FROM v_daily_summary_readable 
ORDER BY row_num;

-- Query top apps (most used first)
SELECT * FROM v_top_apps 
ORDER BY rank 
LIMIT 50;
