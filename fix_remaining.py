import os
import re

files_to_update = [
    'src/app/page.tsx',
    'src/components/company-section.tsx',
    'src/components/faq.tsx',
    'src/components/galactic-cta.tsx',
    'src/components/footer.tsx'
]

replacements = [
    (r'bg-black/50', 'bg-zinc-100'),
    (r'border-white/5', 'border-zinc-200'),
    (r'bg-zinc-800/80', 'bg-zinc-100/80'),
    (r'shadow-\[0_0_8px_rgba\(34,197,94,0\.6\)\]', 'shadow-sm'),
    (r'shadow-\[0_0_8px_rgba\(34,197,94,0\.8\)\]', 'shadow-sm'),
    (r'border-\[\#1a1a1a\]', 'border-white'),
    (r'shadow-\[0_0_15px_\#ffffff\]', 'shadow-[0_0_15px_rgba(0,0,0,0.1)]'),
    (r'bg-\[\#1a1a1a\]', 'bg-white'),
]

for filepath in files_to_update:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        content = f.read()
    
    for pattern, repl in replacements:
        content = re.sub(pattern, repl, content)
        
    with open(filepath, 'w') as f:
        f.write(content)

print("Fixed remaining files")
