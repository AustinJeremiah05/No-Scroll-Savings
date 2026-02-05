package com.example.digitalwellbeingviewer.workers

import android.app.usage.UsageStatsManager
import android.content.Context
import android.provider.Settings
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.digitalwellbeingviewer.models.DailyUsageSummary
import com.example.digitalwellbeingviewer.models.UsageRecord
import com.example.digitalwellbeingviewer.repository.UsageRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class UsageSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    
    private val repository = UsageRepository()
    private val usageManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    private val deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val userId = inputData.getString("user_id")
            android.util.Log.d("UsageSyncWorker", "🔄 Starting background sync... user_id: $userId, time: ${Date()}")
            
            // Get last sync time (or start from 1 hour ago if first sync)
            val lastSync = repository.getLastSyncTime(deviceId)
            val startTime = if (lastSync > 0) lastSync else System.currentTimeMillis() - TimeUnit.HOURS.toMillis(1)
            val endTime = System.currentTimeMillis()
            
            android.util.Log.d("UsageSyncWorker", "Syncing from $startTime to $endTime")

            // Query usage stats
            val stats = usageManager.queryUsageStats(
                UsageStatsManager.INTERVAL_BEST,
                startTime,
                endTime
            ) ?: emptyList()

            val usageRecords = mutableListOf<UsageRecord>()
            var totalScreenTime = 0L
            var mostUsedApp = ""
            var maxUsageTime = 0L

            for (stat in stats) {
                if (stat.totalTimeInForeground > 0) {
                    val appName = try {
                        val appInfo = applicationContext.packageManager.getApplicationInfo(stat.packageName, 0)
                        applicationContext.packageManager.getApplicationLabel(appInfo).toString()
                    } catch (e: Exception) {
                        stat.packageName
                    }

                    val record = UsageRecord(
                        device_id = deviceId,
                        user_id = inputData.getString("user_id"),
                        package_name = stat.packageName,
                        app_name = appName,
                        usage_time = stat.totalTimeInForeground,
                        first_used = stat.firstTimeStamp,
                        last_used = stat.lastTimeUsed,
                        timestamp = System.currentTimeMillis(),
                        start_period = startTime,
                        end_period = endTime
                    )
                    
                    usageRecords.add(record)
                    totalScreenTime += stat.totalTimeInForeground
                    
                    if (stat.totalTimeInForeground > maxUsageTime) {
                        maxUsageTime = stat.totalTimeInForeground
                        mostUsedApp = appName
                    }
                }
            }

            // Upload usage records
            if (usageRecords.isNotEmpty()) {
                android.util.Log.d("UsageSyncWorker", "Found ${usageRecords.size} apps to upload")
                val uploadSuccess = repository.uploadUsageData(usageRecords)
                
                if (uploadSuccess) {
                    android.util.Log.d("UsageSyncWorker", "Successfully uploaded to Supabase!")
                    // Also upload daily summary
                    val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                    val summary = DailyUsageSummary(
                        device_id = deviceId,
                        user_id = inputData.getString("user_id"),
                        date = dateFormat.format(Date()),
                        total_screen_time = totalScreenTime,
                        app_count = usageRecords.size,
                        most_used_app = mostUsedApp
                    )
                    repository.uploadDailySummary(summary)
                    
                    Result.success()
                } else {
                    android.util.Log.e("UsageSyncWorker", "Failed to upload to Supabase")
                    Result.retry()
                }
            } else {
                android.util.Log.d("UsageSyncWorker", "No usage data to sync")
                Result.success() // No data to sync
            }
        } catch (e: Exception) {
            android.util.Log.e("UsageSyncWorker", "Error in background sync", e)
            Result.failure()
        }
    }
}
