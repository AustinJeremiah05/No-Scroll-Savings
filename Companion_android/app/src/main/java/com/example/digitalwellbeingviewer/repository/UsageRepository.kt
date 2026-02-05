package com.example.digitalwellbeingviewer.repository

import android.util.Log
import com.example.digitalwellbeingviewer.SupabaseClient
import com.example.digitalwellbeingviewer.models.DailyUsageSummary
import com.example.digitalwellbeingviewer.models.UsageRecord
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class UsageRepository {
    private val supabase = SupabaseClient.client
    
    suspend fun uploadUsageData(usageRecords: List<UsageRecord>): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                supabase.from("usage_records").insert(usageRecords)
                Log.d("UsageRepository", "Successfully uploaded ${usageRecords.size} records")
                true
            } catch (e: Exception) {
                Log.e("UsageRepository", "Error uploading usage data", e)
                false
            }
        }
    }
    
    suspend fun uploadDailySummary(summary: DailyUsageSummary): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                supabase.from("daily_usage_summary").insert(summary)
                Log.d("UsageRepository", "Successfully uploaded daily summary")
                true
            } catch (e: Exception) {
                Log.e("UsageRepository", "Error uploading daily summary", e)
                false
            }
        }
    }
    
    suspend fun getLastSyncTime(deviceId: String): Long {
        return withContext(Dispatchers.IO) {
            try {
                val result = supabase.from("usage_records")
                    .select()
                    .decodeList<UsageRecord>()
                
                result.filter { it.device_id == deviceId }
                    .maxByOrNull { it.timestamp }
                    ?.timestamp ?: 0L
            } catch (e: Exception) {
                Log.e("UsageRepository", "Error getting last sync time", e)
                0L // Return 0 if no previous sync
            }
        }
    }
}
