import 'dart:convert';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/config.dart';

class FcmService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  static Future<void> initialize() async {
    // 1. Request permissions (iOS/Android 13+)
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('User granted notification permissions');
    } else {
      print('User declined or has not accepted notification permissions');
      return;
    }

    // 2. Setup Local Notifications (for foreground alerts)
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const InitializationSettings initializationSettings =
        InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: DarwinInitializationSettings(),
    );
    await _localNotifications.initialize(initializationSettings);

    // 3. Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Got a message whilst in the foreground!');
      _showLocalNotification(message);
    });

    // 4. Get and register token
    await registerDeviceToken();
  }

  static Future<void> registerDeviceToken() async {
    try {
      String? token = await _messaging.getToken();
      if (token != null) {
        print('FCM Token: $token');
        await _sendTokenToBackend(token);
      }
    } catch (e) {
      print('Error getting FCM token: $e');
    }
  }

  static Future<void> _sendTokenToBackend(String token) async {
    final prefs = await SharedPreferences.getInstance();
    final String? authToken = prefs.getString('auth_token');

    if (authToken == null) return;

    try {
      final response = await http.post(
        Uri.parse('${Config.apiBaseUrl}/notifications/register-token'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'fcm_token': token,
          'device_info': {
            'platform': 'flutter',
            'timestamp': DateTime.now().toIso8601String(),
          },
        }),
      );

      if (response.statusCode == 200) {
        print('FCM token registered successfully on backend');
      } else {
        print('Failed to register FCM token: ${response.body}');
      }
    } catch (e) {
      print('Error sending FCM token to backend: $e');
    }
  }

  static Future<void> _showLocalNotification(RemoteMessage message) async {
    const AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
      'kairo_nudges',
      'Kairo Nudges',
      channelDescription: 'Notifications for Kairo Action Plans',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
    );
    const NotificationDetails platformChannelSpecifics =
        NotificationDetails(android: androidPlatformChannelSpecifics);

    await _localNotifications.show(
      0,
      message.notification?.title ?? 'Kairo Nudge',
      message.notification?.body ?? '',
      platformChannelSpecifics,
      payload: jsonEncode(message.data),
    );
  }
}
