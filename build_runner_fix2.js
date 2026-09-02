const fs = require('fs');
const filePath = 'src/app/dashboard/runner/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/const \[isWithdrawing, setIsWithdrawing\]/g, "const [_isWithdrawing, setIsWithdrawing]");
content = content.replace(/const \[withdrawAmount, setWithdrawAmount\]/g, "const [_withdrawAmount, setWithdrawAmount]");

fs.writeFileSync(filePath, content);
