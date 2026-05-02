import 'package:flutter/material.dart';

import '../models/salon.dart';
import '../services/api_service.dart';
import 'booking_screen.dart';
import 'my_bookings_screen.dart';

class SalonListScreen extends StatefulWidget {
  const SalonListScreen({super.key});

  @override
  State<SalonListScreen> createState() => _SalonListScreenState();
}

class _SalonListScreenState extends State<SalonListScreen> {
  late Future<List<Salon>> salonsFuture;

  @override
  void initState() {
    super.initState();
    salonsFuture = api.salons();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Find a salon'),
        actions: [
          IconButton(
            tooltip: 'My bookings',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const MyBookingsScreen()),
              );
            },
            icon: const Icon(Icons.event_note),
          ),
        ],
      ),
      body: FutureBuilder<List<Salon>>(
        future: salonsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('${snapshot.error}'));
          }
          final salons = snapshot.data ?? [];
          if (salons.isEmpty) {
            return const Center(child: Text('No salons yet'));
          }
          return ListView.separated(
            itemCount: salons.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final salon = salons[index];
              return ListTile(
                title: Text(salon.name),
                subtitle: Text('${salon.address}\n${salon.phone}'),
                isThreeLine: true,
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => BookingScreen(salon: salon)),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}
