const fs = require('fs');
const path = '/Users/cristian/Downloads/vorian-logistics (2)/src/components/landing-client.tsx';
let content = fs.readFileSync(path, 'utf8');

// Colors to remove/make monochrome
content = content.replace(/bg-blue-500\/10/g, 'bg-foreground/5');
content = content.replace(/bg-green-500\/10/g, 'bg-foreground/5');
content = content.replace(/bg-blue-500\/20/g, 'bg-foreground/10');
content = content.replace(/bg-green-500\/20/g, 'bg-foreground/10');
content = content.replace(/bg-yellow-500\/20/g, 'bg-foreground/10');
content = content.replace(/bg-red-500\/20/g, 'bg-foreground/10');

content = content.replace(/text-blue-500/g, 'text-foreground');
content = content.replace(/text-green-500\/80/g, 'text-foreground/80');
content = content.replace(/text-green-500/g, 'text-foreground');
content = content.replace(/text-green-400/g, 'text-foreground');
content = content.replace(/text-yellow-500/g, 'text-foreground');
content = content.replace(/text-red-500/g, 'text-foreground');
content = content.replace(/text-sky-500/g, 'text-foreground');

content = content.replace(/bg-blue-500/g, 'bg-foreground');
content = content.replace(/bg-green-500/g, 'bg-foreground');
content = content.replace(/bg-red-500/g, 'bg-foreground');

content = content.replace(/from-blue-50 to-indigo-50/g, 'from-muted to-background');

// Glows / Shadows
content = content.replace(/shadow-\[0_0_8px_rgba\(34,197,94,0\.8\)\]/g, 'shadow-md');
content = content.replace(/shadow-\[0_0_15px_#22c55e\]/g, 'shadow-md');
content = content.replace(/shadow-\[0_0_30px_rgba\(34,197,94,0\.15\)\]/g, 'shadow-xl');
content = content.replace(/border-green-500\/30/g, 'border-border');
content = content.replace(/border-yellow-500\/20/g, 'border-border');

// Except the WhatsApp button which is hardcoded #25D366 (Keep this as green as it's brand color for WA)
// And the WA ping animation

fs.writeFileSync(path, content);
console.log("Monochrome replacement complete.");
