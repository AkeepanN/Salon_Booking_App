import 'package:flutter/material.dart';

import '../services/api_service.dart';
import 'barber_dashboard_screen.dart';
import 'salon_list_screen.dart';
import 'signup_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final phoneController = TextEditingController();
  final passwordController = TextEditingController();
  bool loading = false;

  Future<void> login() async {
    setState(() => loading = true);
    try {
      await api.login(
        phoneOrEmail: phoneController.text.trim(),
        password: passwordController.text,
      );
      if (!mounted) return;
      final role = api.user?['role'];
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => role == 'barber'
              ? const BarberDashboardScreen()
              : const SalonListScreen(),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Salon Booking LK')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const SizedBox(height: 24),
          TextField(
            controller: phoneController,
            decoration: const InputDecoration(labelText: 'Phone or email'),
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: passwordController,
            decoration: const InputDecoration(labelText: 'Password'),
            obscureText: true,
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: loading ? null : login,
            child: Text(loading ? 'Signing in...' : 'Login'),
          ),
          TextButton(
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const SignupScreen()));
            },
            child: const Text('Create account'),
          ),
        ],
      ),
    );
  }
}
