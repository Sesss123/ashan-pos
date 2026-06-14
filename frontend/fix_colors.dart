import 'dart:io';

// ignore_for_file: avoid_print
void main() async {
  final dir = Directory('lib');
  if (!await dir.exists()) return;

  await for (var entity in dir.list(recursive: true)) {
    if (entity is File && entity.path.endsWith('.dart')) {
      var content = await entity.readAsString();
      bool changed = false;

      // Fix const Color Theme.of(context)... = Colors.white;
      final badLine1 = RegExp(r'const Color Theme\.of\(context\).*? = Colors\.white;\n');
      if (content.contains(badLine1)) {
        content = content.replaceAll(badLine1, '');
        changed = true;
      }
      
      // Fix _infoColor
      if (content.contains('_infoColor')) {
        content = content.replaceAll('_infoColor', 'Theme.of(context).colorScheme.tertiary');
        changed = true;
      }

      if (changed) {
        await entity.writeAsString(content);
        print('Fixed: ${entity.path}');
      }
    }
  }
}
