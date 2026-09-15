const { createClient } = require('@supabase/supabase-js');

const url = 'https://tdcluqahwkteyijcutee.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkY2x1cWFod2t0ZXlpamN1dGVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzkzOTc1OSwiZXhwIjoyMTAzNTE1NzU5fQ.YIfIxqO67nhgdo3MqlWWEczCkL8GqZAR1uOGVlCVoR4';
const supabase = createClient(url, key);

async function runAudit() {
    console.log('--- ERRANDRUN WALLET AUDIT (PRE-MIGRATION) ---');

    const { data: wallets, error } = await supabase.from('wallets').select('*');
    if (error) {
        console.error('Error fetching wallets:', error);
        return;
    }

    let totalPositive = 0;
    let totalNegative = 0;
    let negativeCount = 0;
    let zeroCount = 0;
    let totalValue = 0;

    console.log(`Total Wallets Scanned: ${wallets.length}`);

    wallets.forEach(w => {
        const bal = Number(w.balance);
        if (bal < 0) {
            console.log(`[WARNING] Negative Balance Detected: Wallet ${w.id} (User: ${w.user_id}) -> ${bal}`);
            negativeCount++;
            totalNegative += bal;
        } else if (bal > 0) {
            totalPositive += bal;
            totalValue += bal;
        } else {
            zeroCount++;
        }
    });

    console.log('\n--- SUMMARY ---');
    console.log(`Wallets with Positive Balance: ${wallets.length - negativeCount - zeroCount} (Sum: ₦${totalPositive})`);
    console.log(`Wallets with Zero Balance: ${zeroCount}`);
    console.log(`Wallets with Negative Balance: ${negativeCount} (Sum: ₦${totalNegative})`);
    
    // Check duplicates
    const userMap = new Map();
    let duplicates = 0;
    wallets.forEach(w => {
        if (userMap.has(w.user_id)) {
            console.log(`[CRITICAL] Duplicate Wallet for User ${w.user_id}`);
            duplicates++;
        }
        userMap.set(w.user_id, true);
    });

    if (duplicates === 0) {
        console.log('✅ No duplicate wallets detected.');
    }
    
    console.log('----------------------------------------------');
}

runAudit();
