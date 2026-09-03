import Link from 'next/link';

export default function BecomeARunnerPage() {
  // ── STRIPPED: Awaiting redesign ──
  return (
    <div style={{ maxWidth: '600px', margin: '60px auto', padding: '20px', textAlign: 'center' }}>
      <h1>Become a Runner</h1>
      <p style={{ color: '#666', margin: '16px 0' }}>Join the campus runner network and earn money delivering errands.</p>
      <Link href="/signup?role=runner">Apply Now</Link>
    </div>
  );
}
