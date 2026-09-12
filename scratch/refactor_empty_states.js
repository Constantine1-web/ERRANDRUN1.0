const fs = require('fs');
const path = require('path');

// 1. Update Errands History Empty State
const errandsPath = path.join(process.cwd(), 'src/app/dashboard/errands/page.tsx');
let errandsContent = fs.readFileSync(errandsPath, 'utf8');

const searchErrands = \`<p className="text-xs text-slate-500 dark:text-slate-400">
            {searchQuery ? 'Try adjusting your search criteria.' : 'You have not dispatched any errands in this category yet.'}
          </p>
        </div>\`;

const replaceErrands = \`<p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery ? 'Try adjusting your search criteria.' : 'You haven\\'t requested any campus runs yet. Need something done?'}
          </p>
          {!searchQuery && (
            <div className="pt-4">
              <Button onClick={() => router.push('/dashboard/errands/new')} variant="primary" className="font-bold shadow-md">
                <Plus className="w-4 h-4 mr-1.5" />
                Dispatch a Runner
              </Button>
            </div>
          )}
        </div>\`;

errandsContent = errandsContent.replace(searchErrands, replaceErrands);
fs.writeFileSync(errandsPath, errandsContent, 'utf8');


// 2. Update Runner Dashboard Empty State
const runnerPath = path.join(process.cwd(), 'src/app/dashboard/runner/page.tsx');
let runnerContent = fs.readFileSync(runnerPath, 'utf8');

const searchRunnerHistory = \`{historyErrands.length === 0 ? (
                  <div className="bg-white dark:bg-[#111827] rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-400 shadow-sm">
                    No completed errands in your log yet.
                  </div>
                ) : (\`;

const replaceRunnerHistory = \`{historyErrands.length === 0 ? (
                  <div className="bg-white dark:bg-[#111827] rounded-[2rem] p-12 border border-slate-200 dark:border-slate-800 border-dashed text-center space-y-3 shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2">
                      <Clock className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">No Missions Completed</p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Switch to the "Nearby" tab to find and accept your first campus errand.
                    </p>
                  </div>
                ) : (\`;

runnerContent = runnerContent.replace(searchRunnerHistory, replaceRunnerHistory);
fs.writeFileSync(runnerPath, runnerContent, 'utf8');

console.log('Successfully updated empty states for Phase F!');
