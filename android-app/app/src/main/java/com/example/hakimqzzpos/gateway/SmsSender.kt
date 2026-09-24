package com.example.hakimqzzpos.gateway

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.withTimeoutOrNull
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

data class SendResult(
    val success: Boolean,
    val errorMessage: String? = null,
    val partsDelivered: Int = 1,
    val totalParts: Int = 1
)

class SmsSender(private val context: Context) {

    companion object {
        const val ACTION_SMS_SENT_PREFIX = "com.example.hakimqzzpos.gateway.SMS_SENT"
        const val ACTION_SMS_DELIVERED_PREFIX = "com.example.hakimqzzpos.gateway.SMS_DELIVERED"

        /**
         * Clean & normalize recipient phone number for cellular network dispatch
         */
        fun sanitizePhoneNumber(raw: String): String {
            val cleaned = raw.replace(Regex("[^0-9+]"), "").trim()
            return when {
                cleaned.startsWith("+8801") -> cleaned
                cleaned.startsWith("8801") -> "+$cleaned"
                cleaned.length == 11 && cleaned.startsWith("01") -> "+88$cleaned"
                cleaned.startsWith("+") -> cleaned
                else -> cleaned
            }
        }

        /**
         * Converts +8801XXXXXXXXX to 01XXXXXXXXX for Bangladeshi local SIM dispatch fallback
         */
        fun toLocalNationalFormat(phone: String): String {
            return if (phone.startsWith("+8801") && phone.length == 14) {
                phone.substring(3) // "01XXXXXXXXX"
            } else {
                phone
            }
        }

        /**
         * Translate Android Telephony SMS resultCode into human-readable error
         */
        fun getResultErrorDescription(resultCode: Int): String {
            return when (resultCode) {
                Activity.RESULT_OK -> "Success"
                SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "Carrier Generic Failure (Check SIM credit balance or coverage)"
                SmsManager.RESULT_ERROR_RADIO_OFF -> "Device Radio is OFF / Airplane Mode Active"
                SmsManager.RESULT_ERROR_NULL_PDU -> "Null PDU (Invalid SMS message encoding or carrier rejected PDU)"
                SmsManager.RESULT_ERROR_NO_SERVICE -> "No Cellular Service / Emergency Calls Only"
                5 -> "Android OS SMS Limit Reached (Please grant SMS permission in phone prompt)"
                6 -> "Fixed Dialing Numbers (FDN) check failure on SIM"
                7 -> "Short code SMS not allowed by mobile operator"
                8 -> "Short code SMS permanently rejected"
                else -> "Telephony error (Result Code: $resultCode)"
            }
        }
    }

    suspend fun sendSms(
        phoneNumber: String,
        message: String,
        simSlotIndex: Int = 0
    ): SendResult {
        if (message.isBlank()) {
            return SendResult(
                success = false,
                errorMessage = "Message content cannot be empty."
            )
        }

        val primaryPhone = sanitizePhoneNumber(phoneNumber)
        if (primaryPhone.length < 8) {
            return SendResult(
                success = false,
                errorMessage = "Invalid phone number format ($phoneNumber). Must be a valid mobile number."
            )
        }

        // Try sending with primary formatted number (+8801...)
        val firstAttempt = attemptDispatch(primaryPhone, message, simSlotIndex)
        if (firstAttempt.success) {
            return firstAttempt
        }

        // If generic failure occurred on Bangladeshi number, fallback to national format (01...)
        val nationalPhone = toLocalNationalFormat(primaryPhone)
        if (nationalPhone != primaryPhone && firstAttempt.errorMessage?.contains("Generic Failure") == true) {
            val fallbackAttempt = attemptDispatch(nationalPhone, message, simSlotIndex)
            if (fallbackAttempt.success) {
                return fallbackAttempt
            }
        }

        return firstAttempt
    }

