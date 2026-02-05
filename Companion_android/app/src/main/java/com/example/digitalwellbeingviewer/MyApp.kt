package com.example.digitalwellbeingviewer

import android.app.Application
import android.util.Log
import androidx.work.*
import com.example.digitalwellbeingviewer.workers.UsageSyncWorker
import java.util.concurrent.TimeUnit

class MyApp : Application() {

    override fun onCreate() {
        super.onCreate()
        scheduleUsageSync()
    }

    private fun scheduleUsageSync() {
        // Only schedule if onboarding is complete
        if (!OnboardingActivity.isOnboardingComplete(applicationContext)) {
            Log.d("MyApp", "Onboarding not complete yet - sync will be scheduled after onboarding")
            return
        }
        
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(false) // Allow even on low battery
            .build()

        val userName = OnboardingActivity.getUserName(applicationContext)

        val syncWorkRequest = PeriodicWorkRequestBuilder<UsageSyncWorker>(
            15, TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .setInputData(
                workDataOf(
                    "user_id" to userName
                )
            )
            .setBackoffCriteria(
                BackoffPolicy.LINEAR,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .build()

        WorkManager.getInstance(applicationContext).enqueueUniquePeriodicWork(
            "usage_sync",
            ExistingPeriodicWorkPolicy.UPDATE, // UPDATE to refresh the schedule
            syncWorkRequest
        )
        
        Log.d("MyApp", "✅ Scheduled automatic sync every 15 minutes for user: $userName")
        Log.d("MyApp", "Work ID: ${syncWorkRequest.id}")
    }
}
