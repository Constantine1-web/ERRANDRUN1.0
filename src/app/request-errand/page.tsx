import Link from 'next/link';

export default function RequestErrandPage() {
  // ── STRIPPED: Awaiting redesign ──
  return (
    <div style={{ maxWidth: '600px', margin: '60px auto', padding: '20px', textAlign: 'center' }}>
      <h1>Request an Errand</h1>
      <p style={{ color: '#666', margin: '16px 0' }}>Post a task and let a verified campus runner handle it for you.</p>
      <Link href="/signup?role=user">Get Started</Link>
    </div>
  );
}
