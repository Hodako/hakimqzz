package com.example.hakimqzzpos

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.util.Log

class SmsSender(private val context: Context) {

    fun sendSms(phoneNumber: String, message: String) {
        try {
            var subId = -1
            try {
                subId = SubscriptionManager.getDefaultSmsSubscriptionId()
            } catch (_: Exception) {}

            val smsManager: SmsManager = try {
                if (subId != SubscriptionManager.INVALID_SUBSCRIPTION_ID && subId > 0) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        context.getSystemService(SmsManager::class.java)
                            ?.createForSubscriptionId(subId)
                            ?: @Suppress("DEPRECATION") SmsManager.getSmsManagerForSubscriptionId(subId)
                    } else {
                        @Suppress("DEPRECATION")
                        SmsManager.getSmsManagerForSubscriptionId(subId)
                    }
                } else {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        context.getSystemService(SmsManager::class.java)
                            ?: @Suppress("DEPRECATION") SmsManager.getDefault()
                    } else {
                        @Suppress("DEPRECATION")
                        SmsManager.getDefault()
                    }
                }
            } catch (_: Exception) {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }

            val sentAction = "${context.packageName}.SMS_SENT"
            val sentIntent = Intent(sentAction).apply {
                setPackage(context.packageName)
            }

            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            val sentPendingIntent = PendingIntent.getBroadcast(
                context,
                0,
                sentIntent,
                flags
            )

            val parts = smsManager.divideMessage(message)
            if (parts.size > 1) {
                val sentIntents = ArrayList<PendingIntent>().apply {
                    repeat(parts.size) { add(sentPendingIntent) }
                }
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, sentIntents, null)
            } else {
                smsManager.sendTextMessage(phoneNumber, null, message, sentPendingIntent, null)
            }

            Log.d("SmsSender", "SMS dispatched successfully to $phoneNumber")

        } catch (e: Exception) {
            Log.e("SmsSender", "Failed to send SMS: ${e.message}", e)
        }
    }
}
