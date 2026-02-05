package com.example.digitalwellbeingviewer.models

import kotlinx.serialization.Serializable

@Serializable
data class UsageRecord(
    val id: String? = null,
    val device_id: String,
    val user_id: String? = null,
    val package_name: String,
    val app_name: String,
    val usage_time: Long,
    val first_used: Long,
    val last_used: Long,
    val timestamp: Long,
    val start_period: Long,
    val end_period: Long,
    val created_at: String? = null
)

@Serializable
data class DailyUsageSummary(
    val id: String? = null,
    val device_id: String,
    val user_id: String? = null,
    val date: String,
    val total_screen_time: Long,
    val app_count: Int,
    val most_used_app: String,
    val created_at: String? = null
)
