plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.premiumui.sample"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.premiumui.sample"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }

    // Two flavors compile both font strategies the generator supports:
    // bundled (default, res/font files) and downloadable (Google Fonts via Play services).
    flavorDimensions += "fonts"
    productFlavors {
        create("bundled") { dimension = "fonts" }
        create("downloadable") { dimension = "fonts" }
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2026.09.00"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.activity:activity-compose:1.13.0")
    "downloadableImplementation"("androidx.compose.ui:ui-text-google-fonts")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
