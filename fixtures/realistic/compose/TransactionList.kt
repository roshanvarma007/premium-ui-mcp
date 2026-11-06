package com.example.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.example.app.ui.theme.AppTheme
import com.example.app.ui.theme.Spacing

data class Tx(val id: String, val payee: String, val date: String, val amount: String)

@Composable
fun TransactionList(items: List<Tx>, onOpen: (Tx) -> Unit) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(Spacing.s0)) {
        items(items, key = { it.id }) { tx ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = Spacing.minTouchTarget)
                    .clickable { onOpen(tx) }
                    .padding(horizontal = Spacing.s4, vertical = Spacing.s3),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(tx.payee, style = AppTheme.type.body, color = AppTheme.colors.text)
                    Text(tx.date, style = AppTheme.type.caption, color = AppTheme.colors.textMuted)
                }
                Text(tx.amount, style = AppTheme.type.body, color = AppTheme.colors.text)
            }
            HorizontalDivider(color = AppTheme.colors.border)
        }
    }
}
