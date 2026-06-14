import 'package:flutter/material.dart';

class Category {
  final String id;
  final String name;

  const Category({required this.id, required this.name});

  factory Category.fromJson(Map<String, dynamic> json) => Category(
    id: json['id'] ?? '',
    name: json['name'] ?? 'Unknown',
  );
  
  // Helper to map dynamic category names to icons
  IconData get icon {
    final lower = name.toLowerCase();
    if (lower.contains('burger') || lower.contains('main')) return Icons.lunch_dining;
    if (lower.contains('pizza')) return Icons.local_pizza;
    if (lower.contains('drink') || lower.contains('beverage')) return Icons.local_drink;
    if (lower.contains('dessert') || lower.contains('sweet')) return Icons.icecream;
    if (lower.contains('starter') || lower.contains('appetizer')) return Icons.restaurant_menu;
    return Icons.restaurant;
  }
}

class Product {
  final String id;
  final String name;
  final double price;
  final String barcode;
  final String categoryId;
  final String categoryName;
  final String? imageUrl;
  final bool isAvailable;

  const Product({
    required this.id,
    required this.name,
    required this.price,
    required this.barcode,
    required this.categoryId,
    this.categoryName = '',
    this.imageUrl,
    this.isAvailable = true,
  });

  Product copyWith({
    String? id,
    String? name,
    double? price,
    String? barcode,
    String? categoryId,
    String? categoryName,
    String? imageUrl,
    bool? isAvailable,
  }) {
    return Product(
      id: id ?? this.id,
      name: name ?? this.name,
      price: price ?? this.price,
      barcode: barcode ?? this.barcode,
      categoryId: categoryId ?? this.categoryId,
      categoryName: categoryName ?? this.categoryName,
      imageUrl: imageUrl ?? this.imageUrl,
      isAvailable: isAvailable ?? this.isAvailable,
    );
  }

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      price: (json['price'] ?? 0.0).toDouble(),
      barcode: json['barcode'] ?? '',
      categoryId: json['categoryId'] ?? '',
      categoryName: json['category']?['name'] ?? '', // Assume backend populates relation
      imageUrl: json['imageUrl'],
      isAvailable: json['isActive'] ?? true, // Backend uses isActive
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'barcode': barcode,
      'categoryId': categoryId,
      'imageUrl': imageUrl,
      'isActive': isAvailable,
    };
  }
}
