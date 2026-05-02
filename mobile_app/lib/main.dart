import 'package:flutter/material.dart';

import 'screens/login_screen.dart';

void main() {
  runApp(const SalonBookingApp());
}

class SalonBookingApp extends StatelessWidget {
  const SalonBookingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Salon Booking LK',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F766E)),
        useMaterial3: true,
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
        ),
      ),
      home: const LoginScreen(),
    );
  }
}
