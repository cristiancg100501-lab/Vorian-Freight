import os
import re

files_to_update = [
    'src/app/page.tsx',
    'src/components/company-section.tsx',
    'src/components/faq.tsx',
    'src/components/galactic-cta.tsx',
    'src/components/footer.tsx',
    'src/components/landing-map.tsx'
]

replacements = [
    (r'bg-\[\#1c1c1c\]', 'bg-zinc-50'),
    (r'bg-\[\#101010\]', 'bg-white'),
    (r'bg-\[\#1a1a1a\]', 'bg-white'),
    (r'bg-\[\#0a0a0a\]', 'bg-white'),
    (r'bg-\[\#141414\]', 'bg-zinc-50'),
    (r'bg-\[\#171717\]', 'bg-zinc-50'),
    (r'bg-\[\#0d0d0d\]', 'bg-white'),
    (r'bg-\[\#121212\]', 'bg-zinc-50'),
    (r'bg-\[\#252525\]', 'bg-white'),
    
    (r'border-zinc-800/50', 'border-zinc-200'),
    (r'border-zinc-800', 'border-zinc-200'),
    (r'border-zinc-700', 'border-zinc-300'),
    
    (r'text-white', 'text-zinc-900'),
    (r'text-zinc-400', 'text-zinc-600'),
    (r'text-zinc-300', 'text-zinc-700'),
    (r'text-zinc-200', 'text-zinc-800'),
    (r'text-zinc-500', 'text-zinc-500'),
    
    (r'bg-zinc-800', 'bg-zinc-100'),
    (r'bg-zinc-900', 'bg-zinc-50'),
    (r'bg-zinc-700', 'bg-zinc-200'),
    
    (r'shadow-\[0_0_15px_rgba\(0,0,0,0\.5\)\]', 'shadow-sm'),
    (r'shadow-\[0_0_20px_rgba\(255,255,255,0\.15\)\]', 'shadow-md'),
    
    (r'bg-white text-black hover:bg-zinc-200', 'bg-zinc-900 text-white hover:bg-zinc-800'),
    (r'text-transparent bg-clip-text bg-gradient-to-r from-zinc-400 to-white', 'text-transparent bg-clip-text bg-gradient-to-r from-zinc-600 to-zinc-900'),
    
    (r'theme="dark"', 'theme="light"'),
    (r'from-\[\#1c1c1c\]', 'from-zinc-50'),
    (r'to-\[\#101010\]', 'to-white'),
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

print("Updated files successfully")
