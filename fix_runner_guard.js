const fs = require('fs');

// 1. Fix RunnerGuard.tsx
const pathRunnerGuard = 'src/components/guards/RunnerGuard.tsx';
let contentRunnerGuard = fs.readFileSync(pathRunnerGuard, 'utf8');

// We want to wait for checking to finish before redirecting
contentRunnerGuard = contentRunnerGuard.replace(
  /useEffect\(\(\) => \{[\s\S]*?\}, \[user, router\]\);/,
  useEffect(() => {
    // Wait a brief moment for hydration or just check session directly
    const verify = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/login');
        return;
      }
      if (user) {
        if (user.role !== 'runner') {
          router.replace('/dashboard/user');
          return;
        }
        setChecking(false);
      } else {
        // user not in store yet, let layout.tsx handle the fetch
        setTimeout(() => setChecking(false), 1500); 
      }
    };
    verify();
  }, [user, router]);
);
contentRunnerGuard = "import { supabase } from '@/lib/supabaseClient';\n" + contentRunnerGuard;
fs.writeFileSync(pathRunnerGuard, contentRunnerGuard);

// 2. Fix api/runners/capacity/route.ts TS error
const pathApi = 'src/app/api/runners/capacity/route.ts';
let contentApi = fs.readFileSync(pathApi, 'utf8');
contentApi = contentApi.replace(/export async function GET\(request: Request\) \{/g, 'export async function GET() {');
fs.writeFileSync(pathApi, contentApi);
