package com.example.app.ui

import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import com.example.app.ui.theme.AppTheme

@Composable
fun AmountField(value: String, onValueChange: (String) -> Unit, error: String?, modifier: Modifier = Modifier) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text("Amount") },
        prefix = { Text("$", color = AppTheme.colors.textMuted) },
        supportingText = { Text(error ?: "You can send up to $5,000 a day.") },
        isError = error != null,
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        shape = AppTheme.shapes.md,
        modifier = modifier,
    )
}
