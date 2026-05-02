import 'package:flutter/material.dart';

import '../services/api_service.dart';

class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  List<dynamic> bookings = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      bookings = await api.myBookings();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> cancel(String id) async {
    try {
      await api.cancelBooking(id);
      await load();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My bookings')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : bookings.isEmpty
              ? const Center(child: Text('No bookings yet'))
              : ListView.separated(
                  itemCount: bookings.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final booking = bookings[index];
                    final salon = booking['salon_id'];
                    final service = booking['service_id'];
                    final status = booking['status'];
                    return ListTile(
                      title: Text('${service?['name'] ?? 'Service'} at ${salon?['name'] ?? 'Salon'}'),
                      subtitle: Text('${booking['date']} ${booking['start_time']} - ${booking['end_time']}\n$status'),
                      isThreeLine: true,
                      trailing: status == 'confirmed'
                          ? IconButton(
                              onPressed: () => cancel(booking['_id']),
                              icon: const Icon(Icons.cancel),
                            )
                          : null,
                    );
                  },
                ),
    );
  }
}
