import re

with open('/Users/cristian/Documents/vorian_freight_local/lib/dashboard_page.dart', 'r') as f:
    content = f.read()

# Replace the select query names
old_select = ".select('company_id, first_name, last_name, rating, companies(company_name, phone)')"
new_select = ".select('company_id, firstName, lastName, rating, companies(company_name, phone)')"

content = content.replace(old_select, new_select)

# Replace the assignment
old_assignment = "driverName = res['first_name'] ?? '';"
new_assignment = "driverName = res['firstName'] ?? '';"

content = content.replace(old_assignment, new_assignment)

with open('/Users/cristian/Documents/vorian_freight_local/lib/dashboard_page.dart', 'w') as f:
    f.write(content)

print("Patch applied.")
