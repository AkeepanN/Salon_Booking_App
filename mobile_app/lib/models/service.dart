class SalonService {
  SalonService({
    required this.id,
    required this.name,
    required this.price,
    required this.duration,
  });

  final String id;
  final String name;
  final num price;
  final int duration;

  factory SalonService.fromJson(Map<String, dynamic> json) {
    return SalonService(
      id: json['_id'] ?? json['id'],
      name: json['name'] ?? '',
      price: json['price'] ?? 0,
      duration: json['duration'] ?? 0,
    );
  }
}
