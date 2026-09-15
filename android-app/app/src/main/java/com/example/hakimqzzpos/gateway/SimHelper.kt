package com.example.hakimqzzpos.gateway

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import androidx.core.content.ContextCompat

data class SimCardInfo(
    val slotIndex: Int,
    val subscriptionId: Int,
    val carrier: String,
    val displayName: String,
    val number: String = ""
)

object SimHelper {

    @SuppressLint("MissingPermission")
    fun getAvailableSims(context: Context): List<SimCardInfo> {
        val hasStatePerm = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED

        val hasBasicPerm = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(
                    context,
                    "android.permission.READ_BASIC_PHONE_STATE"
                ) == PackageManager.PERMISSION_GRANTED

        if (!hasStatePerm && !hasBasicPerm) {
            return listOf(
                SimCardInfo(
                    slotIndex = 0,
                    subscriptionId = -1,
                    carrier = "Default SIM",
                    displayName = "Default Phone SIM"
                )
            )
        }

        return try {
            val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            val activeList: List<SubscriptionInfo>? = subscriptionManager?.activeSubscriptionInfoList

            if (!activeList.isNullOrEmpty()) {
                activeList
                    .filter { it.simSlotIndex >= 0 }
                    .sortedBy { it.simSlotIndex }
                    .map { info ->
                        val carrierName = info.carrierName?.toString()?.trim() ?: ""
                        val dispName = info.displayName?.toString()?.trim() ?: "SIM ${info.simSlotIndex + 1}"
                        SimCardInfo(
                            slotIndex = info.simSlotIndex,
                            subscriptionId = info.subscriptionId,
                            carrier = if (carrierName.isNotEmpty()) carrierName else dispName,
                            displayName = dispName
                        )
                    }
            } else {
                listOf(
                    SimCardInfo(
                        slotIndex = 0,
                        subscriptionId = -1,
                        carrier = "Default SIM",
                        displayName = "Default Phone SIM"
                    )
                )
            }
        } catch (_: Exception) {
            listOf(
                SimCardInfo(
                    slotIndex = 0,
                    subscriptionId = -1,
                    carrier = "Default SIM",
                    displayName = "Default Phone SIM"
                )
            )
        }
    }
}
