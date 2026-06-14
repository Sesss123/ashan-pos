import '../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/menu_admin_provider.dart';

class ProductsAdminScreen extends ConsumerStatefulWidget {
  const ProductsAdminScreen({super.key});

  @override
  ConsumerState<ProductsAdminScreen> createState() => _ProductsAdminScreenState();
}

class _ProductsAdminScreenState extends ConsumerState<ProductsAdminScreen> {
  String _searchQuery = '';

  void _showProductDialog([AdminProduct? product, List<AdminCategory>? categories]) {
    final nameController = TextEditingController(text: product?.name ?? '');
    final priceController = TextEditingController(text: product?.price.toString() ?? '');
    final barcodeController = TextEditingController(text: product?.barcode ?? '');
    
    // Default to the first category if none exists
    String? selectedCategoryId = product != null && product.categoryId.isNotEmpty 
        ? product.categoryId 
        : (categories != null && categories.isNotEmpty ? categories.first.id : null);
        
    bool isActive = product?.isActive ?? true;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(product == null ? 'Create Product' : 'Edit Product'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Product Name'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: priceController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Price'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: barcodeController,
                  decoration: const InputDecoration(labelText: 'Barcode'),
                ),
                const SizedBox(height: 12),
                if (categories != null && categories.isNotEmpty)
                  DropdownButtonFormField<String>(
                    initialValue: selectedCategoryId,
                    decoration: const InputDecoration(labelText: 'Category'),
                    items: categories.map((c) {
                      return DropdownMenuItem(value: c.id, child: Text(c.name));
                    }).toList(),
                    onChanged: (v) => setState(() => selectedCategoryId = v),
                  )
                else
                  const Text('Please add a category first!', style: TextStyle(color: Colors.red)),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Available (Active)'),
                    Switch(
                      value: isActive,
                      onChanged: (v) => setState(() => isActive = v),
                    ),
                  ],
                )
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (selectedCategoryId == null) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a category')));
                  return;
                }
                final data = {
                  'name': nameController.text,
                  'price': double.tryParse(priceController.text) ?? 0.0,
                  'barcode': barcodeController.text,
                  'categoryId': selectedCategoryId,
                  'isActive': isActive,
                };
                try {
                  if (product == null) {
                    await ref.read(menuAdminProvider.notifier).createProduct(data);
                  } else {
                    await ref.read(menuAdminProvider.notifier).updateProduct(product.id, data);
                  }
                  if (!ctx.mounted) return;
                  Navigator.pop(ctx);
                } catch (e) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                }
              },
              child: const Text('Save'),
            )
          ],
        ),
      ),
    );
  }

  void _deleteProduct(AdminProduct product) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Delete'),
        content: Text('Are you sure you want to delete ${product.name}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              try {
                await ref.read(menuAdminProvider.notifier).deleteProduct(product.id);
                if (!ctx.mounted) return;
                Navigator.pop(ctx);
              } catch (e) {
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
              }
            },
            child: const Text('Delete'),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(menuAdminProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Products & Menu Management'),
        actions: [
          SizedBox(
            width: 300,
            child: TextField(
              onChanged: (v) => setState(() => _searchQuery = v.toLowerCase()),
              decoration: InputDecoration(
                hintText: 'Search products...',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
              ),
            ),
          ),
          const SizedBox(width: 16),
          ElevatedButton.icon(
            onPressed: () {
              if (state.value != null) {
                _showProductDialog(null, state.value!.categories);
              }
            },
            icon: const Icon(Icons.add),
            label: const Text('Create Product'),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: state.when(
        data: (data) {
          final filteredProducts = data.products.where((p) => p.name.toLowerCase().contains(_searchQuery)).toList();

          if (filteredProducts.isEmpty) {
            return const Center(child: Text('No products found.'));
          }

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: ListView.builder(
              itemCount: filteredProducts.length,
              itemBuilder: (context, index) {
                final product = filteredProducts[index];
                
                // Find category name
                final category = data.categories.where((c) => c.id == product.categoryId).firstOrNull;
                final categoryName = category?.name ?? 'Unknown Category';

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    leading: Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        color: product.isActive ? Colors.orange.withValues(alpha: 0.2) : Colors.grey.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(Icons.restaurant_menu, color: product.isActive ? Colors.orange : Colors.grey),
                    ),
                    title: Text(product.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                    subtitle: Text('Category: $categoryName | Price: ${AppCurrency.format(product.price)}\nBarcode: ${product.barcode ?? "N/A"}'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(product.isActive ? 'Available' : 'Unavailable', style: TextStyle(color: product.isActive ? Colors.green : Colors.grey, fontWeight: FontWeight.bold)),
                        const SizedBox(width: 8),
                        Switch(
                          value: product.isActive, 
                          onChanged: (v) {
                            ref.read(menuAdminProvider.notifier).updateProduct(product.id, {
                              'name': product.name,
                              'price': product.price,
                              'barcode': product.barcode,
                              'categoryId': product.categoryId,
                              'isActive': v,
                            });
                          }
                        ),
                        IconButton(icon: const Icon(Icons.edit, color: Colors.blue), onPressed: () => _showProductDialog(product, data.categories)),
                        IconButton(icon: const Icon(Icons.delete, color: Colors.red), onPressed: () => _deleteProduct(product)),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, st) => Center(child: Text('Error loading products: $e')),
      ),
    );
  }
}
