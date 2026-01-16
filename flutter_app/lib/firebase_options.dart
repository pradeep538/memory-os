// File generated manually for Firebase project: mem-os-93a6a
//
// To regenerate this file, install Firebase CLI and run:
// dart pub global activate flutterfire_cli
// flutterfire configure
//
// This file should be version controlled.

import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Default [FirebaseOptions] for use with your Firebase apps.
///
/// Example:
/// ```dart
/// import 'firebase_options.dart';
/// // ...
/// await Firebase.initializeApp(
///   options: DefaultFirebaseOptions.currentPlatform,
/// );
/// ```
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return macos;
      case TargetPlatform.windows:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for windows - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyCON5nLRh6-8pZ_qvQYxKjMhZ0hxMxKj9g',
    appId: '1:YOUR_APP_ID:web:YOUR_WEB_APP_ID',
    messagingSenderId: 'YOUR_SENDER_ID',
    projectId: 'mem-os-93a6a',
    authDomain: 'mem-os-93a6a.firebaseapp.com',
    storageBucket: 'mem-os-93a6a.appspot.com',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyB_yvtN9q_UqpBUwQnelfaP0NIn5Au50wM',
    appId: '1:916220082992:android:d0e50205abb7e8518226f5',
    messagingSenderId: '916220082992',
    projectId: 'mem-os-93a6a',
    storageBucket: 'mem-os-93a6a.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'YOUR_IOS_API_KEY',
    appId: '1:YOUR_APP_ID:ios:YOUR_IOS_APP_ID',
    messagingSenderId: 'YOUR_SENDER_ID',
    projectId: 'mem-os-93a6a',
    storageBucket: 'mem-os-93a6a.appspot.com',
    iosBundleId: 'com.rockrider.kairo',
  );

  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: 'YOUR_MACOS_API_KEY',
    appId: '1:YOUR_APP_ID:macos:YOUR_MACOS_APP_ID',
    messagingSenderId: 'YOUR_SENDER_ID',
    projectId: 'mem-os-93a6a',
    storageBucket: 'mem-os-93a6a.appspot.com',
    iosBundleId: 'com.rockrider.kairo',
  );
}
