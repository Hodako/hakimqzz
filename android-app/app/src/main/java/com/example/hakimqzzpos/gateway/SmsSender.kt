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
                // If it starts with +8801..., keep as is
                cleaned.startsWith("+8801") -> cleaned
                // If it starts with 8801..., add leading +
                cleaned.startsWith("8801") -> "+$cleaned"
                // If standard 11-digit BD number 01XXXXXXXXX, format to +8801...
                cleaned.length == 11 && cleaned.startsWith("01") -> "+88$cleaned"
                // If other international number with +, keep as is
                cleaned.startsWith("+") -> cleaned
                else -> cleaned
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
                5 -> "Android OS SMS Limit Reached (Please grant SMS permission in phone prompt)" // RESULT_ERROR_LIMIT_EXCEEDED
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

        val cleanPhone = sanitizePhoneNumber(phoneNumber)
        if (cleanPhone.length < 8) {
            return SendResult(
                success = false,
                errorMessage = "Invalid phone number format ($phoneNumber). Must be a valid mobile number."
            )
        }

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

            // 2. Set FLAG_IMMUTABLE for Android 12+ (API 31+) & Android 14+ (API 34)
            val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            // In Android 14+ (API 34+), SmsManager sent broadcasts originate from the system telephony process (com.android.phone).
            // Explicitly registering with RECEIVER_EXPORTED ensures delivery to the app's receiver.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(
                    sentReceiver,
                    IntentFilter(uniqueActionSent),
                    Context.RECEIVER_EXPORTED
                )
            } else {
                context.registerReceiver(sentReceiver, IntentFilter(uniqueActionSent))
            }

            // 3. Make all callback Intents explicit by locking them to context.packageName
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
                smsManager.sendMultipartTextMessage(cleanPhone, null, parts, sentIntents, null)
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
                smsManager.sendTextMessage(cleanPhone, null, message, sentPendingIntent, null)
            }

            // Await cellular ACK with a timeout of 18 seconds (multi-part takes slightly longer)
            val timeoutMs = (10000L + (totalParts * 4000L)).coerceAtMost(25000L)
            val result = withTimeoutOrNull(timeoutMs) {
                deferred.await()
            }

            // Clean unregister on timeout
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
            SendResult(
                success = false,
                errorMessage = e.message ?: "Failed to dispatch SMS through device."
            )
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

            // 3. Set FLAG_IMMUTABLE for Android 12+ (API 31+) & Android 14+ (API 34)
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
        return try {
            if (targetSim != null && targetSim.subscriptionId != -1) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    context.getSystemService(SmsManager::class.java)
                        ?.createForSubscriptionId(targetSim.subscriptionId)
                        ?: @Suppress("DEPRECATION") SmsManager.getSmsManagerForSubscriptionId(targetSim.subscriptionId)
                } else {
                    @Suppress("DEPRECATION")
                    SmsManager.getSmsManagerForSubscriptionId(targetSim.subscriptionId)
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
