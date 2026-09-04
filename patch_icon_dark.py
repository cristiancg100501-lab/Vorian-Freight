with open('/Users/cristian/Documents/vorian_freight_local/lib/dashboard_page.dart', 'r') as f:
    content = f.read()

# Fix the icon and its background circle in _glassMetricCard to be visible in dark mode
old_icon = """                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: color.withOpacity(0.25), shape: BoxShape.circle),
                  child: Icon(icon, color: color, size: 20),
                ),"""

new_icon = """                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white.withOpacity(0.1) : color.withOpacity(0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: isDark ? Colors.white : color, size: 20),
                ),"""

content = content.replace(old_icon, new_icon)

with open('/Users/cristian/Documents/vorian_freight_local/lib/dashboard_page.dart', 'w') as f:
    f.write(content)

print("Icon dark mode fix applied ✓")
