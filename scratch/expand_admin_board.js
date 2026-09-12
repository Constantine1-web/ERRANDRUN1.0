const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/dashboard/admin/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Interface
if (!content.includes('interface UserProfile')) {
  const interfacePlacement = 'interface PlatformStats {';
  const interfaceAddition = `interface UserProfile {
  id: string;
  full_name: string;
  student_id: string;
  phone_number: string;
  email: string;
  role: string;
  verification_status: string;
  created_at: string;
  wallets?: { balance: number; total_earned: number; total_spent: number }[];
}

interface PlatformStats {`;
  content = content.replace(interfacePlacement, interfaceAddition);
}

// 2. Update TabId
content = content.replace(
  "type TabId = 'verification' | 'disputes' | 'errands' | 'payouts';",
  "type TabId = 'student_verification' | 'verification' | 'users' | 'disputes' | 'errands' | 'payouts';"
);

// 3. Add states inside AdminDashboard
const statePlacement = `// Errands State`;
const stateAddition = `// Users / Student Verification State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userActionNotes, setUserActionNotes] = useState<Record<string, string>>({});
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Errands State`;
if (!content.includes('const [users, setUsers] = useState<UserProfile[]>([]);')) {
  content = content.replace(statePlacement, stateAddition);
}

// 4. Add fetchUsers
const fetcherPlacement = `const fetchPayouts = useCallback(async () => {`;
const fetcherAddition = `const fetchUsers = useCallback(async (statusFilter?: string) => {
    try {
      setLoadingUsers(true);
      const res = await authFetch(\`/api/admin/users?role=\${userRoleFilter}\${statusFilter ? \`&verification_status=\${statusFilter}\` : ''}\${userSearchQuery ? \`&search=\${encodeURIComponent(userSearchQuery)}\` : ''}\`);
      const data = await res.json();
      if (data.success) setUsers(data.data || []);
    } catch {
      toast.error('Could not load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [userRoleFilter, userSearchQuery]);

  const fetchPayouts = useCallback(async () => {`;
if (!content.includes('const fetchUsers = useCallback')) {
  content = content.replace(fetcherPlacement, fetcherAddition);
}

// 5. Update useEffect
const useEffectRegex = /useEffect\(\(\) => \{\s*if \(activeTab === 'verification'\) fetchApplications\(\);\s*if \(activeTab === 'errands'\) fetchErrands\(\);\s*if \(activeTab === 'disputes'\) fetchDisputes\(\);\s*if \(activeTab === 'payouts'\) fetchPayouts\(\);\s*\}, \[activeTab, fetchApplications, fetchErrands, fetchDisputes, fetchPayouts\]\);/g;

const newUseEffect = `useEffect(() => {
    if (activeTab === 'verification') fetchApplications();
    if (activeTab === 'errands') fetchErrands();
    if (activeTab === 'disputes') fetchDisputes();
    if (activeTab === 'payouts') fetchPayouts();
    if (activeTab === 'student_verification') fetchUsers('pending');
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, fetchApplications, fetchErrands, fetchDisputes, fetchPayouts, fetchUsers]);`;

content = content.replace(useEffectRegex, newUseEffect);

// 6. Add handleUserAction
const handlerPlacement = `const handleReview = async (app: RunnerApp, action: 'approve' | 'reject') => {`;
const handlerAddition = `const handleUserAction = async (userId: string, action: 'approve_student' | 'reject_student' | 'suspend_user' | 'reactivate_user') => {
    try {
      setProcessingId(userId);
      const reason = userActionNotes[userId] || '';
      if (['reject_student', 'suspend_user'].includes(action) && !reason) {
        toast.error('A reason is required for this action');
        return;
      }
      
      const res = await authFetch('/api/admin/users/action', {
        method: 'POST',
        body: JSON.stringify({ userId, action, reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Action failed');
      
      toast.success(data.message || 'User updated successfully');
      
      if (activeTab === 'student_verification') fetchUsers('pending');
      else fetchUsers();
      
      setUserActionNotes(prev => ({...prev, [userId]: ''}));
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReview = async (app: RunnerApp, action: 'approve' | 'reject') => {`;
if (!content.includes('const handleUserAction')) {
  content = content.replace(handlerPlacement, handlerAddition);
}

