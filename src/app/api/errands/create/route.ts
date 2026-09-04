import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAuth } from '@/lib/serverAuth';
import { CreateErrandSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';
import { calculatePricing, calculateDistance } from '@/utils/pricing';

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireAuth(req);
    if (authCheck.response) return authCheck.response;

    const requesterId = authCheck.auth.user.id;

    // Rate limit: max 10 errand creations per minute per user
    const ip = getClientIp(req);
    const rate = checkRateLimit(`create-errand:${requesterId || ip}`, 10, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const body = await req.json();
    const parseResult = CreateErrandSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const {
      category,
      title,
      description,
      pickup_location,
      delivery_location,
      pickup_coordinates,
      delivery_coordinates,
      priority,
      has_queue,
      is_bulky,
      notes,
    } = parseResult.data;

    // 1. Calculate distance server-side
    let distanceKm = 1.0;
    if (
      pickup_coordinates?.lat &&
      pickup_coordinates?.lng &&
      delivery_coordinates?.lat &&
      delivery_coordinates?.lng
    ) {
      distanceKm = calculateDistance(
        pickup_coordinates.lat,
        pickup_coordinates.lng,
        delivery_coordinates.lat,
        delivery_coordinates.lng
      );
    }

    // 2. Compute authoritative pricing server-side (prevents price tampering)
    const authoritativePricing = calculatePricing(
      category,
      priority,
      distanceKm,
      has_queue,
      false,
      is_bulky
    );

    const totalFee = authoritativePricing.totalFee;

    // 3. Verify Wallet Balance
    const { data: wallet, error: walletError } = await adminSupabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', requesterId)
      .single();

    if (walletError || !wallet || Number(wallet.balance) < totalFee) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient wallet balance. Required: ₦${totalFee.toLocaleString()}, Available: ₦${Number(wallet?.balance || 0).toLocaleString()}`,
        },
        { status: 400 }
      );
    }

    // 4. Deduct Balance into Escrow Hold
    const newBalance = Number(wallet.balance) - totalFee;
    const { error: balanceError } = await adminSupabase
      .from('wallets')
      .update({ balance: newBalance, last_updated: new Date().toISOString() })
      .eq('user_id', requesterId);

    if (balanceError) {
      console.error('Wallet deduction error:', balanceError);
      return NextResponse.json({ success: false, error: 'Failed to process escrow hold' }, { status: 500 });
    }

    // 5. Generate secure 4-digit delivery PIN (random between 1000 and 9999)
    const crypto = await import('crypto');
    const deliveryPin = crypto.randomInt(1000, 10000).toString();

    const errandPayload = {
      requester_id: requesterId,
      category,
      title,
      description: description || 'No additional notes provided.',
      pickup_location,
      delivery_location,
      pickup_coordinates: pickup_coordinates || null,
      delivery_coordinates: delivery_coordinates || null,
      base_fee: authoritativePricing.baseFee,
      distance_surcharge: authoritativePricing.distanceSurcharge,
      queue_complexity_fee: authoritativePricing.queueComplexityFee,
      weather_surge: authoritativePricing.weatherSurge,
      urgency_multiplier: authoritativePricing.urgencyMultiplier,
      total_fee: totalFee,
      platform_fee: authoritativePricing.platformFee,
      runner_amount: authoritativePricing.runnerAmount,
      priority,
      status: 'unassigned',
      delivery_pin: deliveryPin,
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: errand, error: errandError } = await adminSupabase
      .from('errands')
      .insert([errandPayload])
      .select('id')
      .single();

    if (errandError || !errand) {
      // Rollback escrow deduction on insert failure
      await adminSupabase.from('wallets').update({ balance: wallet.balance }).eq('user_id', requesterId);
      console.error('Errand insert error, balance rolled back:', errandError);
      return NextResponse.json({ success: false, error: 'Failed to create errand' }, { status: 500 });
    }

    // 6. Record Escrow Transaction
    await adminSupabase.from('transactions').insert({
      user_id: requesterId,
      amount: totalFee,
      type: 'escrow_hold',
      status: 'success',
      reference: errand.id,
      description: `Escrow hold for errand #${errand.id.slice(0, 8)}`,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      errandId: errand.id,
      totalFee,
    });
  } catch (error: any) {
    console.error('Errand creation exception:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
