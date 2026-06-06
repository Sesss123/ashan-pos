class Product {
  final String id;
  final String name;
  final String category;
  final String sku;
  final String? barcode;
  final double price;
  final double cost;
  final String unit;
  final double reorderLevel;

  Product({
    required this.id,
    required this.name,
    required this.category,
    required this.sku,
    this.barcode,
    required this.price,
    required this.cost,
    required this.unit,
    required this.reorderLevel,
  });
}

class StockItem {
  final String id;
  final String productId;
  final String? batchNumber;
  final double quantity;
  final Product? product;

  StockItem({
    required this.id,
    required this.productId,
    this.batchNumber,
    required this.quantity,
    this.product,
  });
}
