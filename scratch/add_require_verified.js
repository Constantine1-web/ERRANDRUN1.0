const fs = require('fs');
let c = fs.readFileSync('src/lib/serverAuth.ts', 'utf8');

if (!c.includes('export async function requireVerifiedStudent')) {
  c += `
/**
 * Enforces that the request caller is a verified student or admin.
 */
export async function requireVerifiedStudent(
  request: NextRequest
): Promise<{ auth: AuthContext; response?: never } | { auth?: never; response: NextResponse }> {
  const authResult = await requireAuth(request);
  if (authResult.response) {
    return authResult;
  }

  const { auth } = authResult;
  if (auth.profile?.verification_status !== 'verified' && auth.profile?.role !== 'admin') {
    return {
      response: NextResponse.json(
        { success: false, error: 'Forbidden: Verified student status required' },
        { status: 403 }
      ),
    };
  }

  return { auth };
}
`;
  fs.writeFileSync('src/lib/serverAuth.ts', c);
}
