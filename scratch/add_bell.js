const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/layout.tsx','utf8');
if (!c.includes('NotificationBell')) {
  c = c.replace('import {', "import { NotificationBell } from '@/components/ui/NotificationBell';\nimport {");
}

// Replace mobile bell
c = c.replace(/<button className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">[\s\S]*?<\/button>/, "<NotificationBell userId={user?.id || ''} />");

// Replace desktop bell
c = c.replace(/<button className="relative p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 \nrounded-full">[\s\S]*?<\/button>/, "<NotificationBell userId={user?.id || ''} />");

// In case the newline in the desktop bell was slightly different
c = c.replace(/<button className="relative p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">[\s\S]*?<\/button>/, "<NotificationBell userId={user?.id || ''} />");

fs.writeFileSync('src/app/dashboard/layout.tsx', c);
console.log('Replaced bell');
