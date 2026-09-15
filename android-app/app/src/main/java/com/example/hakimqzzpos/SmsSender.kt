package com.example.hakimqzzpos

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.SmsManager
import android.util.Log

class SmsSender(private val context: Context) {

    fun sendSms(phoneNumber: String, message: String) {
        try {
            // 1. Resolve SmsManager safely across Android versions
            val smsManager: SmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                context.getSystemService(SmsManager::class.java) ?: @Suppress("DEPRECATION") SmsManager.getDefault()
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }

            // 2. Make the Intent explicit by locking it to your package
            val sentAction = "${context.packageName}.SMS_SENT"
            val sentIntent = Intent(sentAction).apply {
                setPackage(context.packageName)
            }

            // 3. Set FLAG_IMMUTABLE for Android 12+ (API 31+) & Android 14 (API 34)
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

            // 4. Handle long messages with multipart if needed
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
