package com.example.app.ui

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.app.ui.theme.AppMotion
import com.example.app.ui.theme.AppTheme
import com.example.app.ui.theme.Spacing

@Composable
fun BalanceCard(label: String, amount: String) {
    Card(
        shape = AppTheme.shapes.md,
        colors = CardDefaults.cardColors(containerColor = AppTheme.colors.surface),
        border = BorderStroke(1.dp, AppTheme.colors.border),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f),
    ) {
        Column(Modifier.padding(Spacing.s6).animateContentSize(tween(AppMotion.BASE_MS, easing = AppMotion.Easing))) {
            Text(label, style = AppTheme.type.label, color = AppTheme.colors.textMuted)
            Text(amount, style = AppTheme.type.display, color = AppTheme.colors.text)
        }
    }
}
