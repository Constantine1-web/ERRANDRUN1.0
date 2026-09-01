const fs = require('fs');

const path = 'src/app/dashboard/layout.tsx';
let content = fs.readFileSync(path, 'utf8');

const enforceSessionRegex = /\/\/ Enforce session[\s\S]*?useEffect\(\(\) => \{\s*if \(!user\) \{\s*router\.push\('\/login'\);\s*\}\s*\}, \[user, router\]\);/;
content = content.replace(enforceSessionRegex, '');

fs.writeFileSync(path, content);