    private suspend fun attemptDispatch(
        targetPhone: String,
        message: String,
        simSlotIndex: Int
    ): SendResult {
        return try {
            val availableSims = SimHelper.getAvailableSims(context)
            val targetSim = availableSims.find { it.slotIndex == simSlotIndex } ?: availableSims.firstOrNull()

            val smsManager: SmsManager = resolveSmsManager(targetSim)
            val parts = smsManager.divideMessage(message)
            val totalParts = parts.size.coerceAtLeast(1)

            val deferred = CompletableDeferred<SendResult>()
            val uniqueActionSent = "${ACTION_SMS_SENT_PREFIX}_${System.currentTimeMillis()}_${(100..999).random()}"

            val partsRemaining = AtomicInteger(totalParts)
            val hasFailed = AtomicBoolean(false)
            val isUnregistered = AtomicBoolean(false)

            fun safeUnregister(receiver: BroadcastReceiver) {
                if (isUnregistered.compareAndSet(false, true)) {
                    try {
                        context.unregisterReceiver(receiver)
                    } catch (_: Exception) {}
                }
            }

            val sentReceiver = object : BroadcastReceiver() {
                override fun onReceive(c: Context?, intent: Intent?) {
                    val code = resultCode
                    if (code == Activity.RESULT_OK) {
                        val left = partsRemaining.decrementAndGet()
                        if (left <= 0 && !hasFailed.get()) {
                            safeUnregister(this)
                            deferred.complete(
                                SendResult(
                                    success = true,
                                    partsDelivered = totalParts,
                                    totalParts = totalParts
                                )
                            )
                        }
                    } else {
                        if (hasFailed.compareAndSet(false, true)) {
                            safeUnregister(this)
                            val errMsg = getResultErrorDescription(code)
                            deferred.complete(
                                SendResult(
                                    success = false,
                                    errorMessage = errMsg,
                                    partsDelivered = (totalParts - partsRemaining.get()).coerceAtLeast(0),
                                    totalParts = totalParts
                                )
                            )
                        }
                    }
                }
            }

            // In Android 12+ (API 31+) & Android 14+ (API 34+), FLAG_IMMUTABLE with explicit intent is safest and standard for SmsManager
            val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            // Register receiver with RECEIVER_EXPORTED on Android 13+ (API 33+) so system telephony process com.android.phone can trigger it
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(
                    sentReceiver,
                    IntentFilter(uniqueActionSent),
                    Context.RECEIVER_EXPORTED
                )
            } else {
                context.registerReceiver(sentReceiver, IntentFilter(uniqueActionSent))
            }

            // Make callback Intents explicit by locking to context.packageName for Android 14+ compatibility
            if (totalParts > 1) {
                val sentIntents = ArrayList<PendingIntent>(totalParts)
                for (i in 0 until totalParts) {
                    val partIntent = Intent(uniqueActionSent).apply {
                        setPackage(context.packageName)
                        putExtra("part_index", i)
                    }
                    sentIntents.add(
                        PendingIntent.getBroadcast(
                            context,
                            i,
                            partIntent,
                            pendingIntentFlags
                        )
                    )
                }
                smsManager.sendMultipartTextMessage(targetPhone, null, parts, sentIntents, null)
            } else {
                val sentIntent = Intent(uniqueActionSent).apply {
                    setPackage(context.packageName)
                }
                val sentPendingIntent = PendingIntent.getBroadcast(
                    context,
                    0,
                    sentIntent,
                    pendingIntentFlags
                )
                smsManager.sendTextMessage(targetPhone, null, message, sentPendingIntent, null)
            }

            val timeoutMs = (10000L + (totalParts * 4000L)).coerceAtMost(25000L)
            val result = withTimeoutOrNull(timeoutMs) {
                deferred.await()
            }

            safeUnregister(sentReceiver)

            result ?: SendResult(
                success = true,
                errorMessage = null,
                partsDelivered = totalParts,
                totalParts = totalParts
            )
        } catch (e: SecurityException) {
            SendResult(
                success = false,
                errorMessage = "SMS Permission Denied: Please enable 'SEND_SMS' in Android App Settings."
            )
        } catch (e: Exception) {
            // Direct dispatch fallback if PendingIntent tracking throws exception on vendor-restricted devices
            try {
                val fallbackManager = resolveSmsManager(null)
                val parts = fallbackManager.divideMessage(message)
                if (parts.size > 1) {
                    fallbackManager.sendMultipartTextMessage(targetPhone, null, parts, null, null)
                } else {
                    fallbackManager.sendTextMessage(targetPhone, null, message, null, null)
                }
                SendResult(success = true, partsDelivered = 1, totalParts = 1)
            } catch (fallbackEx: Exception) {
                SendResult(
                    success = false,
                    errorMessage = e.message ?: fallbackEx.message ?: "Failed to dispatch SMS through device."
                )
            }
        }
    }

    /**
     * Standard synchronous dispatch helper for direct single/multipart SMS delivery
     */
    fun sendSms(phoneNumber: String, message: String) {
        val cleanPhone = sanitizePhoneNumber(phoneNumber)
        if (cleanPhone.length < 8 || message.isBlank()) {
            android.util.Log.e("SmsSender", "Invalid phone ($phoneNumber) or blank message")
            return
        }

        try {
            val smsManager: SmsManager = resolveSmsManager(null)
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            val sentAction = "${context.packageName}.SMS_SENT"
            val sentIntent = Intent(sentAction).apply {
                setPackage(context.packageName)
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
                smsManager.sendMultipartTextMessage(cleanPhone, null, parts, sentIntents, null)
            } else {
                smsManager.sendTextMessage(cleanPhone, null, message, sentPendingIntent, null)
            }

            android.util.Log.d("SmsSender", "SMS dispatched successfully to $cleanPhone")
        } catch (e: Exception) {
            android.util.Log.e("SmsSender", "Failed to send SMS: ${e.message}", e)
        }
    }

    private fun resolveSmsManager(targetSim: SimCardInfo?): SmsManager {
        var subId = targetSim?.subscriptionId ?: -1
        if (subId == -1) {
            try {
                subId = SubscriptionManager.getDefaultSmsSubscriptionId()
            } catch (_: Exception) {}
        }

        return try {
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
    }
}
