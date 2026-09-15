package com.example.hakimqzzpos.gateway

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.telephony.SmsManager
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.withTimeoutOrNull

data class SendResult(
    val success: Boolean,
    val errorMessage: String? = null
)

class SmsSender(private val context: Context) {

    companion object {
        const val ACTION_SMS_SENT = "com.example.hakimqzzpos.gateway.SMS_SENT"
        const val ACTION_SMS_DELIVERED = "com.example.hakimqzzpos.gateway.SMS_DELIVERED"
    }

    suspend fun sendSms(
        phoneNumber: String,
        message: String,
        simSlotIndex: Int = 0
    ): SendResult {
        return try {
            val availableSims = SimHelper.getAvailableSims(context)
            val targetSim = availableSims.find { it.slotIndex == simSlotIndex } ?: availableSims.firstOrNull()

            val smsManager: SmsManager = when {
                targetSim != null && targetSim.subscriptionId != -1 -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        context.getSystemService(SmsManager::class.java).createForSubscriptionId(targetSim.subscriptionId)
                    } else {
                        @Suppress("DEPRECATION")
                        SmsManager.getSmsManagerForSubscriptionId(targetSim.subscriptionId)
                    }
                }
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M -> {
                    context.getSystemService(SmsManager::class.java)
                }
                else -> {
                    @Suppress("DEPRECATION")
                    SmsManager.getDefault()
                }
            }

            val cleanPhone = phoneNumber.trim().replace(" ", "").replace("-", "")
            val parts = smsManager.divideMessage(message)

            val deferred = CompletableDeferred<SendResult>()
            val uniqueAction = "${ACTION_SMS_SENT}_${System.currentTimeMillis()}"

            val receiver = object : BroadcastReceiver() {
                override fun onReceive(c: Context?, intent: Intent?) {
                    try {
                        context.unregisterReceiver(this)
                    } catch (_: Exception) {}

                    val resultCode = resultCode
                    if (resultCode == Activity.RESULT_OK) {
                        deferred.complete(SendResult(success = true))
                    } else {
                        val errMsg = when (resultCode) {
                            SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "Generic Network Failure"
                            SmsManager.RESULT_ERROR_NO_SERVICE -> "No Cellular Service"
                            SmsManager.RESULT_ERROR_NULL_PDU -> "Null PDU"
                            SmsManager.RESULT_ERROR_RADIO_OFF -> "Airplane Mode / Radio Off"
                            else -> "Failed with result code $resultCode"
                        }
                        deferred.complete(SendResult(success = false, errorMessage = errMsg))
                    }
                }
            }

            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(receiver, IntentFilter(uniqueAction), Context.RECEIVER_NOT_EXPORTED)
            } else {
                context.registerReceiver(receiver, IntentFilter(uniqueAction))
            }

            val sentIntent = PendingIntent.getBroadcast(
                context,
                0,
                Intent(uniqueAction),
                flags
            )

            if (parts.size > 1) {
                val sentIntents = ArrayList<PendingIntent>()
                for (i in parts.indices) {
                    // Only track the last part for completion
                    if (i == parts.size - 1) {
                        sentIntents.add(sentIntent)
                    } else {
                        sentIntents.add(
                            PendingIntent.getBroadcast(
                                context,
                                i + 1,
                                Intent("${uniqueAction}_part_$i"),
                                flags
                            )
                        )
                    }
                }
                smsManager.sendMultipartTextMessage(cleanPhone, null, parts, sentIntents, null)
            } else {
                smsManager.sendTextMessage(cleanPhone, null, message, sentIntent, null)
            }

            // Wait up to 15 seconds for cellular network ACK
            val result = withTimeoutOrNull(15000L) {
                deferred.await()
            }

            result ?: SendResult(success = true) // If timeout waiting for receiver, assume network dispatched
        } catch (e: Exception) {
            SendResult(success = false, errorMessage = e.message ?: "Failed to dispatch SMS")
        }
    }
}
