import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/salon.dart';
import '../models/service.dart';

class ApiService {
  ApiService({this.baseUrl = 'http://10.0.2.2:4000/api'});

  final String baseUrl;
  String? token;
  Map<String, dynamic>? user;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Future<void> signup({
    required String name,
    required String phone,
    required String password,
    required String role,
    String? email,
  }) async {
    final data = await _post('/auth/signup', {
      'name': name,
      'phone': phone,
      'email': email,
      'password': password,
      'role': role,
    });
    token = data['token'];
    user = data['user'];
  }

  Future<void> login({
    required String phoneOrEmail,
    required String password,
  }) async {
    final data = await _post('/auth/login', {
      'phoneOrEmail': phoneOrEmail,
      'password': password,
    });
    token = data['token'];
    user = data['user'];
  }

  Future<List<Salon>> salons() async {
    final data = await _get('/salons');
    return (data as List).map((item) => Salon.fromJson(item)).toList();
  }

  Future<List<SalonService>> services(String salonId) async {
    final data = await _get('/services/salon/$salonId');
    return (data as List).map((item) => SalonService.fromJson(item)).toList();
  }

  Future<List<Map<String, dynamic>>> availability({
    required String salonId,
    required String serviceId,
    required String date,
  }) async {
    final data = await _get(
      '/bookings/availability?salon_id=$salonId&service_id=$serviceId&date=$date',
    );
    return List<Map<String, dynamic>>.from(data['slots']);
  }

  Future<Map<String, dynamic>> book({
    required String salonId,
    required String serviceId,
    required String date,
    required String startTime,
  }) async {
    return _post('/bookings', {
      'salon_id': salonId,
      'service_id': serviceId,
      'date': date,
      'start_time': startTime,
    });
  }

  Future<List<dynamic>> myBookings() => _get('/bookings/mine').then((v) => v as List);

  Future<Map<String, dynamic>> cancelBooking(String bookingId) {
    return _patch('/bookings/$bookingId/cancel', {});
  }

  Future<Map<String, dynamic>> createSalon({
    required String name,
    required String address,
    required String phone,
  }) {
    return _post('/salons', {'name': name, 'address': address, 'phone': phone});
  }

  Future<Map<String, dynamic>> addService({
    required String salonId,
    required String name,
    required num price,
    required int duration,
  }) {
    return _post('/services', {
      'salon_id': salonId,
      'name': name,
      'price': price,
      'duration': duration,
    });
  }

  Future<Map<String, dynamic>> updateWorkingHours({
    required String salonId,
    required String open,
    required String close,
    required int slotIntervalMinutes,
  }) {
    return _patch('/salons/$salonId/working-hours', {
      'workingHours': {
        'open': open,
        'close': close,
        'slotIntervalMinutes': slotIntervalMinutes,
      }
    });
  }

  Future<List<dynamic>> mySalons() => _get('/salons/mine').then((v) => v as List);

  Future<List<dynamic>> dailyBookings(String salonId, String date) {
    return _get('/bookings/salon/$salonId/daily?date=$date').then((v) => v as List);
  }

  Future<Map<String, dynamic>> completeBooking(String bookingId) {
    return _patch('/bookings/$bookingId/complete', {});
  }

  Future<dynamic> _get(String path) async {
    final response = await http.get(Uri.parse('$baseUrl$path'), headers: _headers);
    return _decode(response);
  }

  Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: _headers,
      body: jsonEncode(body),
    );
    return Map<String, dynamic>.from(_decode(response));
  }

  Future<Map<String, dynamic>> _patch(String path, Map<String, dynamic> body) async {
    final response = await http.patch(
      Uri.parse('$baseUrl$path'),
      headers: _headers,
      body: jsonEncode(body),
    );
    return Map<String, dynamic>.from(_decode(response));
  }

  dynamic _decode(http.Response response) {
    final data = response.body.isEmpty ? null : jsonDecode(response.body);
    if (response.statusCode >= 400) {
      throw ApiException(data?['message'] ?? 'Request failed');
    }
    return data;
  }
}

class ApiException implements Exception {
  ApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

final api = ApiService();
