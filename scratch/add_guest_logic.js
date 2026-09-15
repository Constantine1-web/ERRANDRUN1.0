const fs = require('fs');

const path = 'src/app/api/errands/create/route.ts';
let c = fs.readFileSync(path, 'utf8');

const insertionBlock = `
    if (errandError || !errand) {
      // Rollback escrow deduction on insert failure
      await adminSupabase.from('wallets').update({ balance: wallet.balance }).eq('user_id', requesterId);
      console.warn('Errand insert error, balance rolled back:', errandError);
      return NextResponse.json({ success: false, error: 'Failed to create errand' }, { status: 500 });
    }

    // --- PHASE G: GUEST RECIPIENT HANDLING ---
    if (parseResult.data.guest_name) {
      const crypto = await import('crypto');
      const rawToken = crypto.randomBytes(24).toString('base64url');
      const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { error: guestError } = await adminSupabase.rpc('insert_guest_and_outbox', {
        p_errand_id: errand.id,
        p_name: parseResult.data.guest_name,
        p_email: parseResult.data.guest_email || null,
        p_phone: parseResult.data.guest_phone || null,
        p_raw_token: rawToken,
        p_hash: hash,
        p_expires_at: expiresAt
      });
      
      if (guestError) {
        console.error('Failed to create guest recipient or outbox event:', guestError);
      }
    }
    // -----------------------------------------
`;

c = c.replace(/    if \(errandError \|\| !errand\) \{[\s\S]*?    \}/, insertionBlock.trim());

fs.writeFileSync(path, c);
console.log('Done patching route.');
