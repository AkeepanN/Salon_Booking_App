class Salon {
  Salon({
    required this.id,
    required this.name,
    required this.address,
    required this.phone,
  });

  final String id;
  final String name;
  final String address;
  final String phone;

  factory Salon.fromJson(Map<String, dynamic> json) {
    return Salon(
      id: json['_id'] ?? json['id'],
      name: json['name'] ?? '',
      address: json['address'] ?? '',
      phone: json['phone'] ?? '',
    );
  }
}
