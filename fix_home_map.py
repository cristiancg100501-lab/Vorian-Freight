import re

path = '/Users/cristian/Documents/vorian_freight_local/lib/home_map_page.dart'
with open(path, 'r') as f:
    content = f.read()

# Fix 1: _buildMiniAvailabilityToggle
# From `return const SizedBox.shrink(), // removed toggle` up to the end of the method
fix1_start = "  Widget _buildMiniAvailabilityToggle(bool isDark) {\n    return const SizedBox.shrink(), // removed toggle"
# Find the end of this method. It ends around line 2514: `  }`
# Let's just replace the whole method body.
pattern1 = re.compile(r'  Widget _buildMiniAvailabilityToggle\(bool isDark\) \{\s*return const SizedBox\.shrink\(\), // removed toggle.*?    \);\s*\}', re.DOTALL)
content = pattern1.sub('  Widget _buildMiniAvailabilityToggle(bool isDark) {\n    return const SizedBox.shrink();\n  }', content)

# Fix 2: The toggle pill at 3625
# const SizedBox.shrink(), // removed toggle
#                         curve: Curves.easeInOut,
# ... down to the end of the GestureDetector.
# Let's look at the indentation. The toggle pill is inside a Row.
# It ends at `                          ],` or `                        ),`
pattern2 = re.compile(r'const SizedBox\.shrink\(\), // removed toggle.*?curve: Curves\.easeInOut,.*?(?=\n                    //)', re.DOTALL)
# Wait, let's just match from `const SizedBox.shrink(), // removed toggle` until `                              ),`
# Let's use a simpler approach. I'll replace the chunk based on line numbers or exact strings.
