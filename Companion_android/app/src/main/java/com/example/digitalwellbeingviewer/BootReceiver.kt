package com.example.digitalwellbeingviewer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.*
import com.example.digitalwellbeingviewer.workers.UsageSyncWorker
import java.util.concurrent.TimeUnit

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d("BootReceiver", "Device booted - rescheduling sync")
            rescheduleSync(context)
        }
    }

    private fun rescheduleSync(context: Context) {
        // Only reschedule if onboarding is complete
        if (!OnboardingActivity.isOnboardingComplete(context)) {
            Log.d("BootReceiver", "Onboarding not complete - skipping sync reschedule")
            return
        }
        
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(false)
            .build()

        val userName = OnboardingActivity.getUserName(context)

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

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "usage_sync",
            ExistingPeriodicWorkPolicy.UPDATE,
            syncWorkRequest
        )

        Log.d("BootReceiver", "✅ Rescheduled automatic sync after boot for user: $userName")
    }
}
