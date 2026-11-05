plugins {
    id("com.android.application")
}

android {
    namespace = "com.premiumui.xmlsample"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.premiumui.xmlsample"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }

    // bundled: res/font TTF files (default). downloadable: Google Fonts via Play services.
    flavorDimensions += "fonts"
    productFlavors {
        create("bundled") { dimension = "fonts" }
        create("downloadable") { dimension = "fonts" }
    }
}

dependencies {
    implementation("com.google.android.material:material:1.14.0")
    implementation("androidx.appcompat:appcompat:1.8.0")
}
