package com.example.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import com.example.app.ui.theme.AppTheme
import com.example.app.ui.theme.Spacing

@Composable
fun EmptyTransactions(onConnect: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(Spacing.s6),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("No transactions yet", style = AppTheme.type.title, color = AppTheme.colors.text)
        Spacer(Modifier.height(Spacing.s2))
        Text(
            "Connect an account and your last 90 days appear here.",
            style = AppTheme.type.bodySmall,
            color = AppTheme.colors.textMuted,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(Spacing.s6))
        Button(onClick = onConnect, modifier = Modifier.heightIn(min = Spacing.minTouchTarget)) {
            Text("Connect an account")
        }
    }
}
