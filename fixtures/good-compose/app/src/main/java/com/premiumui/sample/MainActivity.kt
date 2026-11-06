package com.premiumui.sample

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.premiumui.sample.ui.theme.AppTheme
import com.premiumui.sample.ui.theme.Spacing

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            AppTheme {
                HomeScreen()
            }
        }
    }
}

private data class Transaction(val name: String, val detail: String, val amount: String, val incoming: Boolean)

private val transactions = listOf(
    Transaction("Northside Grocers", "Today, 09:41 · Card ending 4021", "48.20", incoming = false),
    Transaction("Salary · Halden & Co.", "Yesterday · Transfer", "3,250.00", incoming = true),
    Transaction("City Water Utility", "3 Nov · Direct debit", "62.75", incoming = false),
)

@Composable
fun HomeScreen() {
    val colors = AppTheme.colors
    val type = AppTheme.type
    var note by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bg)
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = Spacing.s4),
    ) {
        Spacer(Modifier.height(Spacing.s12))
        Text("Available balance", style = type.label, color = colors.textMuted)
        Spacer(Modifier.height(Spacing.s2))
        Text(
            buildAnnotatedString {
                withStyle(SpanStyle(color = colors.textMuted)) { append("$") }
                append("12,480")
                withStyle(SpanStyle(color = colors.textMuted)) { append(".56") }
            },
            style = type.display,
            color = colors.text,
        )
        Spacer(Modifier.height(Spacing.s1))
        Text("+ $320.10 this month", style = type.bodySmall, color = colors.success)

        Spacer(Modifier.height(Spacing.s8))
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.s3)) {
            Button(
                onClick = {},
                modifier = Modifier.weight(1f).heightIn(min = Spacing.minTouchTarget),
            ) { Text("Send money") }
            OutlinedButton(
                onClick = {},
                modifier = Modifier.weight(1f).heightIn(min = Spacing.minTouchTarget),
            ) { Text("Request", color = colors.text) }
        }

        Spacer(Modifier.height(Spacing.s8))
        Text("Recent activity", style = type.title, color = colors.text)
        Spacer(Modifier.height(Spacing.s3))
        Column(
            Modifier
                .fillMaxWidth()
                .background(colors.surface, AppTheme.shapes.md)
                .border(1.dp, colors.border, AppTheme.shapes.md),
        ) {
            transactions.forEachIndexed { index, t ->
                if (index > 0) HorizontalDivider(color = colors.border)
                Row(
                    Modifier.fillMaxWidth().padding(Spacing.s4),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(t.name, style = type.body, color = colors.text)
                        Text(t.detail, style = type.caption, color = colors.textMuted)
                    }
                    Text(
                        (if (t.incoming) "+ $" else "− $") + t.amount,
                        style = type.body,
                        color = if (t.incoming) colors.success else colors.text,
                    )
                }
            }
        }

        Spacer(Modifier.height(Spacing.s8))
        OutlinedTextField(
            value = note,
            onValueChange = { note = it },
            label = { Text("Note to recipient") },
            supportingText = { Text("Visible to the person you pay") },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(Spacing.s12))
    }
}

@Preview(name = "Light", showBackground = true)
@Composable
private fun HomeLightPreview() {
    AppTheme(darkTheme = false) { HomeScreen() }
}

@Preview(name = "Dark", showBackground = true)
@Composable
private fun HomeDarkPreview() {
    AppTheme(darkTheme = true) { HomeScreen() }
}
