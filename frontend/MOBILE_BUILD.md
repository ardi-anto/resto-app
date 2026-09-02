# KedaiOps Mobile Build Guide

## Capacitor Setup

Aplikasi KedaiOps sudah dikonfigurasi dengan Capacitor untuk export ke Android dan iOS.

### Prerequisites

**Untuk Android:**
- Android Studio (versi terbaru)
- Android SDK 33+
- Java 17+

**Untuk iOS:**
- macOS dengan Xcode 15+
- CocoaPods (`sudo gem install cocoapods`)
- Apple Developer Account (untuk distribusi)

---

## Build Steps

### 1. Build React App

```bash
cd /app/frontend
yarn build
```

### 2. Add Platform (Sekali Saja)

**Android:**
```bash
npx cap add android
```

**iOS (membutuhkan macOS):**
```bash
npx cap add ios
```

### 3. Sync Web Assets

Setelah setiap perubahan di web app:
```bash
npx cap sync
```

### 4. Open Native Project

**Android:**
```bash
npx cap open android
```
Ini akan membuka Android Studio dengan project native.

**iOS:**
```bash
npx cap open ios
```
Ini akan membuka Xcode dengan project native.

### 5. Build APK/IPA

**Android APK (Debug):**
Di Android Studio:
1. Build > Build Bundle(s) / APK(s) > Build APK(s)
2. APK tersedia di `android/app/build/outputs/apk/debug/app-debug.apk`

**Android Release:**
1. Generate keystore: `keytool -genkey -v -keystore kedaiops.keystore -alias kedaiops -keyalg RSA -keysize 2048 -validity 10000`
2. Update `capacitor.config.json` dengan path keystore
3. Build > Generate Signed Bundle / APK

**iOS (App Store):**
1. Di Xcode, pilih target device atau "Any iOS Device"
2. Product > Archive
3. Upload ke App Store Connect

---

## Konfigurasi

### capacitor.config.json

```json
{
  "appId": "com.kedaiops.app",
  "appName": "KedaiOps",
  "webDir": "build",
  "server": {
    "androidScheme": "https",
    "iosScheme": "https"
  }
}
```

### App ID
- **Android**: `com.kedaiops.app` (dapat diubah di `android/app/build.gradle`)
- **iOS**: `com.kedaiops.app` (dapat diubah di Xcode project settings)

---

## Troubleshooting

### Android
- Jika gradle sync gagal, pastikan Android SDK dan Java terinstall dengan benar
- Clear cache: `cd android && ./gradlew clean`

### iOS
- Pod install gagal: `cd ios/App && pod install --repo-update`
- Signing error: Setup Apple Developer account di Xcode

---

## Catatan Penting

1. **Environment ini (Linux container)** tidak memiliki Android Studio atau Xcode. 
   Build native harus dilakukan di mesin lokal dengan toolchain yang sesuai.

2. **iOS build membutuhkan macOS** - tidak bisa dilakukan di Windows atau Linux.

3. **Untuk production release**, diperlukan:
   - Android: Keystore untuk signing
   - iOS: Apple Developer Program membership ($99/tahun)

4. **PWA Alternative**: Aplikasi ini sudah mendukung PWA (Progressive Web App) 
   yang bisa diinstall langsung dari browser tanpa perlu build native.
