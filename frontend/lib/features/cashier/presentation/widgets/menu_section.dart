import '../../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
// lucide_icons removed - using built-in Icons.*
import '../../../../core/widgets/skeleton_loader.dart';

import '../../domain/models/product.dart';
import '../providers/pos_provider.dart';
import '../providers/cart_provider.dart';

// --- Theme Colors ---

class POSMenuSection extends ConsumerWidget {
  final bool shrinkWrap;
  final ScrollPhysics? physics;
  const POSMenuSection({super.key, this.shrinkWrap = false, this.physics});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final posState = ref.watch(posDashboardProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSearchBar(context, ref),
        const SizedBox(height: 16),
        _buildCategoryPills(context, posState, ref),
        const SizedBox(height: 24),
        if (shrinkWrap)
          posState.isLoading
              ? _buildSkeletonGrid(context)
              : posState.errorMessage != null
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 48),
                          const SizedBox(height: 16),
                          Text(posState.errorMessage!, style: GoogleFonts.inter(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    )
                  : _buildProductGrid(context, posState.filteredProducts, ref)
        else
          Expanded(
            child: posState.isLoading
                ? _buildSkeletonGrid(context)
                : posState.errorMessage != null
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 48),
                            const SizedBox(height: 16),
                            Text(posState.errorMessage!, style: GoogleFonts.inter(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      )
                    : _buildProductGrid(context, posState.filteredProducts, ref),
          ),
      ],
    );
  }

  Widget _buildSearchBar(BuildContext context, WidgetRef ref) {
    return TextField(
      onChanged: (val) => ref.read(posDashboardProvider.notifier).updateSearchQuery(val),
      decoration: InputDecoration(
        hintText: 'Search products...',
        hintStyle: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
        prefixIcon: Icon(Icons.search, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
        filled: true,
        fillColor: Theme.of(context).cardTheme.color ?? Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
        contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 20),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide(color: Theme.of(context).dividerColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide(color: Theme.of(context).dividerColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide(color: Theme.of(context).colorScheme.primary),
        ),
      ),
    );
  }

  Widget _buildCategoryPills(BuildContext context, POSDashboardState posState, WidgetRef ref) {
    final categories = posState.categories;
    final selectedCategoryId = posState.selectedCategoryId;
    
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length + 1,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          if (index == 0) {
            final isSelected = selectedCategoryId == null;
            return _CategoryPill(
              title: 'All Items',
              icon: Icons.grid_view,
              isSelected: isSelected,
              onTap: () => ref.read(posDashboardProvider.notifier).selectCategory(null),
            );
          }
          final category = categories[index - 1];
          final isSelected = category.id == selectedCategoryId;
          
          // Map category name to Lucide Icon
          IconData catIcon = Icons.restaurant;
          final catName = category.name.toLowerCase();
          if (catName.contains('pizza')) {
            catIcon = Icons.local_pizza_outlined;
          } else if (catName.contains('burger')) {
            catIcon = Icons.lunch_dining;
          } else if (catName.contains('drink') || catName.contains('beverage')) {
            catIcon = Icons.local_cafe_outlined;
          } else if (catName.contains('dessert')) {
            catIcon = Icons.icecream_outlined;
          }

          return _CategoryPill(
            title: category.name,
            icon: catIcon,
            isSelected: isSelected,
            onTap: () => ref.read(posDashboardProvider.notifier).selectCategory(category.id),
          );
        },
      ),
    );
  }

  Widget _buildSkeletonGrid(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        int crossAxisCount = 2;
        double childAspectRatio = 0.70;
        if (constraints.maxWidth > 1000) { crossAxisCount = 4; childAspectRatio = 0.85; }
        else if (constraints.maxWidth > 600) { crossAxisCount = 3; childAspectRatio = 0.75; }

        return GridView.builder(
          shrinkWrap: shrinkWrap,
          physics: physics,
          padding: const EdgeInsets.only(bottom: 100),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            childAspectRatio: childAspectRatio,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemCount: 8,
          itemBuilder: (context, index) {
            return Container(
              decoration: BoxDecoration(
                color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Theme.of(context).dividerColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(flex: 1, child: SkeletonLoader(borderRadius: 20)),
                  Expanded(
                    flex: 1,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const SkeletonLoader(height: 16, borderRadius: 4),
                          const SkeletonLoader(height: 16, width: 80, borderRadius: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: const [
                              SkeletonLoader(height: 20, width: 60, borderRadius: 4),
                              SkeletonLoader(height: 32, width: 32, borderRadius: 16),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ).animate(onPlay: (controller) => controller.repeat()).shimmer(duration: 1200.ms, color: Colors.white54);
          },
        );
      },
    );
  }

  Widget _buildProductGrid(BuildContext context, List<Product> products, WidgetRef ref) {
    return LayoutBuilder(
      builder: (context, constraints) {
        int crossAxisCount = 2;
        double childAspectRatio = 0.70; 
        
        if (constraints.maxWidth > 1000) {
          crossAxisCount = 4;
          childAspectRatio = 0.85;
        } else if (constraints.maxWidth > 600) {
          crossAxisCount = 3;
          childAspectRatio = 0.75;
        }

        return GridView.builder(
          shrinkWrap: shrinkWrap,
          physics: physics,
          padding: const EdgeInsets.only(bottom: 100),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            childAspectRatio: childAspectRatio,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemCount: products.length,
          itemBuilder: (context, index) {
            final product = products[index];
            return _ProductCard(
              product: product,
              onAdd: () {
                ref.read(cartProvider.notifier).addToCart(product);
              },
            ).animate().fadeIn(duration: 300.ms, delay: (index * 30).ms).slideY(begin: 0.1, end: 0);
          },
        );
      },
    );
  }
}

class _CategoryPill extends StatelessWidget {
  final String title;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _CategoryPill({required this.title, required this.icon, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutQuart,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          decoration: BoxDecoration(
            color: isSelected ? Theme.of(context).colorScheme.primary : (Theme.of(context).cardTheme.color ?? Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: isSelected ? Theme.of(context).colorScheme.primary : Theme.of(context).dividerColor),
            boxShadow: isSelected 
              ? [BoxShadow(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4))] 
              : [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4, offset: const Offset(0, 2))],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18, color: isSelected ? Colors.white : (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
              const SizedBox(width: 8),
              Text(
                title,
                style: GoogleFonts.inter(
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  color: isSelected ? Colors.white : (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black),
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProductCard extends StatefulWidget {
  final Product product;
  final VoidCallback onAdd;

  const _ProductCard({required this.product, required this.onAdd});

  @override
  State<_ProductCard> createState() => _ProductCardState();
}

class _ProductCardState extends State<_ProductCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    IconData productIcon = Icons.restaurant;
    final catName = widget.product.categoryName.toLowerCase();
    if (catName.contains('pizza')) {
      productIcon = Icons.local_pizza_outlined;
    } else if (catName.contains('burger')) {
      productIcon = Icons.lunch_dining;
    } else if (catName.contains('drink') || catName.contains('beverage')) {
      productIcon = Icons.local_cafe_outlined;
    } else if (catName.contains('dessert')) {
      productIcon = Icons.icecream_outlined;
    }

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: widget.product.isAvailable ? widget.onAdd : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOutCubic,
          transform: Matrix4.diagonal3Values(_isHovered && widget.product.isAvailable ? 1.02 : 1.0, _isHovered && widget.product.isAvailable ? 1.02 : 1.0, 1.0),
          transformAlignment: Alignment.center,
          decoration: BoxDecoration(
            color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: _isHovered && widget.product.isAvailable ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.5) : Theme.of(context).dividerColor.withValues(alpha: 0.5), 
              width: _isHovered && widget.product.isAvailable ? 2 : 1
            ),
            boxShadow: [
              if (_isHovered && widget.product.isAvailable)
                BoxShadow(
                  color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.15), 
                  blurRadius: 20, 
                  offset: const Offset(0, 8),
                )
              else
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04), 
                  blurRadius: 10, 
                  offset: const Offset(0, 4),
                )
            ],
          ),
          child: Opacity(
            opacity: widget.product.isAvailable ? 1.0 : 0.5,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Product Image area with Gradient
                Expanded(
                  flex: 3,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          Theme.of(context).colorScheme.primary.withValues(alpha: 0.05),
                          Theme.of(context).colorScheme.primary.withValues(alpha: 0.15),
                        ],
                      ),
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                    ),
                    child: Stack(
                      children: [
                        Center(
                          child: Icon(
                            productIcon, 
                            size: 48, 
                            color: Theme.of(context).colorScheme.primary.withValues(alpha: _isHovered ? 0.8 : 0.5)
                          ).animate(target: _isHovered ? 1 : 0).scale(begin: const Offset(1, 1), end: const Offset(1.1, 1.1)),
                        ),
                        if (!widget.product.isAvailable)
                          Positioned(
                            top: 12,
                            right: 12,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.redAccent.withValues(alpha: 0.9),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                'Out of Stock',
                                style: GoogleFonts.inter(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                          )
                        else if (widget.product.categoryName.isNotEmpty)
                          Positioned(
                            top: 12,
                            left: 12,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.surface.withValues(alpha: 0.8),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
                              ),
                              child: Text(
                                widget.product.categoryName,
                                style: GoogleFonts.inter(
                                  color: Theme.of(context).textTheme.bodySmall?.color ?? Colors.grey,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                // Content area
                Expanded(
                  flex: 2,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          widget.product.name,
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.w700, 
                            fontSize: 13, 
                            color: Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black,
                            height: 1.1,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Flexible(
                              child: Text(
                                AppCurrency.format(widget.product.price),
                                style: GoogleFonts.inter(
                                  color: Theme.of(context).colorScheme.primary,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 16,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: _isHovered && widget.product.isAvailable ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(
                                Icons.add, 
                                size: 18, 
                                color: _isHovered && widget.product.isAvailable ? Colors.white : Theme.of(context).colorScheme.primary
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
