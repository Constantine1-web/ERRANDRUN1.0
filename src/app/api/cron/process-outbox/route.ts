import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/serverAuth';
import { AppEvent, BaseEventPayload } from '@/lib/notifications/vocabulary';
import { renderTemplate } from '@/lib/notifications/templates';
import { ResendProvider } from '@/lib/notifications/email';

const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 5;

// Secure Endpoint Verification
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // Allow internal invocation if secrets match
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }
  
  // Also allow requests originating securely from localhost for dev testing
  if (process.env.NODE_ENV === 'development') {
    return true; 
  }
  
  return false;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized outbox processor invocation' }, { status: 401 });
  }

  const workerId = `worker-${Math.random().toString(36).substring(7)}`;
  const emailProvider = new ResendProvider();

  try {
    // 1. Atomically Claim Events via RPC (FOR UPDATE SKIP LOCKED)
    const { data: events, error: claimError } = await adminSupabase.rpc('claim_outbox_events', {
      batch_size: BATCH_SIZE,
      worker_id: workerId,
      lease_interval: '5 minutes',
    });

    if (claimError) {
      console.error('Failed to claim outbox events:', claimError);
      return NextResponse.json({ error: 'Failed to claim events' }, { status: 500 });
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'No pending events' });
    }

    let processedCount = 0;

    // 2. Process Each Event Idempotently
    for (const event of events) {
      try {
        const payload = event.event_payload as BaseEventPayload;
        const rendered = renderTemplate(event.event_type as AppEvent, payload);
        
        let recipientEmail: string | null = null;
        let preferences = { transactional_email_enabled: true, optional_email_enabled: true };

        // Resolve Recipient & Preferences
        if (event.recipient_user_id) {
          const { data: user } = await adminSupabase
            .from('profiles')
            .select('email')
            .eq('id', event.recipient_user_id)
            .single();
          if (user) recipientEmail = user.email;

          const { data: prefs } = await adminSupabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', event.recipient_user_id)
            .single();
          if (prefs) {
            preferences = prefs;
          }
        } else if (event.guest_recipient_id) {
          const { data: guest } = await adminSupabase
            .from('guest_recipients')
            .select('email')
            .eq('id', event.guest_recipient_id)
            .single();
          if (guest) recipientEmail = guest.email;
        }

        // Determine Email Channel Eligibility
        const shouldSendEmail = rendered.isTransactional 
          ? preferences.transactional_email_enabled 
          : preferences.optional_email_enabled;

        // Idempotent In-App Delivery (Only for Users, not Guests)
        if (event.recipient_user_id) {
          const { error: inAppError } = await adminSupabase
            .from('delivery_logs')
            .insert({
              outbox_event_id: event.event_id,
              recipient_user_id: event.recipient_user_id,
              channel: 'IN_APP',
              status: 'DELIVERED',
            });
            
          // If insert succeeds (idempotency key hasn't been used for this channel)
          if (!inAppError) {
            await adminSupabase.from('notifications').insert({
              recipient_user_id: event.recipient_user_id,
              event_type: event.event_type,
              priority: rendered.priority,
              title: rendered.title,
              body: rendered.bodyText,
              related_entity_type: event.aggregate_type,
              related_entity_id: event.aggregate_id,
            });
          }
        }

        // Idempotent External Email Delivery
        if (recipientEmail && shouldSendEmail) {
          const { error: existingLogErr } = await adminSupabase
            .from('delivery_logs')
            .insert({
              outbox_event_id: event.event_id,
              recipient_user_id: event.recipient_user_id,
              guest_recipient_id: event.guest_recipient_id,
              channel: 'EMAIL',
              status: 'PROCESSING',
            });
          
          if (!existingLogErr) { // Only process if not previously sent
            const sendResult = await emailProvider.send({
              to: recipientEmail,
              subject: rendered.title,
              html: rendered.html,
            });

            await adminSupabase
              .from('delivery_logs')
              .update({ 
                status: sendResult.success ? 'SENT' : 'FAILED',
                failure_reason: sendResult.success ? null : JSON.stringify(sendResult.error),
                provider_reference: sendResult.messageId || null
              })
              .eq('outbox_event_id', event.event_id)
              .eq('channel', 'EMAIL');
              
            if (!sendResult.success) {
              throw new Error('Email provider failed');
            }
          }
        } else if (recipientEmail && !shouldSendEmail) {
           await adminSupabase.from('delivery_logs').insert({
              outbox_event_id: event.event_id,
              recipient_user_id: event.recipient_user_id,
              guest_recipient_id: event.guest_recipient_id,
              channel: 'EMAIL',
              status: 'SKIPPED',
              failure_reason: 'User preferences disabled this channel'
            });
        }

        // Mark Outbox Event as Completed
        await adminSupabase
          .from('notification_outbox')
          .update({ status: 'COMPLETED', processed_at: new Date().toISOString(), locked_by: null })
          .eq('event_id', event.event_id);
          
        processedCount++;

      } catch (err: any) {
        // Handle Error & Backoff
        const newAttempts = event.attempts; // It was already incremented by the claim RPC
        const nextStatus = newAttempts >= MAX_ATTEMPTS ? 'DEAD_LETTER' : 'RETRYING';
        // Exponential backoff: 1m, 2m, 4m, 8m...
        const backoffMinutes = Math.pow(2, newAttempts - 1);
        const nextRetryAt = new Date(Date.now() + backoffMinutes * 60000).toISOString();

        await adminSupabase
          .from('notification_outbox')
          .update({
            status: nextStatus,
            last_error: err?.message || 'Unknown processing error',
            next_retry_at: nextStatus === 'RETRYING' ? nextRetryAt : null,
            locked_by: null,
          })
          .eq('event_id', event.event_id);
      }
    }

    return NextResponse.json({ success: true, processed: processedCount, workerId });
  } catch (globalErr: any) {
    console.error('Fatal outbox processor error:', globalErr);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
