import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'config/app_theme.dart';
import 'screens/widget_showcase_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  runApp(const MemoryOSApp());
}

class MemoryOSApp extends StatelessWidget {
  const MemoryOSApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Memory OS - Widget Showcase',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const WidgetShowcaseScreen(),
    );
  }
}
