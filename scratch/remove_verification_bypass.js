const fs = require('fs');
const path = require('path');

// --- 1. Modify src/app/dashboard/verify/page.tsx ---
const verifyPath = path.join(process.cwd(), 'src/app/dashboard/verify/page.tsx');
let verifyContent = fs.readFileSync(verifyPath, 'utf8');

// A. Remove handleInstantTestVerify function
const handleInstantTestRegex = /\/\/ Instant Test Bypass.*?handleInstantTestVerify.*?finally \{\s*setIsLoading\(false\);\s*\}\s*\};/gs;
verifyContent = verifyContent.replace(handleInstantTestRegex, '');

// B. Remove QUICK TEST VERIFY CARD
const quickTestCardRegex = /\{\/\* ── QUICK TEST VERIFY CARD.*?<\/div>\s*<\/div>/gs;
verifyContent = verifyContent.replace(quickTestCardRegex, '');

// C. Update handleCompleteVerification
const completeVerificationRegex = /const handleCompleteVerification = async \((.*?)\) => \{.*?finally \{\s*setIsLoading\(false\);\s*\}\s*\};/gs;

const updatedCompleteVerification = `const handleCompleteVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentId.trim().length < 5) return toast.error('Enter a valid University Matriculation / Reg number');

    setIsLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || user?.id;

      if (currentUserId) {
        await supabase
          .from('profiles')
          .update({
            student_id: studentId.trim().toUpperCase(),
            phone_number: phone,
            verification_status: 'pending',
          })
          .eq('id', currentUserId);
      }

      if (user) {
        setUser({
          ...user,
          phoneNumber: phone,
          studentId: studentId.trim().toUpperCase(),
          verificationStatus: 'pending',
        });
      }

      toast.success('Verification submitted! Pending admin approval.');
      setTimeout(() => {
        router.push('/dashboard/user');
      }, 1500);
    } catch {
      toast.error('Failed to submit verification');
    } finally {
      setIsLoading(false);
    }
  };`;

verifyContent = verifyContent.replace(completeVerificationRegex, updatedCompleteVerification);

fs.writeFileSync(verifyPath, verifyContent, 'utf8');


// --- 2. Modify src/app/dashboard/runner/apply/page.tsx ---
const runnerApplyPath = path.join(process.cwd(), 'src/app/dashboard/runner/apply/page.tsx');
let runnerApplyContent = fs.readFileSync(runnerApplyPath, 'utf8');

// A. Remove handleInstantUnlockRunner function
const handleInstantUnlockRegex = /const handleInstantUnlockRunner = async \(\) => \{.*?finally \{\s*setIsLoading\(false\);\s*\}\s*\};/gs;
runnerApplyContent = runnerApplyContent.replace(handleInstantUnlockRegex, '');

// B. Update handleSubmitApplication
const submitAppRegex = /const handleSubmitApplication = async \(\) => \{.*?catch \{.*?setIsLoading\(false\);\s*\}\s*\};/gs;
const updatedSubmitApp = `const handleSubmitApplication = async () => {
    setIsLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || user?.id;
      
      if (currentUserId) {
        await supabase
          .from('profiles')
          .update({
            verification_status: 'pending',
          })
          .eq('id', currentUserId);
      }
      
      if (user) {
        setUser({
          ...user,
          verificationStatus: 'pending',
        });
      }

      toast.success('Runner application submitted for admin review!');
      setStep(4);
    } catch {
      toast.error('Failed to submit application');
    } finally {
      setIsLoading(false);
    }
  };`;
runnerApplyContent = runnerApplyContent.replace(submitAppRegex, updatedSubmitApp);

// C. Remove the button calling handleInstantUnlockRunner
const instantUnlockButtonRegex = /<Button\s*onClick=\{handleInstantUnlockRunner\}.*?Instant Test Pass.*?<\/Button>/gs;
runnerApplyContent = runnerApplyContent.replace(instantUnlockButtonRegex, '');

fs.writeFileSync(runnerApplyPath, runnerApplyContent, 'utf8');

console.log('Successfully removed Instant Verification bypasses and enforced Pending status!');
