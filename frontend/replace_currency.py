import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # Needs import if we are replacing anything
    needs_import = False

    # Regex patterns
    # 1. '\$${something.toStringAsFixed(2)}' -> '${AppCurrency.format(something)}'
    pattern1 = re.compile(r"'\$\$\{([^}]+)\.toStringAsFixed\(2\)\}'")
    def repl1(match):
        return f"AppCurrency.format({match.group(1)})"

    # 2. '\$${something}' -> '${AppCurrency.format(something)}'
    pattern2 = re.compile(r"'\$\$\{([^}]+)\}'")
    def repl2(match):
        return f"AppCurrency.format({match.group(1)})"
        
    # 3. 'Rs. ${something.toStringAsFixed(2)}' -> '${AppCurrency.format(something)}'
    pattern3 = re.compile(r"'Rs\.? ?\$\{([^}]+)\.toStringAsFixed\(2\)\}'")
    def repl3(match):
        return f"AppCurrency.format({match.group(1)})"

    # 4. 'Rs. ${something}' -> '${AppCurrency.format(something)}'
    pattern4 = re.compile(r"'Rs\.? ?\$\{([^}]+)\}'")
    def repl4(match):
        return f"AppCurrency.format({match.group(1)})"
        
    # Apply replacements
    # Need to be careful because we want to replace the whole string if it's just the currency
    # Wait, sometimes it's part of a larger string like: 'Total Sales: \$${total.toStringAsFixed(2)}'
    # It's better to just replace the \$${...} part with ${AppCurrency.format(...)}
    
    # Let's redefine the replacements to work within strings
    # \$\$\{([^}]+)\.toStringAsFixed\(2\)\} -> \$\{AppCurrency.format(\1)\}
    
    # 1. \$\$\{something.toStringAsFixed(2)\} -> \$\{AppCurrency.format(something)\}
    p1 = re.compile(r"\\\$\$\{([^}]+)\.toStringAsFixed\(2\)\}")
    content, c1 = p1.subn(r"${AppCurrency.format(\1)}", content)
    
    # 2. \$\$\{something\} -> \$\{AppCurrency.format(something)\}
    p2 = re.compile(r"\\\$\$\{([^}]+)\}")
    content, c2 = p2.subn(r"${AppCurrency.format(\1)}", content)
    
    # 3. Rs. \$\{something.toStringAsFixed(2)\} -> \$\{AppCurrency.format(something)\}
    p3 = re.compile(r"Rs\.? ?\$\{([^}]+)\.toStringAsFixed\(2\)\}")
    content, c3 = p3.subn(r"${AppCurrency.format(\1)}", content)
    
    # 4. Rs. \$\{something\} -> \$\{AppCurrency.format(something)\}
    p4 = re.compile(r"Rs\.? ?\$\{([^}]+)\}")
    content, c4 = p4.subn(r"${AppCurrency.format(\1)}", content)

    # 5. \$something (hardcoded numbers like \$12.00) -> \$\{AppCurrency.format(12.00)\}
    p5 = re.compile(r"\\\$([0-9]+\.[0-9]{2})")
    content, c5 = p5.subn(r"${AppCurrency.format(\1)}", content)
    
    # 6. Rs. something (hardcoded numbers)
    p6 = re.compile(r"Rs\.? ?([0-9]+\.[0-9]{2})")
    content, c6 = p6.subn(r"${AppCurrency.format(\1)}", content)

    if content != original_content:
        # Calculate import path
        # Assuming we're in some lib/features/... folder, we need to import lib/core/utils/app_currency.dart
        # A simple hack is just an absolute package import or calculating relative
        import_stmt = "import 'package:ashn_pos_frontend/core/utils/app_currency.dart';"
        
        # We will use absolute package import if possible, but package name is not known for sure.
        # Let's find out how deep we are
        depth = filepath.replace('\\', '/').split('/lib/')[1].count('/')
        rel_path = '../' * depth + 'core/utils/app_currency.dart'
        import_stmt = f"import '{rel_path}';"
        
        if "app_currency.dart" not in content:
            # insert import after first import
            if "import" in content:
                content = content.replace("import ", f"{import_stmt}\nimport ", 1)
            else:
                content = f"{import_stmt}\n{content}"
                
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

def main():
    lib_dir = os.path.join(os.path.dirname(__file__), 'lib')
    for root, dirs, files in os.walk(lib_dir):
        for file in files:
            if file.endswith('.dart') and file != 'app_currency.dart' and file != 'currency_provider.dart':
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
