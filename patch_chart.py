with open('/Users/cristian/Documents/vorian_freight_local/lib/dashboard_page.dart', 'r') as f:
    content = f.read()

# 1. Add state variable for selected bar index
content = content.replace(
    "  DateTimeRange? _selectedDateRange;",
    "  DateTimeRange? _selectedDateRange;\n  int _selectedBarIndex = -1;"
)

# 2. Replace the entire _buildActivityChart method with dark mode fix + tap interaction
old_chart = """  Widget _buildActivityChart(bool isDark) {
    const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    int maxVal = 1;
    if (weeklyDeliveriesCount.isNotEmpty) {
      for (int v in weeklyDeliveriesCount) {
        if (v > maxVal) maxVal = v;
      }
    }
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.05) : Colors.white.withOpacity(0.5),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: isDark ? Colors.white.withOpacity(0.1) : Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Entregas", style: GoogleFonts.quicksand(color: isDark ? Colors.white54 : Colors.black54, fontWeight: FontWeight.w600)),
              Text("$totalDeliveries", style: GoogleFonts.quicksand(color: isDark ? Colors.white : Colors.black87, fontWeight: FontWeight.w800, fontSize: 20)),
            ],
          ),
          const Spacer(),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: List.generate(7, (i) {
              final val = weeklyDeliveriesCount[i];
              final heightRatio = val / maxVal;
              return Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Container(
                    width: 12,
                    height: 80 * heightRatio + 4,
                    decoration: BoxDecoration(
                      color: val > 0 ? VorianColors.pinkStrong : (isDark ? Colors.white24 : Colors.black12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(days[i], style: GoogleFonts.quicksand(fontSize: 10, color: isDark ? Colors.white54 : Colors.black54, fontWeight: FontWeight.w700)),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }"""

new_chart = """  Widget _buildActivityChart(bool isDark) {
    const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const fullDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    int maxVal = 1;
    if (weeklyDeliveriesCount.isNotEmpty) {
      for (int v in weeklyDeliveriesCount) {
        if (v > maxVal) maxVal = v;
      }
    }
    
    final accentColor = isDark ? Colors.white : Colors.black87;
    final mutedColor = isDark ? Colors.white54 : Colors.black54;
    final barActiveColor = isDark ? Colors.white : Colors.black87;
    final barInactiveColor = isDark ? Colors.white24 : Colors.black12;
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.05) : Colors.white.withOpacity(0.5),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: isDark ? Colors.white.withOpacity(0.1) : Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Entregas", style: GoogleFonts.quicksand(color: mutedColor, fontWeight: FontWeight.w600)),
              Text("$totalDeliveries", style: GoogleFonts.quicksand(color: accentColor, fontWeight: FontWeight.w800, fontSize: 20)),
            ],
          ),
          // Show selected bar info
          if (_selectedBarIndex >= 0 && _selectedBarIndex < 7)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white.withOpacity(0.1) : Colors.black.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  "${fullDays[_selectedBarIndex]}: ${weeklyDeliveriesCount[_selectedBarIndex]} envío${weeklyDeliveriesCount[_selectedBarIndex] == 1 ? '' : 's'}",
                  style: GoogleFonts.quicksand(
                    color: accentColor,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          const Spacer(),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: List.generate(7, (i) {
              final val = weeklyDeliveriesCount[i];
              final heightRatio = val / maxVal;
              final isSelected = _selectedBarIndex == i;
              return GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedBarIndex = _selectedBarIndex == i ? -1 : i;
                  });
                },
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    // Count label above selected bar
                    if (isSelected && val > 0)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text(
                          "$val",
                          style: GoogleFonts.quicksand(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: accentColor,
                          ),
                        ),
                      ),
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      width: isSelected ? 18 : 12,
                      height: 80 * heightRatio + 4,
                      decoration: BoxDecoration(
                        color: val > 0 
                            ? (isSelected ? VorianColors.green : barActiveColor) 
                            : barInactiveColor,
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      days[i], 
                      style: GoogleFonts.quicksand(
                        fontSize: 10, 
                        color: isSelected ? accentColor : mutedColor, 
                        fontWeight: isSelected ? FontWeight.w800 : FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ),
        ],
      ),
    );
  }"""

content = content.replace(old_chart, new_chart)

with open('/Users/cristian/Documents/vorian_freight_local/lib/dashboard_page.dart', 'w') as f:
    f.write(content)

print("Activity chart dark mode + tap interaction applied ✓")
