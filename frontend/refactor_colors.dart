import 'dart:io';

// ignore_for_file: avoid_print
void main() async {
  final dir = Directory('lib');
  if (!await dir.exists()) return;

  await for (var entity in dir.list(recursive: true)) {
    if (entity is File && entity.path.endsWith('.dart')) {
      var content = await entity.readAsString();
      
      bool changed = false;
      if (content.contains('const Color _primaryColor =')) {
        // We will remove the top color declarations
        content = content.replaceAll(RegExp(r'const Color _[a-zA-Z]+Color = Color\(0xFF[0-9A-Fa-f]+\);.*?\n'), '');
        changed = true;
      }
      
      if (changed || content.contains('_primaryColor')) {
        // Replace variables with Theme.of(context)
        content = content.replaceAll('_primaryColor', 'Theme.of(context).colorScheme.primary');
        content = content.replaceAll('_successColor', 'Theme.of(context).colorScheme.secondary'); // using secondary for success/green
        content = content.replaceAll('_warningColor', 'Colors.orange'); // or Theme.of(context)...
        content = content.replaceAll('_dangerColor', 'Theme.of(context).colorScheme.error');
        content = content.replaceAll('_bgColor', 'Theme.of(context).scaffoldBackgroundColor');
        content = content.replaceAll('_surfaceColor', 'Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface');
        content = content.replaceAll('_borderColor', 'Theme.of(context).dividerColor');
        content = content.replaceAll('_textMainColor', '(Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)');
        content = content.replaceAll('_textMutedColor', '(Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.6) ?? Colors.grey)');
        
        // Remove const from common widgets that might now have non-const colors
        content = content.replaceAll('const Icon(', 'Icon(');
        content = content.replaceAll('const Text(', 'Text(');
        content = content.replaceAll('const TextStyle(', 'TextStyle(');
        content = content.replaceAll('const BoxDecoration(', 'BoxDecoration(');
        content = content.replaceAll('const BorderSide(', 'BorderSide(');
        content = content.replaceAll('const BoxShadow(', 'BoxShadow(');
        content = content.replaceAll('const Divider(', 'Divider(');

        await entity.writeAsString(content);
        print('Updated: ${entity.path}');
      }
    }
  }
}
