const fs = require('fs');
const filePath = 'src/app/dashboard/runner/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/.*const \[categoryFilter, setCategoryFilter\].*\n?/g, "");
content = content.replace(/.*const \[priorityFilter, setPriorityFilter\].*\n?/g, "");

fs.writeFileSync(filePath, content);
