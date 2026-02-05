package com.example.digitalwellbeingviewer

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.example.digitalwellbeingviewer.databinding.ItemUsageBinding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

class UsageAdapter : ListAdapter<UsageItem, UsageAdapter.ViewHolder>(DiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemUsageBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    class ViewHolder(private val binding: ItemUsageBinding) :
        RecyclerView.ViewHolder(binding.root) {

        private val timeFormat = SimpleDateFormat("MMM dd, hh:mm a", Locale.getDefault())
        private val dateFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())

        fun bind(item: UsageItem) {
            binding.appName.text = item.appName
            binding.packageName.text = item.packageName
            binding.usageTime.text = "Usage: ${formatDuration(item.usageTime)}"
            
            // Show last used time
            if (item.lastUsedTime > 0) {
                binding.lastUsedTime.text = "Last used: ${formatTime(item.lastUsedTime)}"
            } else {
                binding.lastUsedTime.text = ""
            }
            
            // Show when the app was first used in this period
            if (item.firstUsedTime > 0 && item.firstUsedTime != item.lastUsedTime) {
                binding.firstUsedTime.text = "First used: ${formatTime(item.firstUsedTime)}"
            } else {
                binding.firstUsedTime.text = ""
            }
        }

        private fun formatTime(timestamp: Long): String {
            val now = System.currentTimeMillis()
            val diff = now - timestamp
            
            return when {
                diff < TimeUnit.MINUTES.toMillis(1) -> "Just now"
                diff < TimeUnit.HOURS.toMillis(1) -> {
                    val mins = TimeUnit.MILLISECONDS.toMinutes(diff)
                    "$mins min${if (mins > 1) "s" else ""} ago"
                }
                diff < TimeUnit.HOURS.toMillis(24) -> {
                    val hours = TimeUnit.MILLISECONDS.toHours(diff)
                    "$hours hour${if (hours > 1) "s" else ""} ago"
                }
                diff < TimeUnit.DAYS.toMillis(7) -> timeFormat.format(Date(timestamp))
                else -> dateFormat.format(Date(timestamp))
            }
        }

        private fun formatDuration(millis: Long): String {
            val hours = TimeUnit.MILLISECONDS.toHours(millis)
            val minutes = TimeUnit.MILLISECONDS.toMinutes(millis) % 60
            val seconds = TimeUnit.MILLISECONDS.toSeconds(millis) % 60

            return when {
                hours > 0 -> String.format("%dh %dm %ds", hours, minutes, seconds)
                minutes > 0 -> String.format("%dm %ds", minutes, seconds)
                else -> String.format("%ds", seconds)
            }
        }
    }

    private class DiffCallback : DiffUtil.ItemCallback<UsageItem>() {
        override fun areItemsTheSame(oldItem: UsageItem, newItem: UsageItem): Boolean {
            return oldItem.packageName == newItem.packageName
        }

        override fun areContentsTheSame(oldItem: UsageItem, newItem: UsageItem): Boolean {
            return oldItem == newItem
        }
    }
}
