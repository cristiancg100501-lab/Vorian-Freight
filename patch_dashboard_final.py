import re

with open('/Users/cristian/Documents/vorian_freight_local/lib/dashboard_page.dart', 'r') as f:
    content = f.read()

# Fix 1: Replace the select query - remove rating, remove companies join
# The actual columns in userProfiles are: id, email, firstName, lastName, role, rut, address, company_id, Company_name
old_select = ".select('company_id, firstName, lastName, rating, companies(company_name, phone)')"
new_select = ".select('company_id, firstName, lastName')"

content = content.replace(old_select, new_select)

# Fix 2: Replace the company data extraction block  
old_block = """        driverId = uid;
        companyId = res['company_id'];
        if (res['companies'] != null) {
          companyName = res['companies']['company_name'];
          companyPhone = res['companies']['phone'];
        }
        driverName = res['firstName'] ?? '';"""

new_block = """        driverId = uid;
        companyId = res['company_id'];
        driverName = res['firstName'] ?? '';
        
        // Fetch company name from companies table if driver has a company_id
        if (companyId != null) {
          final compRes = await Supabase.instance.client
              .from('companies')
              .select('company_name, phone')
              .eq('id', companyId!)
              .maybeSingle();
          if (compRes != null) {
            companyName = compRes['company_name'];
            companyPhone = compRes['phone'];
          }
        }"""

content = content.replace(old_block, new_block)

with open('/Users/cristian/Documents/vorian_freight_local/lib/dashboard_page.dart', 'w') as f:
    f.write(content)

print("Final patch applied successfully!")
