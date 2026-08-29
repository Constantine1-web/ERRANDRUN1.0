import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables.');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAuthUser(email, password) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to create auth user ${email}: ${error.message}`);
  }

  return data.user || data;
}

async function insertProfile(userId, fullName, studentId, phoneNumber, role) {
  const { data, error } = await supabase
    .from('profiles')
    .insert([
      {
        id: userId,
        full_name: fullName,
        student_id: studentId,
        phone_number: phoneNumber,
        role,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert profile for ${userId}: ${error.message}`);
  }

  return data;
}

async function insertErrand(requesterId) {
  const { data, error } = await supabase
    .from('errands')
    .insert([
      {
        requester_id: requesterId,
        category: 'campus_errand',
        title: 'Runner E2E Test Errand',
        description: 'Auto-generated errand for runner E2E validation.',
        pickup_location: 'Main Library',
        delivery_location: 'North Dormitory',
        base_fee: 500,
        distance_surcharge: 50,
        queue_complexity_fee: 0,
        weather_surge: 0,
        urgency_multiplier: 1.0,
        total_fee: 600,
        platform_fee: 120,
        runner_amount: 480,
        status: 'unassigned',
        priority: 'normal',
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert errand: ${error.message}`);
  }

  return data;
}

async function main() {
  try {
    console.log('Seeding runner E2E data...');

    const requesterEmail = `requester+${randomUUID()}@example.com`;
    const runnerEmail = `runner+${randomUUID()}@example.com`;
    const password = 'TempPass!234';

    console.log('Creating auth users...');
    const requesterUser = await createAuthUser(requesterEmail, password);
    const runnerUser = await createAuthUser(runnerEmail, password);

    console.log('Inserting profiles...');
    const requesterProfile = await insertProfile(requesterUser.id, 'E2E Requester', `REQ-${Date.now()}`, '+2348000000001', 'user');
    const runnerProfile = await insertProfile(runnerUser.id, 'E2E Runner', `RUN-${Date.now()}`, '+2348000000002', 'runner');

    console.log('Inserting errand...');
    const errand = await insertErrand(requesterProfile.id);

    console.log('\nSeed complete:');
    console.log(`  requesterId: ${requesterProfile.id}`);
    console.log(`  runnerId: ${runnerProfile.id}`);
    console.log(`  errandId: ${errand.id}`);
    console.log(`  runnerEmail: ${runnerEmail}`);
    console.log(`  requesterEmail: ${requesterEmail}`);
    console.log(`  password: ${password}`);
    console.log('\nUse these IDs for the runner E2E test.');
  } catch (err) {
    console.error('Seed failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();