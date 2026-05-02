import 'package:flutter/material.dart';

import '../services/api_service.dart';
import 'barber_dashboard_screen.dart';
import 'salon_list_screen.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final nameController = TextEditingController();
  final phoneController = TextEditingController();
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  String role = 'customer';
  bool loading = false;

  Future<void> signup() async {
    setState(() => loading = true);
    try {
      await api.signup(
        name: nameController.text.trim(),
        phone: phoneController.text.trim(),
        email: emailController.text.trim().isEmpty ? null : emailController.text.trim(),
        password: passwordController.text,
        role: role,
      );
      if (!mounted) return;
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(
          builder: (_) => role == 'barber'
              ? const BarberDashboardScreen()
              : const SalonListScreen(),
        ),
        (_) => false,
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
      appBar: AppBar(title: const Text('Create account')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'customer', label: Text('Customer')),
              ButtonSegment(value: 'barber', label: Text('Barber')),
            ],
            selected: {role},
            onSelectionChanged: (value) => setState(() => role = value.first),
          ),
          const SizedBox(height: 16),
          TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Name')),
          const SizedBox(height: 12),
          TextField(
            controller: phoneController,
            decoration: const InputDecoration(labelText: 'Phone'),
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: emailController,
            decoration: const InputDecoration(labelText: 'Email optional'),
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: passwordController,
            decoration: const InputDecoration(labelText: 'Password'),
            obscureText: true,
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: loading ? null : signup,
            child: Text(loading ? 'Creating...' : 'Sign up'),
          ),
        ],
      ),
    );
  }
}
