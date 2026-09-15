package com.example.hakimqzzpos

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.example.hakimqzzpos.gateway.ui.GatewayScreen
import com.example.hakimqzzpos.theme.HakimQzzPOSTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            HakimQzzPOSTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    GatewayScreen()
                }
            }
        }
    }
}
