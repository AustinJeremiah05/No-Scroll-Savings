-- ============================================
-- SYNC STATUS CHECK - Run this to verify auto-sync is working
-- ============================================

-- 1. Check if data is being synced (last 30 minutes)
SELECT 
    'Last Sync' as check_type,
    MAX(created_at AT TIME ZONE 'Asia/Kolkata') as last_sync_time,
    COUNT(*) as records_last_30min,
    CASE 
        WHEN MAX(created_at) >= NOW() - INTERVAL '20 minutes' THEN '✅ WORKING'
        WHEN MAX(created_at) >= NOW() - INTERVAL '1 hour' THEN '⚠️ DELAYED'
        ELSE '❌ NOT SYNCING'
    END as status
FROM usage_records
WHERE created_at >= NOW() - INTERVAL '30 minutes';

-- 2. Check sync frequency (records per hour for last 24 hours)
SELECT 
    DATE_TRUNC('hour', created_at AT TIME ZONE 'Asia/Kolkata') as hour,
    COUNT(*) as records_count,
    COUNT(DISTINCT app_name) as unique_apps,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Syncing'
        ELSE '❌ No data'
    END as status
FROM usage_records
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at AT TIME ZONE 'Asia/Kolkata')
ORDER BY DATE_TRUNC('hour', created_at AT TIME ZONE 'Asia/Kolkata') DESC
LIMIT 24;

-- 3. Check if specific device is syncing
SELECT 
    device_id,
    MAX(created_at AT TIME ZONE 'Asia/Kolkata') as last_sync,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as records_last_hour,
    CASE 
        WHEN MAX(created_at) >= NOW() - INTERVAL '20 minutes' THEN '✅ ACTIVE'
        ELSE '❌ INACTIVE'
    END as sync_status
FROM usage_records
GROUP BY device_id
ORDER BY MAX(created_at) DESC;

-- 4. Overall sync health check
SELECT 
    COUNT(DISTINCT device_id) as total_devices,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '15 minutes') as last_15min,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as last_hour,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24hours,
    MIN(created_at AT TIME ZONE 'Asia/Kolkata') as first_record_ever,
    MAX(created_at AT TIME ZONE 'Asia/Kolkata') as last_record,
    CASE 
        WHEN COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '15 minutes') > 0 THEN '✅ SYNCING NORMALLY'
        WHEN COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') > 0 THEN '⚠️ DELAYED'
        ELSE '❌ SYNC STOPPED'
    END as overall_status
FROM usage_records;

-- 5. Expected vs Actual sync rate
WITH sync_stats AS (
    SELECT 
        COUNT(*) as total_records,
        EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 3600 as hours_tracked,
        COUNT(*) / NULLIF(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 3600, 0) as records_per_hour
    FROM usage_records
    WHERE created_at >= NOW() - INTERVAL '24 hours'
)
SELECT 
    total_records,
    ROUND(hours_tracked::numeric, 2) as hours_tracked,
    ROUND(records_per_hour::numeric, 2) as actual_records_per_hour,
    '40-120' as expected_records_per_hour,
    CASE 
        WHEN records_per_hour >= 40 AND records_per_hour <= 150 THEN '✅ NORMAL'
        WHEN records_per_hour > 150 THEN '⚠️ HIGH (many apps?)'
        WHEN records_per_hour < 40 AND records_per_hour > 0 THEN '⚠️ LOW (few apps?)'
        ELSE '❌ NO DATA'
    END as sync_health
FROM sync_stats;

-- 6. Quick visual timeline (last 2 hours, 15-min intervals)
SELECT 
    DATE_TRUNC('minute', created_at AT TIME ZONE 'Asia/Kolkata') - 
        (EXTRACT(MINUTE FROM created_at AT TIME ZONE 'Asia/Kolkata')::int % 15) * INTERVAL '1 minute' as sync_window,
    COUNT(*) as records,
    STRING_AGG(DISTINCT app_name, ', ') as apps,
    '✅' as synced
FROM usage_records
WHERE created_at >= NOW() - INTERVAL '2 hours'
GROUP BY sync_window
ORDER BY sync_window DESC;
