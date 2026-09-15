const fs = require('fs');

// Admin page UI fix
let admin = fs.readFileSync('src/app/dashboard/admin/page.tsx', 'utf8');

// Add account_status to UserProfile
admin = admin.replace('role: string;', 'role: string;\n  account_status: string;');

// Replace Suspended Filters
admin = admin.replace(`['all', 'student', 'runner', 'suspended'] as const`, `['all', 'student', 'runner', 'suspended'] as const`); // Keep suspended in array for filter

// Fix badge logic
admin = admin.replace(/u\.role === 'suspended' \? 'danger' : u\.role === 'runner'/g, `u.account_status === 'suspended' ? 'danger' : u.role === 'runner'`);

// Fix badge text display
admin = admin.replace(
  /<Badge variant={.*? className="text-\[10px\] uppercase font-bold">\s*\{u\.role\}\s*<\/Badge>/g,
  `<Badge variant={u.account_status === 'suspended' ? 'danger' : u.role === 'runner' ? 'success' : 'info'} className="text-[10px] uppercase font-bold">
    {u.account_status === 'suspended' ? 'suspended' : u.role}
  </Badge>`
);

// Fix condition buttons
admin = admin.replace(/u\.role !== 'suspended'/g, `u.account_status !== 'suspended'`);
admin = admin.replace(/u\.role === 'suspended' \?/g, `u.account_status === 'suspended' ?`);

fs.writeFileSync('src/app/dashboard/admin/page.tsx', admin);

// Fix users API filter
let apiUsers = fs.readFileSync('src/app/api/admin/users/route.ts', 'utf8');
apiUsers = apiUsers.replace(
  `if (role && role !== 'all') {
      query = query.eq('role', role);
    }`,
  `if (role && role !== 'all') {
      if (role === 'suspended') {
        query = query.eq('account_status', 'suspended');
      } else {
        query = query.eq('role', role);
      }
    }`
);
fs.writeFileSync('src/app/api/admin/users/route.ts', apiUsers);
