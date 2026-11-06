package com.example.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

val Purple80 = Color(0xFFD0BCFF)
val PurpleGrey80 = Color(0xFFCCC2DC)

@Composable
fun HomeScreen() {
    MaterialTheme {
        Column(
            modifier = Modifier
                .background(Brush.verticalGradient(listOf(Color(0xFF6366F1), Color(0xFF0F172A))))
                .padding(18.dp),
        ) {
            Text("🚀 Welcome back!", fontSize = 34.sp, color = Color.White, fontFamily = FontFamily.SansSerif)
            Text("Your AI assistant ✨", fontSize = 11.sp, color = Color(0xFF22D3EE))
            Spacer(Modifier.height(13.dp))
            Card(
                shape = RoundedCornerShape(28.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 12.dp),
                modifier = Modifier.shadow(24.dp, spotColor = Color(0xFFA855F7)),
            ) {
                Text("Balance 💰", fontSize = 15.sp, modifier = Modifier.padding(14.dp))
            }
            Card(shape = RoundedCornerShape(20.dp), modifier = Modifier.shadow(8.dp).blur(16.dp)) {
                Text("Spending", fontSize = 13.sp)
            }
            Card(shape = RoundedCornerShape(6.dp), modifier = Modifier.shadow(4.dp)) {
                Text("Savings", fontSize = 19.sp)
            }
            Card(shape = RoundedCornerShape(9.dp), modifier = Modifier.shadow(2.dp)) {
                Text("Goals", fontSize = 22.sp)
            }
            Text("Close", fontSize = 17.sp, modifier = Modifier.size(32.dp).clip(CircleShape).clickable { })
            Text("More", fontSize = 26.sp, modifier = Modifier.shadow(6.dp).clip(CircleShape))
            Text("Help", modifier = Modifier.clip(CircleShape).clip(CircleShape))
        }
    }
}
