package com.example.hakimqzzpos.gateway

import android.content.Context
import android.content.SharedPreferences

class GatewayPrefs(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("sms_gateway_prefs", Context.MODE_PRIVATE)

    var serverUrl: String
        get() = prefs.getString("server_url", "https://hakim.qzz.io") ?: "https://hakim.qzz.io"
        set(value) = prefs.edit().putString("server_url", value.trim().trimEnd('/')).apply()

    var deviceToken: String
        get() = prefs.getString("device_token", "") ?: ""
        set(value) = prefs.edit().putString("device_token", value.trim()).apply()

    var deviceId: String
        get() = prefs.getString("device_id", "") ?: ""
        set(value) = prefs.edit().putString("device_id", value).apply()

    var shopName: String
        get() = prefs.getString("shop_name", "Dream Fashion POS") ?: "Dream Fashion POS"
        set(value) = prefs.edit().putString("shop_name", value).apply()

    var selectedSimSlot: Int
        get() = prefs.getInt("selected_sim_slot", 0)
        set(value) = prefs.edit().putInt("selected_sim_slot", value).apply()

    var isServiceEnabled: Boolean
        get() = prefs.getBoolean("is_service_enabled", false)
        set(value) = prefs.edit().putBoolean("is_service_enabled", value).apply()

    var totalSentCount: Int
        get() = prefs.getInt("total_sent_count", 0)
        set(value) = prefs.edit().putInt("total_sent_count", value).apply()

    val isPaired: Boolean
        get() = deviceToken.isNotEmpty()

    fun incrementSentCount() {
        totalSentCount += 1
    }

    fun clearPairing() {
        prefs.edit()
            .remove("device_token")
            .remove("device_id")
            .remove("shop_name")
            .putBoolean("is_service_enabled", false)
            .apply()
    }
}
