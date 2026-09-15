const { createClient } = require('@supabase/supabase-js');

const url = 'https://tdcluqahwkteyijcutee.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkY2x1cWFod2t0ZXlpamN1dGVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzkzOTc1OSwiZXhwIjoyMTAzNTE1NzU5fQ.YIfIxqO67nhgdo3MqlWWEczCkL8GqZAR1uOGVlCVoR4';
const supabase = createClient(url, key);

async function runTrace(operationId) {
    console.log(`🔍 ONE NAIRA STORY TRACE: ${operationId}`);
    const { data, error } = await supabase.rpc('trace_one_naira_story', { p_lookup_id: operationId });
    
    if (error) {
        console.error('❌ Trace failed:', error);
        return;
    }

    if (data.error) {
        console.log('⚠️ Result:', data.error);
        return;
    }

    console.log('\n--- FINANCIAL OPERATION ---');
    console.log(`Type: ${data.financial_operation.operation_type}`);
    console.log(`Status: ${data.financial_operation.status}`);
    console.log(`Amount: ${data.financial_operation.amount_kobo / 100} NGN`);
    
    console.log('\n--- JOURNAL ---');
    console.log(`Status: ${data.journal.status}`);
    console.log(`Description: ${data.journal.description}`);
    
    console.log('\n--- LEDGER LINES ---');
    data.ledger_lines.forEach(line => {
        console.log(`[${line.entry_type}] ${line.account_code} - ${line.account_name} : ${line.amount_kobo / 100} NGN`);
    });

    console.log('\n--- PHASE G OUTBOX EVENTS ---');
    if (data.notification_outbox && data.notification_outbox.length > 0) {
        data.notification_outbox.forEach(o => {
            console.log(`Event: ${o.event_type} | Status: ${o.status}`);
        });
    } else {
        console.log('No connected outbox events.');
    }
}

// Check args
const opId = process.argv[2];
if (opId) {
    runTrace(opId);
} else {
    console.log('Usage: node trace_one_naira.js <operation_id>');
}
