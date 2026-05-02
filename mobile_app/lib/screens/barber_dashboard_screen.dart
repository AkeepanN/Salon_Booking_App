import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../services/api_service.dart';

class BarberDashboardScreen extends StatefulWidget {
  const BarberDashboardScreen({super.key});

  @override
  State<BarberDashboardScreen> createState() => _BarberDashboardScreenState();
}

class _BarberDashboardScreenState extends State<BarberDashboardScreen> {
  final salonNameController = TextEditingController();
  final addressController = TextEditingController();
  final phoneController = TextEditingController();
  final serviceNameController = TextEditingController();
  final priceController = TextEditingController();
  final durationController = TextEditingController(text: '30');
  final openController = TextEditingController(text: '09:00');
  final closeController = TextEditingController(text: '18:00');
  final intervalController = TextEditingController(text: '15');
  List<dynamic> salons = [];
  List<dynamic> bookings = [];
  String? selectedSalonId;
  bool loading = true;

  String get today => DateFormat('yyyy-MM-dd').format(DateTime.now());

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      salons = await api.mySalons();
      selectedSalonId ??= salons.isEmpty ? null : salons.first['_id'];
      await loadBookings();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> loadBookings() async {
    if (selectedSalonId == null) return;
    bookings = await api.dailyBookings(selectedSalonId!, today);
  }

  Future<void> createSalon() async {
    await api.createSalon(
      name: salonNameController.text.trim(),
      address: addressController.text.trim(),
      phone: phoneController.text.trim(),
    );
    salonNameController.clear();
    addressController.clear();
    phoneController.clear();
    await load();
  }

  Future<void> addService() async {
    if (selectedSalonId == null) return;
    await api.addService(
      salonId: selectedSalonId!,
      name: serviceNameController.text.trim(),
      price: num.tryParse(priceController.text) ?? 0,
      duration: int.tryParse(durationController.text) ?? 30,
    );
    serviceNameController.clear();
    priceController.clear();
    durationController.text = '30';
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Service added')));
  }

  Future<void> saveWorkingHours() async {
    if (selectedSalonId == null) return;
    await api.updateWorkingHours(
      salonId: selectedSalonId!,
      open: openController.text.trim(),
      close: closeController.text.trim(),
      slotIntervalMinutes: int.tryParse(intervalController.text) ?? 15,
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Working hours saved')));
  }

  Future<void> complete(String bookingId) async {
    await api.completeBooking(bookingId);
    await load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Barber dashboard')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Salon profile', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          TextField(controller: salonNameController, decoration: const InputDecoration(labelText: 'Salon name')),
          const SizedBox(height: 8),
          TextField(controller: addressController, decoration: const InputDecoration(labelText: 'Address')),
          const SizedBox(height: 8),
          TextField(controller: phoneController, decoration: const InputDecoration(labelText: 'Phone')),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: createSalon,
            icon: const Icon(Icons.store),
            label: const Text('Create salon'),
          ),
          const Divider(height: 32),
          if (salons.isNotEmpty)
            DropdownButtonFormField<String>(
              value: selectedSalonId,
              decoration: const InputDecoration(labelText: 'Current salon'),
              items: salons
                  .map((salon) => DropdownMenuItem<String>(
                        value: salon['_id'],
                        child: Text(salon['name']),
                      ))
                  .toList(),
              onChanged: (value) async {
                selectedSalonId = value;
                await loadBookings();
                setState(() {});
              },
            ),
          const SizedBox(height: 16),
          Text('Working hours', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: TextField(controller: openController, decoration: const InputDecoration(labelText: 'Open'))),
              const SizedBox(width: 8),
              Expanded(child: TextField(controller: closeController, decoration: const InputDecoration(labelText: 'Close'))),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: intervalController,
            decoration: const InputDecoration(labelText: 'Slot interval minutes'),
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: selectedSalonId == null ? null : saveWorkingHours,
            icon: const Icon(Icons.schedule),
            label: const Text('Save working hours'),
          ),
          const Divider(height: 32),
          Text('Add service', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          TextField(controller: serviceNameController, decoration: const InputDecoration(labelText: 'Service name')),
          const SizedBox(height: 8),
          TextField(
            controller: priceController,
            decoration: const InputDecoration(labelText: 'Price Rs.'),
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 8),
          TextField(
            controller: durationController,
            decoration: const InputDecoration(labelText: 'Duration minutes'),
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: selectedSalonId == null ? null : addService,
            icon: const Icon(Icons.add),
            label: const Text('Add service'),
          ),
          const Divider(height: 32),
          Text('Today bookings', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (loading)
            const Center(child: CircularProgressIndicator())
          else if (bookings.isEmpty)
            const Text('No bookings today')
          else
            ...bookings.map((booking) {
              final service = booking['service_id'];
              final customer = booking['customer_id'];
              return Card(
                child: ListTile(
                  title: Text('${booking['start_time']} ${service?['name'] ?? ''}'),
                  subtitle: Text('${customer?['name'] ?? ''} ${customer?['phone'] ?? ''}'),
                  trailing: booking['status'] == 'confirmed'
                      ? IconButton(
                          onPressed: () => complete(booking['_id']),
                          icon: const Icon(Icons.check_circle),
                        )
                      : Text(booking['status']),
                ),
              );
            }),
        ],
      ),
    );
  }
}
