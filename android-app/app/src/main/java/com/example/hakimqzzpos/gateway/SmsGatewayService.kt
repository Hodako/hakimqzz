package com.example.hakimqzzpos.gateway

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.example.hakimqzzpos.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

data class GatewayLogEntry(
    val id: String = System.currentTimeMillis().toString(),
    val timestamp: Long = System.currentTimeMillis(),
    val phoneNumber: String,
    val message: String,
    val status: String,
    val error: String? = null
)

class SmsGatewayService : Service() {

    companion object {
        const val CHANNEL_ID = "hakimqzz_sms_gateway_channel"
        const val NOTIFICATION_ID = 9981

        private val _isRunning = MutableStateFlow(false)
        val isRunning = _isRunning.asStateFlow()

        private val _logs = MutableStateFlow<List<GatewayLogEntry>>(emptyList())
        val logs = _logs.asStateFlow()

        fun addLog(entry: GatewayLogEntry) {
            val current = _logs.value.toMutableList()
            current.add(0, entry)
            if (current.size > 100) current.removeAt(current.size - 1)
            _logs.value = current
        }

        fun start(context: Context) {
            try {
                val intent = Intent(context, SmsGatewayService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                // Android 14+ background launch restriction guard
            }
        }

        fun stop(context: Context) {
            try {
                val intent = Intent(context, SmsGatewayService::class.java)
                context.stopService(intent)
            } catch (_: Exception) {}
        }
    }

    private val serviceJob = Job()
    private val serviceScope = CoroutineScope(Dispatchers.Default + serviceJob)
    private lateinit var prefs: GatewayPrefs
    private lateinit var smsSender: SmsSender
    private var wakeLock: PowerManager.WakeLock? = null

    private var currentBatteryLevel = 100
    private var isCharging = false

    private val batteryReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            intent?.let {
                val level = it.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
                val scale = it.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
                if (level != -1 && scale != -1) {
                    currentBatteryLevel = (level * 100 / scale.toFloat()).toInt()
                }
                val status = it.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
                isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                        status == BatteryManager.BATTERY_STATUS_FULL
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        prefs = GatewayPrefs(this)
        smsSender = SmsSender(this)
        createNotificationChannel()

        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "HakimQzz::GatewayWakeLock")
        } catch (_: Exception) {}

        // Android 14+ requires export flag when registering receivers
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(batteryReceiver, IntentFilter(Intent.ACTION_BATTERY_CHANGED), Context.RECEIVER_NOT_EXPORTED)
            } else {
                registerReceiver(batteryReceiver, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            }
        } catch (_: Exception) {}
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = createNotification("🟢 Active: Ready to send SMS (${prefs.shopName})")
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            try {
                startForeground(NOTIFICATION_ID, notification)
            } catch (_: Exception) {}
        }

        _isRunning.value = true
        prefs.isServiceEnabled = true

        startGatewayLoops()

        return START_STICKY
    }

    private fun startGatewayLoops() {
        // Loop 1: Heartbeat telemetry (every 15s)
        serviceScope.launch {
            while (isActive) {
                if (prefs.isPaired) {
                    try {
                        val availableSims = SimHelper.getAvailableSims(this@SmsGatewayService)
                        GatewayApiClient.sendHeartbeat(
                            serverUrl = prefs.serverUrl,
                            deviceToken = prefs.deviceToken,
                            batteryLevel = currentBatteryLevel,
                            isCharging = isCharging,
                            networkType = "Active",
                            simSlots = availableSims,
                            activeSimSlot = prefs.selectedSimSlot
                        )
                    } catch (_: Exception) {}
                }
                delay(15000L)
            }
        }

        // Loop 2: Pending SMS Queue Polling & Dispatch (every 3s)
        serviceScope.launch {
            while (isActive) {
                if (prefs.isPaired) {
                    try {
                        val jobs = GatewayApiClient.fetchPendingJobs(
                            serverUrl = prefs.serverUrl,
                            deviceToken = prefs.deviceToken,
                            limit = 3
                        )

                        if (jobs.isNotEmpty()) {
                            try {
                                if (wakeLock?.isHeld != true) {
                                    wakeLock?.acquire(45000L)
                                }
                            } catch (_: Exception) {}

                            for (job in jobs) {
                                val targetSlot = if (job.simSlot in 0..1) job.simSlot else prefs.selectedSimSlot
                                updateNotification("Dispatching SMS to ${job.phoneNumber}...")

                                var sendResult = smsSender.sendSms(
                                    phoneNumber = job.phoneNumber,
                                    message = job.message,
                                    simSlotIndex = targetSlot
                                )

                                val isPermanentError = sendResult.errorMessage?.let { msg ->
                                    msg.contains("Limit Reached") ||
                                    msg.contains("Radio is OFF") ||
                                    msg.contains("FDN") ||
                                    msg.contains("Permission Denied") ||
                                    msg.contains("Invalid phone number") ||
                                    msg.contains("not allowed")
                                } ?: false

                                // Only retry transient carrier glitches
                                if (!sendResult.success && !isPermanentError) {
                                    delay(2000L)
                                    sendResult = smsSender.sendSms(
                                        phoneNumber = job.phoneNumber,
                                        message = job.message,
                                        simSlotIndex = targetSlot
                                    )
                                }

                                val statusStr = if (sendResult.success) "delivered" else "failed"

                                GatewayApiClient.reportDelivery(
                                    serverUrl = prefs.serverUrl,
                                    deviceToken = prefs.deviceToken,
                                    jobId = job.jobId,
                                    status = statusStr,
                                    errorMessage = sendResult.errorMessage
                                )

                                if (sendResult.success) {
                                    prefs.incrementSentCount()
                                }

                                addLog(
                                    GatewayLogEntry(
                                        phoneNumber = job.phoneNumber,
                                        message = job.message,
                                        status = statusStr,
                                        error = sendResult.errorMessage
                                    )
                                )

                                // Anti-burst pause to keep telecom carriers happy
                                delay(1800L)
                            }
                            updateNotification("🟢 Ready (Total Sent: ${prefs.totalSentCount})")
                            try {
                                if (wakeLock?.isHeld == true) wakeLock?.release()
                            } catch (_: Exception) {}
                        }
                    } catch (_: Exception) {}
                }
                delay(3000L)
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "SMS Gateway Background Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Maintains connection with DreamFashion POS for SMS dispatch"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(statusText: String): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            setPackage(packageName)
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = PendingIntent.getActivity(this, 0, launchIntent, flags)

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("HakimQzz SMS Gateway")
            .setContentText(statusText)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun updateNotification(statusText: String) {
        try {
            val notification = createNotification(statusText)
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.notify(NOTIFICATION_ID, notification)
        } catch (_: Exception) {}
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceJob.cancel()
        _isRunning.value = false
        prefs.isServiceEnabled = false
        try {
            unregisterReceiver(batteryReceiver)
        } catch (_: Exception) {}
        try {
            if (wakeLock?.isHeld == true) wakeLock?.release()
        } catch (_: Exception) {}
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
