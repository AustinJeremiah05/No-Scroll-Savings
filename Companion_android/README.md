# Digital Wellbeing Viewer

A simple Android app built with Kotlin that displays your phone's Digital Wellbeing data (screen time per app) directly on your device.

## Features

- ✅ View per-app screen time for different time ranges (1 hour, 24 hours, 7 days, custom)
- ✅ Custom date and time range selection
- ✅ Total screen time summary
- ✅ Detailed app usage with timestamps
- ✅ **Automatic background sync to Supabase**
- ✅ Clean Material Design UI with RecyclerView
- ✅ Works on Android 7.0+ (API 24+)
- ✅ No root required
- ✅ Privacy-focused

## How It Works

This app uses Android's **UsageStatsManager** API to read usage statistics from your device. This is the same API used by Digital Wellbeing and other screen time tracking apps.

### Requirements

- Android device running **Android 7.0 (Nougat) or higher**
- **Usage Access permission** (granted by user in Settings)

## Setup & Installation

### Prerequisites

1. **Supabase Account** (for data sync)
   - See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for detailed setup instructions
   - Update `SupabaseClient.kt` with your credentials

### Option 1: Build in Android Studio (Recommended)

1. **Install Android Studio**  
   Download from: https://developer.android.com/studio

2. **Open the Project**  
   - Launch Android Studio
   - Click "Open" and select the `DigitalWellbeingViewer` folder

3. **Sync Gradle**  
   - Android Studio will automatically sync Gradle dependencies
   - Wait for "Gradle sync finished" notification

4. **Connect Your Phone**  
   - Enable **Developer Options** on your phone:
     - Go to Settings → About Phone
     - Tap "Build Number" 7 times
   - Enable **USB Debugging**:
     - Go to Settings → Developer Options
     - Turn on "USB Debugging"
   - Connect your phone via USB
   - Accept the "Allow USB debugging" prompt on your phone

5. **Run the App**  
   - Click the green "Run" button (▶️) in Android Studio
   - Select your device from the list
   - Wait for the app to install and launch

### Option 2: Build from Command Line

```powershell
# Navigate to project directory
cd C:\Users\Sugan\projects\DigitalWellbeingViewer

# Build debug APK
.\gradlew assembleDebug

# Install on connected device
.\gradlew installDebug
```

The APK will be generated at:  
`app\build\outputs\apk\debug\app-debug.apk`

You can also manually install it:
```powershell
adb install app\build\outputs\apk\debug\app-debug.apk
```

## Granting Usage Access Permission

When you first open the app, you'll see a message asking for permission:

1. Tap **"Open Settings"**
2. Find **"Digital Wellbeing Viewer"** in the list
3. Toggle the switch to **ON**
4. Press the back button to return to the app
5. Tap **"Refresh Data"** to load your usage stats

## Usage

1. **Select a time range** using the radio buttons:
   - 1 Hour
   - 24 Hours (default)
   - 7 Days
   - 30 Days

2. The app will automatically refresh and show:
   - Total screen time for the selected period
   - List of apps sorted by usage time (highest first)
   - Each app shows:
     - App name
     - Package name
     - Total usage time

3. Tap **"Refresh Data"** to reload at any time

## Privacy & Permissions

- **PACKAGE_USAGE_STATS**: Required to read usage statistics. This is a special permission that can only be granted through Settings (not via a popup).
- **No internet permission**: This app does NOT connect to the internet. All data stays on your device.
- **No data collection**: We don't collect, store, or transmit any of your usage data.

## Technical Details

- **Language**: Kotlin
- **Minimum SDK**: 24 (Android 7.0)
- **Target SDK**: 34 (Android 14)
- **Architecture**: Single Activity with RecyclerView
- **View Binding**: Enabled
- **Dependencies**:
  - AndroidX Core KTX
  - AppCompat
  - Material Components
  - ConstraintLayout
  - RecyclerView

## Limitations

- Usage data accuracy depends on your device manufacturer's implementation
- Very old usage data may be pruned by the system
- Some system apps may not report usage stats
- The app cannot read Digital Wellbeing's proprietary features (timers, parent controls) — those are stored in app-private storage

## Troubleshooting

### "No usage data available"
- Make sure you've granted Usage Access permission
- Try selecting a longer time range (24 hours or 7 days)
- Use your phone for a while and then refresh

### Permission not appearing in Settings
- Make sure you're opening "Usage access" or "Apps with usage access", not regular app permissions
- Some devices have this under Settings → Privacy → Special app access → Usage access

### App crashes on older devices
- This app requires Android 7.0+. Check your device's Android version.

## Building a Release APK

To create a signed release build:

1. Generate a keystore (one time):
```powershell
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```

2. Update `app/build.gradle.kts` with signing config
3. Build release:
```powershell
.\gradlew assembleRelease
```

## License

This project is provided as-is for educational purposes. Feel free to modify and distribute.

## Contributing

Found a bug or want to add a feature? Feel free to:
- Open an issue
- Submit a pull request
- Fork and customize for your needs

## Support

For questions or issues:
- Check the Troubleshooting section above
- Review Android's official UsageStatsManager documentation
- Search for similar issues on Stack Overflow

---

**Enjoy tracking your screen time! 📱⏱️**
