const fs = require('fs');

function fixFile(path, replacements) {
    let content = fs.readFileSync(path, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(path, content);
}

// 1. Create Route
fixFile('src/app/api/errands/create/route.ts', [
    [/description: \\Escrow hold for errand #\\\\/g, "description: 'Escrow hold for errand #' + errand.id"],
    [/description: 'Escrow hold for errand #' \+ errand\.id\\/g, "description: 'Escrow hold for errand #' + errand.id"]
]);

// 2. Complete Route
fixFile('src/app/api/tracking/complete/route.ts', [
    [/description: \\Payout for completing errand #\\\\/g, "description: 'Payout for completing errand #' + errandId"],
    [/description: \\Platform fee for errand #\\\\/g, "description: 'Platform fee for errand #' + errandId"]
]);

// 3. Verify Route
fixFile('src/app/api/wallet/verify/route.ts', [
    [/fetch\(\\https:\/\/api\.paystack\.co\/transaction\/verify\/\\\\/g, "fetch('https://api.paystack.co/transaction/verify/' + reference"],
    [/Authorization: \\Bearer \\\\/g, "Authorization: 'Bearer ' + paystackSecretKey"]
]);

// 4. New Page
fixFile('src/app/dashboard/errands/new/page.tsx', [
    [/router\.push\(\/dashboard\/user\/errand\/ \+ data\.errandId\);/g, "router.push('/dashboard/user/errand/' + data.errandId);"]
]);
