import 'dart:io';

// ignore_for_file: avoid_print
void main() async {
  final dir = Directory('lib');
  if (!await dir.exists()) return;

  int count = 0;
  await for (var entity in dir.list(recursive: true)) {
    if (entity is File && entity.path.endsWith('.dart')) {
      final content = await entity.readAsString();
      if (content.contains('plusJakartaSans')) {
        final newContent = content.replaceAll('plusJakartaSans', 'inter');
        await entity.writeAsString(newContent);
        count++;
        print('Updated: ${entity.path}');
      }
    }
  }
  print('Successfully updated $count files to use GoogleFonts.inter.');
}
