package com.example.digitalwellbeingviewer

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.work.*
import com.example.digitalwellbeingviewer.databinding.ActivityOnboardingBinding
import com.example.digitalwellbeingviewer.workers.UsageSyncWorker
import java.util.concurrent.TimeUnit

class OnboardingActivity : AppCompatActivity() {

    private lateinit var binding: ActivityOnboardingBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityOnboardingBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnComplete.setOnClickListener {
            val userName = binding.etUserName.text.toString().trim()
            
            if (userName.isEmpty()) {
                Toast.makeText(this, "Please enter your name", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            
            // Save user name and onboarding status
            saveUserName(userName)
            setOnboardingComplete(this, true)
            
            // Schedule background sync now that onboarding is complete
            scheduleBackgroundSync(userName)
            
            // Navigate to MainActivity
            startActivity(Intent(this, MainActivity::class.java))
            finish()
        }
    }

    private fun saveUserName(userName: String) {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_USER_NAME, userName)
            .apply()
    }
    
    private fun scheduleBackgroundSync(userName: String) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(false)
            .build()

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
            ExistingPeriodicWorkPolicy.UPDATE,
            syncWorkRequest
        )
        
        Log.d("OnboardingActivity", "✅ Scheduled automatic sync every 15 minutes for user: $userName")
        Toast.makeText(this, "Welcome $userName! Auto-sync enabled ✓", Toast.LENGTH_LONG).show()
    }

    companion object {
        private const val PREFS_NAME = "digital_wellbeing_prefs"
        private const val KEY_ONBOARDING_COMPLETE = "onboarding_complete"
        private const val KEY_USER_NAME = "user_name"

        fun isOnboardingComplete(context: Context): Boolean {
            return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getBoolean(KEY_ONBOARDING_COMPLETE, false)
        }

        fun setOnboardingComplete(context: Context, isComplete: Boolean) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(KEY_ONBOARDING_COMPLETE, isComplete)
                .apply()
        }

        fun getUserName(context: Context): String {
            return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(KEY_USER_NAME, "Unknown User") ?: "Unknown User"
        }
    }
}
