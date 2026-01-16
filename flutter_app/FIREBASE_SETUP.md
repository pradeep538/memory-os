# Firebase Configuration Setup Guide

## Quick Start: Get Firebase Config for Web

Since the FlutterFire CLI requires the Firebase CLI (not installed), you can get the Firebase web config from the Firebase Console:

### Step 1: Go to Firebase Console
1. Visit: https://console.firebase.google.com/project/mem-os-93a6a/settings/general
2. Scroll to "Your apps" section
3. If you don't have a web app yet, click "Add app" → Web (</>) icon

### Step 2: Get Web App Configuration
After creating/selecting your web app, you'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "mem-os-93a6a.firebaseapp.com",
  projectId: "mem-os-93a6a",
  storageBucket: "mem-os-93a6a.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcd1234"
};
```

### Step 3: Update `firebase_options.dart`

Replace the placeholder values in `lib/firebase_options.dart`:

```dart
static const FirebaseOptions web = FirebaseOptions(
  apiKey: 'AIzaSy...',  // ← Paste your apiKey here
  appId: '1:123456789:web:abcd1234',  // ← Paste your appId here  
  messagingSenderId: '123456789',  // ← Paste your messagingSenderId here
  projectId: 'mem-os-93a6a',  // ✓ Already correct
  authDomain: 'mem-os-93a6a.firebaseapp.com',  // ✓ Already correct
  storageBucket: 'mem-os-93a6a.appspot.com',  // ✓ Already correct
);
```

### Step 4: Enable Authentication Providers

1. Go to: https://console.firebase.google.com/project/mem-os-93a6a/authentication/providers
2. Enable **Google**:
   - Click "Google" → Toggle "Enable"
   - Set support email
   - Save
3. Enable **Phone**:
   - Click "Phone" → Toggle "Enable"  
   - Add test phone numbers for development (optional)
   - Save

### Step 5: Test the App

```bash
cd flutter_app
flutter run -d chrome
```

The app should now:
- ✅ Initialize Firebase successfully
- ✅ Show the sign-in screen
- ✅ Allow Google Sign-In
- ✅ Allow Phone Sign-In

---

## For Android/iOS (Later)

When you're ready to build for mobile:

### Android
1. Download `google-services.json` from Firebase Console
2. Place in `android/app/google-services.json`
3. Update `android/build.gradle` and `android/app/build.gradle` (see walkthrough.md)

### iOS  
1. Download `GoogleService-Info.plist` from Firebase Console
2. Place in `ios/Runner/GoogleService-Info.plist`
3. Run `cd ios && pod install`

---

## Current Status

✅ `firebase_options.dart` created with project ID  
⚠️ Need to add real API keys from Firebase Console  
⚠️ Need to enable Google & Phone auth in Firebase Console

**Time to complete**: ~5 minutes
