package com.example.hakimqzzpos.gateway.ui

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.hakimqzzpos.gateway.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GatewayScreen() {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val prefs = remember { GatewayPrefs(context) }

    var isPaired by remember { mutableStateOf(prefs.isPaired) }
    var serverUrl by remember { mutableStateOf(prefs.serverUrl) }
    var pairingCode by remember { mutableStateOf("") }
    var isPairing by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val isRunning by SmsGatewayService.isRunning.collectAsState()
    val logs by SmsGatewayService.logs.collectAsState()

    var availableSims by remember { mutableStateOf(SimHelper.getAvailableSims(context)) }
    var selectedSimSlot by remember { mutableStateOf(prefs.selectedSimSlot) }
    var totalSent by remember { mutableStateOf(prefs.totalSentCount) }

    var testPhone by remember { mutableStateOf("") }
    var isSendingTest by remember { mutableStateOf(false) }

    // Permission launcher
    val permissionsLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        availableSims = SimHelper.getAvailableSims(context)
    }

    LaunchedEffect(Unit) {
        val perms = mutableListOf(
            Manifest.permission.SEND_SMS,
            Manifest.permission.READ_PHONE_STATE
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        permissionsLauncher.launch(perms.toTypedArray())

        if (prefs.isPaired && prefs.isServiceEnabled) {
            SmsGatewayService.start(context)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "HakimQzz SMS Gateway",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        Text(
                            text = if (isPaired) "Shop: ${prefs.shopName}" else "Device Setup",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                actions = {
                    if (isPaired) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = if (isRunning) Color(0xFFE8F5E9) else Color(0xFFFFEBEE),
                            modifier = Modifier.padding(end = 12.dp)
                        ) {
                            Text(
                                text = if (isRunning) "🟢 ONLINE" else "🔴 PAUSED",
                                color = if (isRunning) Color(0xFF2E7D32) else Color(0xFFC62828),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            if (!isPaired) {
                // ─── NOT PAIRED STATE ───────────────────────────────────────
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "📱 Pair SMS Gateway",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Enter the 6-digit code shown in your DreamFashion / HakimQzz POS SMS panel.",
                            fontSize = 13.sp,
                            textAlign = TextAlign.Center,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f)
                        )

                        Spacer(modifier = Modifier.height(20.dp))

                        OutlinedTextField(
                            value = serverUrl,
                            onValueChange = { serverUrl = it },
                            label = { Text("Server URL") },
                            placeholder = { Text("https://hakim.qzz.io") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        OutlinedTextField(
                            value = pairingCode,
                            onValueChange = { if (it.length <= 6) pairingCode = it },
                            label = { Text("6-Digit Pairing Code") },
                            placeholder = { Text("e.g. 784920") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            textStyle = LocalTextStyle.current.copy(
                                fontFamily = FontFamily.Monospace,
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )

                        if (errorMessage != null) {
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = errorMessage ?: "",
                                color = MaterialTheme.colorScheme.error,
                                fontSize = 12.sp,
                                textAlign = TextAlign.Center
                            )
                        }

                        Spacer(modifier = Modifier.height(20.dp))

                        Button(
                            onClick = {
                                if (pairingCode.trim().length != 6) {
                                    errorMessage = "Please enter all 6 digits."
                                    return@Button
                                }
                                isPairing = true
                                errorMessage = null
                                coroutineScope.launch {
                                    val sims = SimHelper.getAvailableSims(context)
                                    val res = GatewayApiClient.pairDevice(
                                        serverUrl = serverUrl,
                                        code = pairingCode,
                                        deviceName = "${Build.MANUFACTURER} ${Build.MODEL}",
                                        simSlots = sims,
                                        activeSimSlot = selectedSimSlot
                                    )
                                    isPairing = false
                                    if (res.success && !res.deviceToken.isNullOrEmpty()) {
                                        prefs.serverUrl = serverUrl
                                        prefs.deviceToken = res.deviceToken
                                        prefs.deviceId = res.deviceId ?: ""
                                        prefs.shopName = res.shopName ?: "Dream Fashion"
                                        isPaired = true
                                        SmsGatewayService.start(context)
                                    } else {
                                        errorMessage = res.errorMessage ?: "Pairing failed. Please check code."
                                    }
                                }
                            },
                            enabled = !isPairing && pairingCode.trim().length == 6,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp)
                        ) {
                            if (isPairing) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    color = MaterialTheme.colorScheme.onPrimary,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Text("Authorise & Connect Gateway", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            } else {
                // ─── PAIRED DASHBOARD STATE ─────────────────────────────────
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Service Control Card
                    item {
                        Card(
                            shape = RoundedCornerShape(18.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "SMS Dispatcher Service",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp
                                    )
                                    Text(
                                        text = if (isRunning) "Listening & dispatching SMS jobs..." else "Service paused",
                                        fontSize = 12.sp,
                                        color = if (isRunning) Color(0xFF2E7D32) else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                Switch(
                                    checked = isRunning,
                                    onCheckedChange = { checked ->
                                        if (checked) {
                                            SmsGatewayService.start(context)
                                        } else {
                                            SmsGatewayService.stop(context)
                                        }
                                    }
                                )
                            }
                        }
                    }

                    // SIM Selector Card
                    item {
                        Card(
                            shape = RoundedCornerShape(18.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "Outgoing SIM Card",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp
                                )
                                Spacer(modifier = Modifier.height(8.dp))

                                availableSims.forEach { sim ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        RadioButton(
                                            selected = selectedSimSlot == sim.slotIndex,
                                            onClick = {
                                                selectedSimSlot = sim.slotIndex
                                                prefs.selectedSimSlot = sim.slotIndex
                                            }
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            Text(
                                                text = "SIM ${sim.slotIndex + 1}: ${sim.carrier}",
                                                fontWeight = FontWeight.SemiBold,
                                                fontSize = 14.sp
                                            )
                                            if (sim.displayName != sim.carrier) {
                                                Text(
                                                    text = sim.displayName,
                                                    fontSize = 11.sp,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Stats & Battery Exemption
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                                modifier = Modifier.weight(1f)
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Text("Total SMS Sent", fontSize = 12.sp)
                                    Text(
                                        text = prefs.totalSentCount.toString(),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 22.sp
                                    )
                                }
                            }

                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                                modifier = Modifier.weight(1f)
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Text("Device Battery", fontSize = 12.sp)
                                    Text(
                                        text = "Protected",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp
                                    )
                                }
                            }
                        }
                    }

                    // Battery optimization guide button
                    item {
                        OutlinedButton(
                            onClick = {
                                try {
                                    val pm = context.getSystemService(PowerManager::class.java)
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                                        !pm.isIgnoringBatteryOptimizations(context.packageName)
                                    ) {
                                        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                                            data = Uri.parse("package:${context.packageName}")
                                        }
                                        context.startActivity(intent)
                                    }
                                } catch (_: Exception) {}
                            },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("⚡ Enable Background Battery Exemption", fontSize = 12.sp)
                        }
                    }

                    // Test SMS Section
                    item {
                        Card(
                            shape = RoundedCornerShape(18.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Send Direct Test SMS", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    OutlinedTextField(
                                        value = testPhone,
                                        onValueChange = { testPhone = it },
                                        placeholder = { Text("017XXXXXXXX") },
                                        singleLine = true,
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.weight(1f)
                                    )
                                    Button(
                                        onClick = {
                                            if (testPhone.length >= 11) {
                                                isSendingTest = true
                                                coroutineScope.launch {
                                                    val sender = SmsSender(context)
                                                    val res = sender.sendSms(
                                                        phoneNumber = testPhone,
                                                        message = "Test SMS from HakimQzz SMS Gateway!",
                                                        simSlotIndex = selectedSimSlot
                                                    )
                                                    isSendingTest = false
                                                    SmsGatewayService.addLog(
                                                        GatewayLogEntry(
                                                            phoneNumber = testPhone,
                                                            message = "Direct Test SMS",
                                                            status = if (res.success) "delivered" else "failed",
                                                            error = res.errorMessage
                                                        )
                                                    )
                                                }
                                            }
                                        },
                                        enabled = !isSendingTest && testPhone.length >= 11,
                                        shape = RoundedCornerShape(10.dp)
                                    ) {
                                        Text("Send")
                                    }
                                }
                            }
                        }
                    }

                    // Live Event Logs Header
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Live Activity Logs (${logs.size})",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            TextButton(
                                onClick = {
                                    prefs.clearPairing()
                                    SmsGatewayService.stop(context)
                                    isPaired = false
                                }
                            ) {
                                Text("Disconnect Phone", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                            }
                        }
                    }

                    // Log Items
                    if (logs.isEmpty()) {
                        item {
                            Text(
                                text = "No messages sent yet. Waiting for jobs from web panel...",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(vertical = 12.dp)
                            )
                        }
                    } else {
                        items(logs) { log ->
                            Card(
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            text = log.phoneNumber,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp
                                        )
                                        Text(
                                            text = if (log.status == "delivered") "DELIVERED" else "FAILED",
                                            color = if (log.status == "delivered") Color(0xFF2E7D32) else Color(0xFFC62828),
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 11.sp
                                        )
                                    }
                                    Text(
                                        text = log.message,
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1
                                    )
                                    if (log.error != null) {
                                        Text(
                                            text = "Error: ${log.error}",
                                            fontSize = 10.sp,
                                            color = MaterialTheme.colorScheme.error
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