// 7. Update Tabs
const tabsRegex = /\{\[\s*\{\s*id:\s*'verification',\s*label:\s*'Runner Verification Queue',\s*count:\s*applications\.filter\(a => a\.status === 'pending'\)\.length\s*\},\s*\{\s*id:\s*'disputes',\s*label:\s*'Dispute Adjudication',\s*count:\s*disputes\.filter\(d => d\.status === 'open'\)\.length\s*\},\s*\{\s*id:\s*'errands',\s*label:\s*'Campus Errands Monitor',\s*count:\s*errands\.length\s*\},\s*\{\s*id:\s*'payouts',\s*label:\s*'Treasury Payouts',\s*count:\s*payouts\.length\s*\}\s*\]\.map/g;

const newTabs = `{[
            { id: 'student_verification', label: 'Student Queue', count: users.filter(u => u.verification_status === 'pending').length },
            { id: 'verification', label: 'Runner Queue', count: applications.filter(a => a.status === 'pending').length },
            { id: 'users', label: 'User Directory', count: 0 },
            { id: 'disputes', label: 'Disputes', count: disputes.filter(d => d.status === 'open').length },
            { id: 'errands', label: 'Errands Monitor', count: errands.length },
            { id: 'payouts', label: 'Treasury', count: payouts.length },
          ].map`;

content = content.replace(tabsRegex, newTabs);

// 8. Add Student Verification UI and Users UI
const uiPlacement = `{/* ── TAB 1: RUNNER VERIFICATION QUEUE ── */}`;
const uiAddition = `{/* ── TAB 0: STUDENT VERIFICATION QUEUE ── */}
        {activeTab === 'student_verification' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Student Verification Queue
              </h2>
            </div>
            
            {loadingUsers ? (
              <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-xs text-slate-400 animate-pulse">
                Loading students...
              </div>
            ) : users.filter(u => u.verification_status === 'pending').length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-dashed border-slate-300 text-center text-xs text-slate-400">
                No pending student verifications.
              </div>
            ) : (
              <div className="space-y-4">
                {users.filter(u => u.verification_status === 'pending').map((u) => (
                  <div key={u.id} className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="warning" className="text-[10px] uppercase font-bold">Pending Student</Badge>
                        <span className="text-xs font-mono font-bold text-slate-900">Matric: {u.student_id}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">{u.phone_number}</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900">{u.full_name}</h3>
                      <p className="text-[10px] text-slate-400">Joined: {new Date(u.created_at).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <input
                        type="text"
                        placeholder="Rejection Reason..."
                        className="text-xs p-2 rounded-lg border border-slate-200"
                        value={userActionNotes[u.id] || ''}
                        onChange={e => setUserActionNotes(prev => ({...prev, [u.id]: e.target.value}))}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          className="flex-1 text-xs"
                          isLoading={processingId === u.id}
                          onClick={() => handleUserAction(u.id, 'reject_student')}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="success"
                          className="flex-1 text-xs"
                          isLoading={processingId === u.id}
                          onClick={() => handleUserAction(u.id, 'approve_student')}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* ── TAB 1.5: USER DIRECTORY ── */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Platform Directory
              </h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, email, matric..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  />
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                  {(['all', 'student', 'runner', 'suspended'] as const).map((rl) => (
                    <button
                      key={rl}
                      onClick={() => { setUserRoleFilter(rl); setTimeout(() => fetchUsers(), 50); }}
                      className={\`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all \${
                        userRoleFilter === rl ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      }\`}
                    >
                      {rl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {loadingUsers ? (
              <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-xs text-slate-400 animate-pulse">
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-dashed border-slate-300 text-center text-xs text-slate-400">
                No users found.
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.id} className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={u.role === 'suspended' ? 'danger' : u.role === 'runner' ? 'success' : 'info'} className="text-[10px] uppercase font-bold">
                          {u.role}
                        </Badge>
                        <Badge variant={u.verification_status === 'verified' ? 'success' : 'warning'} className="text-[10px] uppercase font-bold">
                          {u.verification_status}
                        </Badge>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">{u.email}</span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 truncate">
                        {u.full_name} <span className="text-slate-400 font-mono ml-2">{u.student_id}</span>
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      {u.wallets && u.wallets[0] && (
                        <div className="text-right hidden md:block mr-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Balance</p>
                          <p className="text-xs font-black font-mono text-slate-900">{formatCurrency(u.wallets[0].balance)}</p>
                        </div>
                      )}
                      
                      {u.role !== 'suspended' && u.role !== 'admin' ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Suspension reason..."
                            className="text-[10px] p-1.5 rounded border border-slate-200 w-32 hidden sm:block"
                            value={userActionNotes[u.id] || ''}
                            onChange={e => setUserActionNotes(prev => ({...prev, [u.id]: e.target.value}))}
                          />
                          <Button size="sm" variant="danger" className="text-[10px] h-8" onClick={() => handleUserAction(u.id, 'suspend_user')} isLoading={processingId === u.id}>
                            Suspend
                          </Button>
                        </div>
                      ) : u.role === 'suspended' ? (
                        <Button size="sm" variant="success" className="text-[10px] h-8" onClick={() => handleUserAction(u.id, 'reactivate_user')} isLoading={processingId === u.id}>
                          Reactivate
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 1: RUNNER VERIFICATION QUEUE ── */}`;

if (!content.includes('TAB 0: STUDENT VERIFICATION QUEUE')) {
  content = content.replace(uiPlacement, uiAddition);
}

// 9. Add fetchUsers call in Refresh Grid button
const refreshPlacement = `if (activeTab === 'payouts') fetchPayouts();`;
const refreshAddition = `if (activeTab === 'payouts') fetchPayouts();
                if (activeTab === 'student_verification') fetchUsers('pending');
                if (activeTab === 'users') fetchUsers();`;
content = content.replace(refreshPlacement, refreshAddition);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully expanded Admin Board with Student Verification and User Directory!');
