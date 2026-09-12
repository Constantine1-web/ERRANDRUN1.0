const fs = require('fs');
const path = require('path');

const targetPath = path.join(process.cwd(), 'src/app/dashboard/errands/page.tsx');

let content = fs.readFileSync(targetPath, 'utf8');

// Replace the badge section to include Priority and Bulky tags
const searchStr = `<span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {errand.category.replace('_', ' ')}
                    </span>
                    <Badge
                      variant={isDelivered ? 'success' : isInFlight ? 'info' : 'danger'}
                      className="text-[10px] uppercase font-bold"
                    >
                      {errand.status.replace('_', ' ')}
                    </Badge>`;

const replaceStr = `<span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {errand.category.replace('_', ' ')}
                    </span>
                    <Badge
                      variant={isDelivered ? 'success' : isInFlight ? 'info' : 'danger'}
                      className="text-[10px] uppercase font-bold"
                    >
                      {errand.status.replace('_', ' ')}
                    </Badge>
                    {errand.priority === 'urgent' && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        Express
                      </span>
                    )}
                    {(errand as any).is_bulky && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                        Heavy
                      </span>
                    )}`;

content = content.replace(searchStr, replaceStr);
fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully updated Errands History page to include Priority/Bulky tags');
