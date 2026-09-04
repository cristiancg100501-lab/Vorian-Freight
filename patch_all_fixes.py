import re

# ═══════════════════════════════════════════════════════════
# FIX 1: dashboard_page.dart - Chart bars and km icon in dark mode
# ═══════════════════════════════════════════════════════════
with open('/Users/cristian/Documents/vorian_freight_local/lib/dashboard_page.dart', 'r') as f:
    dash = f.read()

# Fix chart bars - inactive bars in dark mode should be more visible
dash = dash.replace(
    "? (isActive ? VorianColors.pinkStrong : (isDark ? Colors.white24 : Colors.black26))",
    "? (isActive ? VorianColors.pinkStrong : (isDark ? VorianColors.pinkStrong.withOpacity(0.4) : Colors.black26))"
)

# Fix chart zero-value bars visibility in dark mode
dash = dash.replace(
    ": (isDark ? Colors.white12 : Colors.black12),",
    ": (isDark ? Colors.white24 : Colors.black12),"
)

# Fix km icon - make the icon background more prominent in dark mode
dash = dash.replace(
    "decoration: BoxDecoration(color: color.withOpacity(0.15), shape: BoxShape.circle),\n                  child: Icon(icon, color: color, size: 20),",
    "decoration: BoxDecoration(color: color.withOpacity(0.25), shape: BoxShape.circle),\n                  child: Icon(icon, color: color, size: 20),"
)

with open('/Users/cristian/Documents/vorian_freight_local/lib/dashboard_page.dart', 'w') as f:
    f.write(dash)

print("Dashboard chart + icon fixes applied ✓")


# ═══════════════════════════════════════════════════════════
# FIX 2: profile_page.dart - Full name, company name, Vorian logo
# ═══════════════════════════════════════════════════════════
with open('/Users/cristian/Documents/vorian_freight_local/lib/profile_page.dart', 'r') as f:
    prof = f.read()

# Fix fullName to use firstName + lastName instead of full_name
prof = prof.replace(
    "final fullName = _userProfile?['full_name'] ?? 'Conductor';",
    "final fullName = '${_userProfile?['firstName'] ?? ''} ${_userProfile?['lastName'] ?? ''}'.trim();\n    final displayName = fullName.isNotEmpty ? fullName : 'Conductor';"
)

# Fix company fetch - use companies table instead of userProfiles
prof = prof.replace(
    """      Map<String, dynamic>? companyRes;
      if (driverRes != null && driverRes['companyId'] != null) {
        // 3. Fetch company profile
        companyRes = await _supabase
            .from('userProfiles')
            .select()
            .eq('id', driverRes['companyId'])
            .maybeSingle();
      }""",
    """      Map<String, dynamic>? companyRes;
      // Try fetching company from companies table via company_id in userProfile or driverProfile
      final compId = userRes?['company_id'] ?? driverRes?['company_id'] ?? driverRes?['companyId'];
      if (compId != null) {
        companyRes = await _supabase
            .from('companies')
            .select()
            .eq('id', compId)
            .maybeSingle();
      }"""
)

# Fix isCompanyDriver check to also check userProfile company_id
prof = prof.replace(
    "final isCompanyDriver = _driverProfile != null && _driverProfile!['companyId'] != null;",
    "final isCompanyDriver = (_driverProfile != null && _driverProfile!['companyId'] != null) || (_userProfile != null && _userProfile!['company_id'] != null);"
)

# Fix companyName to use company_name from companies table
prof = prof.replace(
    "final companyName = _companyProfile?['full_name'] ?? 'Empresa de Transporte';",
    "final companyName = _companyProfile?['company_name'] ?? _companyProfile?['trade_name'] ?? 'Empresa de Transporte';"
)

# Fix roleText to use displayName
prof = prof.replace(
    "final roleText = isCompanyDriver ? 'Conductor de $companyName' : 'Conductor Independiente';",
    "final roleText = isCompanyDriver ? 'Conductor de $companyName' : 'Conductor Independiente';\n    final profileName = fullName.isNotEmpty ? fullName : 'Conductor';"
)

# Fix _buildHeader - replace the person icon with Vorian logo
prof = prof.replace(
    """            child: Icon(
              Icons.person_rounded, 
              size: 40, 
              color: isCompanyDriver ? Theme.of(context).colorScheme.primary : Colors.white,
            ),""",
    """            child: ClipOval(
              child: Image.asset(
                'assets/images/vorianfreight.png',
                fit: BoxFit.cover,
                width: 80,
                height: 80,
              ),
            ),"""
)

# Fix fullName usage in _buildHeader to use profileName instead
prof = prof.replace(
    "_buildHeader(isDark, fullName, roleText, isCompanyDriver),",
    "_buildHeader(isDark, profileName, roleText, isCompanyDriver),"
)

with open('/Users/cristian/Documents/vorian_freight_local/lib/profile_page.dart', 'w') as f:
    f.write(prof)

print("Profile page fixes applied ✓")
print("All fixes done! Hot restart the app.")
