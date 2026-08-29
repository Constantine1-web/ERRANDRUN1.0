const baseUrl = process.env.APP_URL || 'http://localhost:3000';
const errandId = process.env.ERRAND_ID;
const runnerId = process.env.RUNNER_ID;

if (!errandId || !runnerId) {
  console.error('Please set ERRAND_ID and RUNNER_ID environment variables.');
  process.exit(1);
}

async function run() {
  try {
    console.log('Starting runner end-to-end validation...');

    const acceptResponse = await fetch(`${baseUrl}/api/errands/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errandId, runnerId }),
    });

    const acceptBody = await acceptResponse.json();
    console.log('Accept endpoint response:', acceptBody);

    if (!acceptResponse.ok || !acceptBody.success) {
      throw new Error(`Accept failed: ${acceptBody.error || acceptResponse.statusText}`);
    }

    const tasksResponse = await fetch(`${baseUrl}/api/runner/tasks?runnerId=${runnerId}`);
    const tasksBody = await tasksResponse.json();
    console.log('Runner tasks endpoint response:', tasksBody);

    if (!tasksResponse.ok || !tasksBody.success) {
      throw new Error(`Task list failed: ${tasksBody.error || tasksResponse.statusText}`);
    }

    console.log('Runner E2E validation succeeded. Active tasks count:', tasksBody.tasks?.length ?? 0);
  } catch (error) {
    console.error('Runner E2E validation failed:', error);
    process.exit(1);
  }
}

run();
