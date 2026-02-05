package com.example.digitalwellbeingviewer

import android.app.AppOpsManager
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.work.*
import com.example.digitalwellbeingviewer.databinding.ActivityMainBinding
import com.example.digitalwellbeingviewer.workers.UsageSyncWorker
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var usageManager: UsageStatsManager
    private lateinit var adapter: UsageAdapter
    
    private var startDateTime = Calendar.getInstance().apply {
        add(Calendar.HOUR, -24)
    }
    private var endDateTime = Calendar.getInstance()
    
    private val dateFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
    private val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Check if onboarding is complete
        if (!OnboardingActivity.isOnboardingComplete(this)) {
            startActivity(Intent(this, OnboardingActivity::class.java))
            finish()
            return
        }

        usageManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

        // Setup RecyclerView
        adapter = UsageAdapter()
        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = adapter

        binding.btnGrantAccess.setOnClickListener {
            if (!hasUsageStatsPermission()) {
                startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
            } else {
                loadUsageData()
            }
        }

        binding.btnRefresh.setOnClickListener {
            if (hasUsageStatsPermission()) {
                loadUsageData()
            } else {
                showPermissionMessage()
            }
        }

        // Radio button listeners for time range
        binding.radioGroup.setOnCheckedChangeListener { _, checkedId ->
            if (checkedId == R.id.radioCustom) {
                binding.customDateLayout.visibility = View.VISIBLE
            } else {
                binding.customDateLayout.visibility = View.GONE
            }
            
            if (hasUsageStatsPermission()) {
                loadUsageData()
            }
        }
        
        // Date and time picker listeners
        binding.btnStartDate.setOnClickListener { showDatePicker(true) }
        binding.btnStartTime.setOnClickListener { showTimePicker(true) }
        binding.btnEndDate.setOnClickListener { showDatePicker(false) }
        binding.btnEndTime.setOnClickListener { showTimePicker(false) }
        
        // Sync Now button
        binding.btnSyncNow.setOnClickListener {
            triggerImmediateSync()
        }
        
        updateDateTimeButtons()
        
        // Check and display sync status
        checkSyncStatus()
        
    // Background sync is scheduled from Application.onCreate via MyApp
    }
    
    private fun checkSyncStatus() {
        WorkManager.getInstance(applicationContext)
            .getWorkInfosForUniqueWorkLiveData("usage_sync")
            .observe(this) { workInfoList ->
                val workInfo = workInfoList?.firstOrNull()
                if (workInfo != null) {
                    val status = when (workInfo.state) {
                        WorkInfo.State.ENQUEUED -> "✓ Auto-sync scheduled (every 15 min)"
                        WorkInfo.State.RUNNING -> "⚡ Syncing now..."
                        WorkInfo.State.SUCCEEDED -> "✓ Auto-sync active (every 15 min)"
                        else -> "Auto-sync: ${workInfo.state}"
                    }
                    android.util.Log.d("MainActivity", "Sync Status: $status")
                }
            }
    }
    
    private fun scheduleUsageSync() {
        // REMOVED: Sync is now scheduled in MyApp.onCreate()
        // This prevents duplicate scheduling
        val userName = OnboardingActivity.getUserName(this)
        Toast.makeText(this, "Auto-sync already running for $userName ✓", Toast.LENGTH_SHORT).show()
    }
    
    private fun triggerImmediateSync() {
        Toast.makeText(this, "Starting immediate sync...", Toast.LENGTH_SHORT).show()
        
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        
        val syncWorkRequest = OneTimeWorkRequestBuilder<UsageSyncWorker>()
            .setConstraints(constraints)
            .setInputData(
                workDataOf(
                    "user_id" to OnboardingActivity.getUserName(this)
                )
            )
            .build()
        
        WorkManager.getInstance(applicationContext).enqueue(syncWorkRequest)
        
        // Observe the work status
        WorkManager.getInstance(applicationContext)
            .getWorkInfoByIdLiveData(syncWorkRequest.id)
            .observe(this) { workInfo ->
                when (workInfo?.state) {
                    WorkInfo.State.SUCCEEDED -> {
                        Toast.makeText(this, "✓ Data synced to Supabase successfully!", Toast.LENGTH_LONG).show()
                    }
                    WorkInfo.State.FAILED -> {
                        Toast.makeText(this, "✗ Sync failed. Check logs.", Toast.LENGTH_LONG).show()
                    }
                    WorkInfo.State.RUNNING -> {
                        Toast.makeText(this, "Syncing...", Toast.LENGTH_SHORT).show()
                    }
                    else -> {}
                }
            }
    }

    override fun onResume() {
        super.onResume()
        // Check permission and load data when returning from settings
        if (hasUsageStatsPermission()) {
            binding.permissionMessage.visibility = View.GONE
            binding.btnGrantAccess.visibility = View.GONE
            binding.contentLayout.visibility = View.VISIBLE
            loadUsageData()
        } else {
            showPermissionMessage()
        }
    }

    private fun hasUsageStatsPermission(): Boolean {
        val appOps = getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    private fun showPermissionMessage() {
        binding.permissionMessage.visibility = View.VISIBLE
        binding.btnGrantAccess.visibility = View.VISIBLE
        binding.contentLayout.visibility = View.GONE
    }

    private fun loadUsageData() {
        binding.progressBar.visibility = View.VISIBLE
        
        // Get selected time range
        val (start, end) = getSelectedTimeRange()
        
        // For custom ranges, use events for precise tracking
        val usageItems = if (binding.radioGroup.checkedRadioButtonId == R.id.radioCustom) {
            getUsageFromEvents(start, end)
        } else {
            getUsageFromStats(start, end)
        }

        // Update UI
        binding.progressBar.visibility = View.GONE
        adapter.submitList(usageItems)
        
        val totalTime = usageItems.sumOf { it.usageTime }
        val timeRangeText = if (binding.radioGroup.checkedRadioButtonId == R.id.radioCustom) {
            "\n${dateFormat.format(Date(start))} ${timeFormat.format(Date(start))} - ${dateFormat.format(Date(end))} ${timeFormat.format(Date(end))}"
        } else {
            ""
        }
        binding.totalUsage.text = "Total screen time: ${formatDuration(totalTime)}$timeRangeText"
        
        if (usageItems.isEmpty()) {
            binding.emptyMessage.visibility = View.VISIBLE
            binding.recyclerView.visibility = View.GONE
        } else {
            binding.emptyMessage.visibility = View.GONE
            binding.recyclerView.visibility = View.VISIBLE
        }
    }
    
    private fun getUsageFromStats(start: Long, end: Long): List<UsageItem> {
        val stats: List<UsageStats> = usageManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY, start, end
        ) ?: emptyList()

        val usageMap = mutableMapOf<String, UsageData>()
        for (stat in stats) {
            val time = stat.totalTimeInForeground
            if (time > 0) {
                val existing = usageMap[stat.packageName]
                if (existing != null) {
                    usageMap[stat.packageName] = UsageData(
                        totalTime = existing.totalTime + time,
                        lastUsed = maxOf(existing.lastUsed, stat.lastTimeUsed),
                        firstUsed = minOf(existing.firstUsed, stat.firstTimeStamp)
                    )
                } else {
                    usageMap[stat.packageName] = UsageData(
                        totalTime = time,
                        lastUsed = stat.lastTimeUsed,
                        firstUsed = stat.firstTimeStamp
                    )
                }
            }
        }

        return usageMap.map { (packageName, data) ->
            UsageItem(
                packageName = packageName,
                appName = getAppName(packageName),
                usageTime = data.totalTime,
                lastUsedTime = data.lastUsed,
                firstUsedTime = data.firstUsed
            )
        }.sortedByDescending { it.usageTime }
    }
    
    private fun getUsageFromEvents(start: Long, end: Long): List<UsageItem> {
        val events = usageManager.queryEvents(start, end)
        val usageMap = mutableMapOf<String, MutableList<Pair<Long, Long>>>()
        val packageOpenTimes = mutableMapOf<String, Long>()
        
        val event = android.app.usage.UsageEvents.Event()
        while (events.getNextEvent(event)) {
            when (event.eventType) {
                android.app.usage.UsageEvents.Event.MOVE_TO_FOREGROUND -> {
                    packageOpenTimes[event.packageName] = event.timeStamp
                }
                android.app.usage.UsageEvents.Event.MOVE_TO_BACKGROUND -> {
                    val openTime = packageOpenTimes[event.packageName]
                    if (openTime != null) {
                        val duration = event.timeStamp - openTime
                        if (duration > 0) {
                            if (!usageMap.containsKey(event.packageName)) {
                                usageMap[event.packageName] = mutableListOf()
                            }
                            usageMap[event.packageName]?.add(Pair(openTime, event.timeStamp))
                        }
                        packageOpenTimes.remove(event.packageName)
                    }
                }
            }
        }
        
        // Calculate total time and last used for each app
        val usageItems = usageMap.map { (packageName, sessions) ->
            val totalTime = sessions.sumOf { it.second - it.first }
            val lastUsed = sessions.maxOfOrNull { it.second } ?: 0L
            val firstUsed = sessions.minOfOrNull { it.first } ?: 0L
            
            UsageItem(
                packageName = packageName,
                appName = getAppName(packageName),
                usageTime = totalTime,
                lastUsedTime = lastUsed,
                firstUsedTime = firstUsed
            )
        }.sortedByDescending { it.usageTime }
        
        return usageItems
    }

    private fun getSelectedTimeRange(): Pair<Long, Long> {
        val end: Long
        val start: Long
        
        when (binding.radioGroup.checkedRadioButtonId) {
            R.id.radioToday -> {
                // Today from midnight (00:00:00) to now
                val calendar = Calendar.getInstance()
                calendar.set(Calendar.HOUR_OF_DAY, 0)
                calendar.set(Calendar.MINUTE, 0)
                calendar.set(Calendar.SECOND, 0)
                calendar.set(Calendar.MILLISECOND, 0)
                start = calendar.timeInMillis
                end = System.currentTimeMillis()
            }
            R.id.radio1Hour -> {
                end = System.currentTimeMillis()
                start = end - TimeUnit.HOURS.toMillis(1)
            }
            R.id.radio24Hours -> {
                end = System.currentTimeMillis()
                start = end - TimeUnit.HOURS.toMillis(24)
            }
            R.id.radio7Days -> {
                end = System.currentTimeMillis()
                start = end - TimeUnit.DAYS.toMillis(7)
            }
            R.id.radioCustom -> {
                start = startDateTime.timeInMillis
                end = endDateTime.timeInMillis
            }
            else -> {
                // Default to Today
                val calendar = Calendar.getInstance()
                calendar.set(Calendar.HOUR_OF_DAY, 0)
                calendar.set(Calendar.MINUTE, 0)
                calendar.set(Calendar.SECOND, 0)
                calendar.set(Calendar.MILLISECOND, 0)
                start = calendar.timeInMillis
                end = System.currentTimeMillis()
            }
        }
        
        return Pair(start, end)
    }
    
    private fun showDatePicker(isStartDate: Boolean) {
        val calendar = if (isStartDate) startDateTime else endDateTime
        
        DatePickerDialog(
            this,
            { _, year, month, dayOfMonth ->
                calendar.set(Calendar.YEAR, year)
                calendar.set(Calendar.MONTH, month)
                calendar.set(Calendar.DAY_OF_MONTH, dayOfMonth)
                updateDateTimeButtons()
                if (hasUsageStatsPermission()) {
                    loadUsageData()
                }
            },
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH)
        ).show()
    }
    
    private fun showTimePicker(isStartTime: Boolean) {
        val calendar = if (isStartTime) startDateTime else endDateTime
        
        TimePickerDialog(
            this,
            { _, hourOfDay, minute ->
                calendar.set(Calendar.HOUR_OF_DAY, hourOfDay)
                calendar.set(Calendar.MINUTE, minute)
                updateDateTimeButtons()
                if (hasUsageStatsPermission()) {
                    loadUsageData()
                }
            },
            calendar.get(Calendar.HOUR_OF_DAY),
            calendar.get(Calendar.MINUTE),
            true
        ).show()
    }
    
    private fun updateDateTimeButtons() {
        binding.btnStartDate.text = dateFormat.format(startDateTime.time)
        binding.btnStartTime.text = timeFormat.format(startDateTime.time)
        binding.btnEndDate.text = dateFormat.format(endDateTime.time)
        binding.btnEndTime.text = timeFormat.format(endDateTime.time)
    }

    private fun getAppName(packageName: String): String {
        return try {
            val appInfo: ApplicationInfo = packageManager.getApplicationInfo(packageName, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (e: PackageManager.NameNotFoundException) {
            packageName
        }
    }

    private fun formatDuration(millis: Long): String {
        val hours = TimeUnit.MILLISECONDS.toHours(millis)
        val minutes = TimeUnit.MILLISECONDS.toMinutes(millis) % 60
        val seconds = TimeUnit.MILLISECONDS.toSeconds(millis) % 60
        
        return when {
            hours > 0 -> String.format("%dh %dm", hours, minutes)
            minutes > 0 -> String.format("%dm %ds", minutes, seconds)
            else -> String.format("%ds", seconds)
        }
    }
}

data class UsageItem(
    val packageName: String,
    val appName: String,
    val usageTime: Long,
    val lastUsedTime: Long = 0L,
    val firstUsedTime: Long = 0L
)

data class UsageData(
    val totalTime: Long,
    val lastUsed: Long,
    val firstUsed: Long
)
