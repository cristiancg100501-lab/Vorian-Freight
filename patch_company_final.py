with open('/Users/cristian/Documents/vorian_freight_local/lib/profile_page.dart', 'r') as f:
    prof = f.read()

old_block = """    // 3. Fetch company info
    try {
      final compId = userRes?['company_id'] ?? driverRes?['company_id'] ?? driverRes?['companyId'];
      debugPrint("ProfilePage compId: $compId");
      if (compId != null) {
        // Try companies table first
        companyRes = await _supabase
            .from('companies')
            .select('id, company_name, trade_name, phone')
            .eq('id', compId)
            .maybeSingle();
        debugPrint("ProfilePage companyRes (companies): $companyRes");

        // Fallback: try companyProfiles table
        if (companyRes == null) {
          try {
            final cpRes = await _supabase
                .from('companyProfiles')
                .select()
                .eq('id', compId)
                .maybeSingle();
            debugPrint("ProfilePage companyRes (companyProfiles): $cpRes");
            if (cpRes != null) {
              companyRes = {
                'company_name': cpRes['companyName'] ?? cpRes['company_name'] ?? 'Empresa',
                'phone': cpRes['phone'],
              };
            }
          } catch (e2) {
            debugPrint("Error fetching companyProfiles fallback: $e2");
          }
        }
      }
    } catch (e) {
      debugPrint("Error fetching company: $e");
    }"""

new_block = """    // 3. Fetch company info - try multiple sources
    try {
      // Priority: driverProfiles.companyId > userProfiles.company_id
      final compId = driverRes?['companyId'] ?? driverRes?['company_id'] ?? userRes?['company_id'];
      debugPrint("ProfilePage compId: $compId");
      if (compId != null) {
        // First try companyProfiles (old table, matches driverProfiles.companyId)
        try {
          final cpRes = await _supabase
              .from('companyProfiles')
              .select()
              .eq('id', compId)
              .maybeSingle();
          debugPrint("ProfilePage companyProfiles result: $cpRes");
          if (cpRes != null) {
            companyRes = {
              'company_name': cpRes['companyName'] ?? cpRes['company_name'] ?? 'Empresa',
              'phone': cpRes['phone'],
            };
          }
        } catch (e2) {
          debugPrint("companyProfiles lookup failed: $e2");
        }

        // If not found, try companies table
        if (companyRes == null) {
          try {
            companyRes = await _supabase
                .from('companies')
                .select('id, company_name, trade_name, phone')
                .eq('id', compId)
                .maybeSingle();
            debugPrint("ProfilePage companies result: $companyRes");
          } catch (e3) {
            debugPrint("companies lookup failed: $e3");
          }
        }
      }
      debugPrint("ProfilePage FINAL companyRes: $companyRes");
    } catch (e) {
      debugPrint("Error fetching company: $e");
    }"""

prof = prof.replace(old_block, new_block)

with open('/Users/cristian/Documents/vorian_freight_local/lib/profile_page.dart', 'w') as f:
    f.write(prof)

print("Company lookup order fixed ✓")
