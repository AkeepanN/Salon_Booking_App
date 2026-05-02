import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/salon.dart';
import '../models/service.dart';
import '../services/api_service.dart';

class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key, required this.salon});

  final Salon salon;

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  List<SalonService> services = [];
  List<Map<String, dynamic>> slots = [];
  SalonService? selectedService;
  DateTime selectedDate = DateTime.now();
  bool loading = true;

  String get dateText => DateFormat('yyyy-MM-dd').format(selectedDate);

  @override
  void initState() {
    super.initState();
    loadServices();
  }

  Future<void> loadServices() async {
    try {
      services = await api.services(widget.salon.id);
      selectedService = services.isEmpty ? null : services.first;
      await loadSlots();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> loadSlots() async {
    if (selectedService == null) return;
    setState(() => loading = true);
    slots = await api.availability(
      salonId: widget.salon.id,
      serviceId: selectedService!.id,
      date: dateText,
    );
    if (mounted) setState(() => loading = false);
  }

  Future<void> book(String startTime) async {
    try {
      await api.book(
        salonId: widget.salon.id,
        serviceId: selectedService!.id,
        date: dateText,
        startTime: startTime,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Booking confirmed')),
      );
      await loadSlots();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  Future<void> pickDate() async {
    final value = await showDatePicker(
      context: context,
      initialDate: selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 30)),
    );
    if (value == null) return;
    setState(() => selectedDate = value);
    await loadSlots();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.salon.name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(widget.salon.address, style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 16),
          DropdownButtonFormField<SalonService>(
            value: selectedService,
            decoration: const InputDecoration(labelText: 'Service'),
            items: services
                .map((service) => DropdownMenuItem(
                      value: service,
                      child: Text('${service.name} - Rs. ${service.price}'),
                    ))
                .toList(),
            onChanged: (service) async {
              selectedService = service;
              await loadSlots();
            },
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: pickDate,
            icon: const Icon(Icons.calendar_today),
            label: Text(dateText),
          ),
          const SizedBox(height: 16),
          if (loading)
            const Center(child: CircularProgressIndicator())
          else if (slots.isEmpty)
            const Center(child: Padding(
              padding: EdgeInsets.all(24),
              child: Text('No available slots'),
            ))
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: slots.map((slot) {
                return ActionChip(
                  label: Text('${slot['start_time']} - ${slot['end_time']}'),
                  onPressed: () => book(slot['start_time']),
                );
              }).toList(),
            ),
        ],
      ),
    );
  }
}
