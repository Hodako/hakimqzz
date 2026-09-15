package com.example.hakimqzzpos.gateway

import android.os.Build
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

data class SmsJob(
    val jobId: String,
    val phoneNumber: String,
    val message: String,
    val simSlot: Int,
    val campaignTitle: String? = null
)

data class PairResponse(
    val success: Boolean,
    val deviceToken: String? = null,
    val deviceId: String? = null,
    val shopName: String? = null,
    val errorMessage: String? = null
)

object GatewayApiClient {

    suspend fun pairDevice(
        serverUrl: String,
        code: String,
        deviceName: String,
        simSlots: List<SimCardInfo>,
        activeSimSlot: Int
    ): PairResponse = withContext(Dispatchers.IO) {
        try {
            val endpoint = URL("${serverUrl.trimEnd('/')}/api/sms-gateway/pair")
            val conn = endpoint.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            conn.setRequestProperty("Accept", "application/json")
            conn.connectTimeout = 12000
            conn.readTimeout = 12000
            conn.doOutput = true

            val jsonBody = JSONObject().apply {
                put("code", code.trim())
                put("deviceName", deviceName)
                put("deviceModel", Build.MODEL ?: "Android Phone")
                put("manufacturer", Build.MANUFACTURER ?: "Unknown")
                put("androidVersion", Build.VERSION.RELEASE ?: "")
                put("activeSimSlot", activeSimSlot)

                val simsArray = JSONArray()
                simSlots.forEach { sim ->
                    simsArray.put(JSONObject().apply {
                        put("slotIndex", sim.slotIndex)
                        put("subscriptionId", sim.subscriptionId)
                        put("carrier", sim.carrier)
                        put("displayName", sim.displayName)
                    })
                }
                put("simSlots", simsArray)
            }

            OutputStreamWriter(conn.outputStream, "UTF-8").use { writer ->
                writer.write(jsonBody.toString())
                writer.flush()
            }

            val statusCode = conn.responseCode
            val stream = if (statusCode in 200..299) conn.inputStream else conn.errorStream
            val responseText = BufferedReader(InputStreamReader(stream, "UTF-8")).use { it.readText() }

            val responseJson = JSONObject(responseText)
            if (responseJson.optBoolean("success", false)) {
                PairResponse(
                    success = true,
                    deviceToken = responseJson.optString("deviceToken"),
                    deviceId = responseJson.optString("deviceId"),
                    shopName = responseJson.optString("shopName", "Dream Fashion POS")
                )
            } else {
                PairResponse(
                    success = false,
                    errorMessage = responseJson.optString("error", "Failed to pair device")
                )
            }
        } catch (e: Exception) {
            PairResponse(success = false, errorMessage = e.message ?: "Connection error")
        }
    }

    suspend fun sendHeartbeat(
        serverUrl: String,
        deviceToken: String,
        batteryLevel: Int,
        isCharging: Boolean,
        networkType: String,
        simSlots: List<SimCardInfo>,
        activeSimSlot: Int
    ): Int = withContext(Dispatchers.IO) {
        try {
            val endpoint = URL("${serverUrl.trimEnd('/')}/api/sms-gateway/heartbeat")
            val conn = endpoint.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            conn.setRequestProperty("Authorization", "Bearer $deviceToken")
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.doOutput = true

            val jsonBody = JSONObject().apply {
                put("batteryLevel", batteryLevel)
                put("isCharging", isCharging)
                put("networkType", networkType)
                put("activeSimSlot", activeSimSlot)

                val simsArray = JSONArray()
                simSlots.forEach { sim ->
                    simsArray.put(JSONObject().apply {
                        put("slotIndex", sim.slotIndex)
                        put("carrier", sim.carrier)
                        put("displayName", sim.displayName)
                    })
                }
                put("simSlots", simsArray)
            }

            OutputStreamWriter(conn.outputStream, "UTF-8").use { writer ->
                writer.write(jsonBody.toString())
                writer.flush()
            }

            if (conn.responseCode in 200..299) {
                val resp = BufferedReader(InputStreamReader(conn.inputStream, "UTF-8")).use { it.readText() }
                val json = JSONObject(resp)
                json.optInt("pendingCount", 0)
            } else {
                0
            }
        } catch (e: Exception) {
            0
        }
    }

    suspend fun fetchPendingJobs(
        serverUrl: String,
        deviceToken: String,
        limit: Int = 5
    ): List<SmsJob> = withContext(Dispatchers.IO) {
        try {
            val endpoint = URL("${serverUrl.trimEnd('/')}/api/sms-gateway/pending?limit=$limit")
            val conn = endpoint.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.setRequestProperty("Authorization", "Bearer $deviceToken")
            conn.connectTimeout = 8000
            conn.readTimeout = 8000

            if (conn.responseCode in 200..299) {
                val resp = BufferedReader(InputStreamReader(conn.inputStream, "UTF-8")).use { it.readText() }
                val json = JSONObject(resp)
                val jobsArray = json.optJSONArray("jobs") ?: JSONArray()
                val list = mutableListOf<SmsJob>()

                for (i in 0 until jobsArray.length()) {
                    val obj = jobsArray.getJSONObject(i)
                    list.add(
                        SmsJob(
                            jobId = obj.getString("jobId"),
                            phoneNumber = obj.getString("phoneNumber"),
                            message = obj.getString("message"),
                            simSlot = obj.optInt("simSlot", 0),
                            campaignTitle = obj.optString("campaignTitle")
                        )
                    )
                }
                list
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun reportDelivery(
        serverUrl: String,
        deviceToken: String,
        jobId: String,
        status: String,
        errorMessage: String? = null
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val endpoint = URL("${serverUrl.trimEnd('/')}/api/sms-gateway/report")
            val conn = endpoint.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            conn.setRequestProperty("Authorization", "Bearer $deviceToken")
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.doOutput = true

            val jsonBody = JSONObject().apply {
                put("jobId", jobId)
                put("status", status)
                if (errorMessage != null) put("errorMessage", errorMessage)
            }

            OutputStreamWriter(conn.outputStream, "UTF-8").use { writer ->
                writer.write(jsonBody.toString())
                writer.flush()
            }

            conn.responseCode in 200..299
        } catch (e: Exception) {
            false
        }
    }
}
