with open('/Users/cristian/Documents/vorian_freight_local/lib/profile_page.dart', 'r') as f:
    prof = f.read()

# Replace the entire _loadProfileData try block with better error handling per query
old_try = """    try {
      final user = _supabase.auth.currentUser;
      if (user == null) return;

      // 1. Fetch userProfile
      final userRes = await _supabase
          .from('userProfiles')
          .select()
          .eq('id', user.id)
          .maybeSingle();
      
      // 2. Fetch driverProfile
      final driverRes = await _supabase
          .from('driverProfiles')
          .select()
          .eq('id', user.id)
          .maybeSingle();

      Map<String, dynamic>? companyRes;
      // Try fetching company from companies table via company_id in userProfile or driverProfile
      final compId = userRes?['company_id'] ?? driverRes?['company_id'] ?? driverRes?['companyId'];
      if (compId != null) {
        companyRes = await _supabase
            .from('companies')
            .select()
            .eq('id', compId)
            .maybeSingle();
      }

      // 4. Fetch assigned vehicle
      final vehicleRes = await _supabase
          .from('vehicles')
          .select()
          .eq('driverId', user.id)
          .maybeSingle();

      if (mounted) {
        setState(() {
          _userProfile = userRes;
          _driverProfile = driverRes;
          _companyProfile = companyRes;
          _vehicle = vehicleRes;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint("Error loading profile: $e");
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }"""

new_try = """    final user = _supabase.auth.currentUser;
    if (user == null) return;

    Map<String, dynamic>? userRes;
    Map<String, dynamic>? driverRes;
    Map<String, dynamic>? companyRes;
    Map<String, dynamic>? vehicleRes;

    // 1. Fetch userProfile (only safe columns)
    try {
      userRes = await _supabase
          .from('userProfiles')
          .select('id, email, firstName, lastName, role, rut, phone, company_id')
          .eq('id', user.id)
          .maybeSingle();
      debugPrint("ProfilePage userRes: $userRes");
    } catch (e) {
      debugPrint("Error fetching userProfile: $e");
    }

    // 2. Fetch driverProfile
    try {
      driverRes = await _supabase
          .from('driverProfiles')
          .select()
          .eq('id', user.id)
          .maybeSingle();
      debugPrint("ProfilePage driverRes: $driverRes");
    } catch (e) {
      debugPrint("Error fetching driverProfile: $e");
    }

    // 3. Fetch company from companies table
    try {
      final compId = userRes?['company_id'] ?? driverRes?['company_id'] ?? driverRes?['companyId'];
      debugPrint("ProfilePage compId: $compId");
      if (compId != null) {
        companyRes = await _supabase
            .from('companies')
            .select('id, company_name, trade_name, phone')
            .eq('id', compId)
            .maybeSingle();
        debugPrint("ProfilePage companyRes: $companyRes");
      }
    } catch (e) {
      debugPrint("Error fetching company: $e");
    }

    // 4. Fetch assigned vehicle
    try {
      vehicleRes = await _supabase
          .from('vehicles')
          .select()
          .eq('driverId', user.id)
          .maybeSingle();
    } catch (e) {
      debugPrint("Error fetching vehicle: $e");
    }

    if (mounted) {
      setState(() {
        _userProfile = userRes;
        _driverProfile = driverRes;
        _companyProfile = companyRes;
        _vehicle = vehicleRes;
        _isLoading = false;
      });
    }"""

prof = prof.replace(old_try, new_try)

with open('/Users/cristian/Documents/vorian_freight_local/lib/profile_page.dart', 'w') as f:
    f.write(prof)

print("Profile page debug patch applied ✓")
