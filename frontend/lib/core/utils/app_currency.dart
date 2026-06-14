class AppCurrency {
  static String symbol = '\$';
  
  static String format(num amount) {
    final isRupee = symbol.toLowerCase() == 'rs' || symbol.toLowerCase() == 'lkr';
    final space = isRupee ? ' ' : '';
    return '$symbol$space${amount.toStringAsFixed(2)}';
  }
}
