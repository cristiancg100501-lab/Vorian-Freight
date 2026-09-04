import re

with open('/Users/cristian/Documents/vorian_freight_local/lib/dashboard_page.dart', 'r') as f:
    content = f.read()

# Replace the select query
old_select = ".select('company_id, Company_name, first_name, last_name, rating')"
new_select = ".select('company_id, first_name, last_name, rating, companies(company_name, phone)')"

content = content.replace(old_select, new_select)

# Replace the assignments
old_assignments = """        companyId = res['company_id'];
        companyName = res['Company_name'];
        driverName = res['first_name'] ?? '';"""

new_assignments = """        companyId = res['company_id'];
        if (res['companies'] != null) {
          companyName = res['companies']['company_name'];
          companyPhone = res['companies']['phone'];
        }
        driverName = res['first_name'] ?? '';"""

content = content.replace(old_assignments, new_assignments)

with open('/Users/cristian/Documents/vorian_freight_local/lib/dashboard_page.dart', 'w') as f:
    f.write(content)

print("Patch applied.")
