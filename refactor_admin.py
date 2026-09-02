import os

file_path = os.path.join("src", "app", "dashboard", "admin", "page.tsx")
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add imports
if "import { Button }" not in content:
    content = content.replace(
        "import React, { useEffect, useState, useCallback } from 'react';",
        "import React, { useEffect, useState, useCallback } from 'react';\n"
        "import { Button } from '@/components/ui/Button';\n"
        "import { Card } from '@/components/ui/Card';\n"
        "import { Badge } from '@/components/ui/Badge';\n"
        "import { TabsList, TabsTrigger } from '@/components/ui/Tabs';\n"
        "import { Input } from '@/components/ui/Input';"
    )

# 2. Replace Tabs
old_tabs = """      {/* Main Tab Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-white/10 scrollbar-none">
        {[
          {
            id: 'applications',
            label: 'Runner Applications',
            icon: ShieldCheck,
            badge: stats && stats.pendingApplications > 0 ? stats.pendingApplications : null,
          },
          { id: 'errands', label: 'All Campus Errands', icon: Package },
          { id: 'users', label: 'User Directory', icon: Users },
          { id: 'disputes', label: 'Disputes & Claims', icon: AlertTriangle },
          { id: 'stats', label: 'Financial Analytics', icon: TrendingUp },
          { id: 'payouts', label: 'Runner Payouts', icon: Wallet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchQuery('');
              }}
              className={`px-4 py-2.5 rounded-2xl text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-dark-base">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>"""

new_tabs = """      {/* Main Tab Navigation Bar */}
      <TabsList className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-white/10 scrollbar-none w-full justify-start bg-transparent !h-auto !p-0">
        {[
          {
            id: 'applications',
            label: 'Runner Applications',
            icon: ShieldCheck,
            badge: stats && stats.pendingApplications > 0 ? stats.pendingApplications : null,
          },
          { id: 'errands', label: 'All Campus Errands', icon: Package },
          { id: 'users', label: 'User Directory', icon: Users },
          { id: 'disputes', label: 'Disputes & Claims', icon: AlertTriangle },
          { id: 'stats', label: 'Financial Analytics', icon: TrendingUp },
          { id: 'payouts', label: 'Runner Payouts', icon: Wallet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <TabsTrigger
              key={tab.id}
              active={isActive}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchQuery('');
              }}
              className="rounded-2xl flex items-center gap-2 py-2.5 px-4"
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <Badge variant="warning" className="ml-1 bg-amber-500 text-dark-base border-none rounded-full px-2">
                  {tab.badge}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>"""

content = content.replace(old_tabs, new_tabs)

# 3. Wrapping metrics and tables in Card
# In metrics (lines 465-511 approx)
old_metric_1 = '<div className="glass-card rounded-3xl p-5 border border-white/10">'
new_metric_1 = '<Card className="rounded-3xl p-5 border border-white/10">'
content = content.replace(old_metric_1, new_metric_1)
content = content.replace('</div>\n          <p className="text-xs text-amber-400/80 mt-1">Awaiting ID Card Inspection</p>\n        </div>', '</div>\n          <p className="text-xs text-amber-400/80 mt-1">Awaiting ID Card Inspection</p>\n        </Card>')
content = content.replace('</div>\n          <p className="text-xs text-emerald-400/80 mt-1">Authorized campus runners</p>\n        </div>', '</div>\n          <p className="text-xs text-emerald-400/80 mt-1">Authorized campus runners</p>\n        </Card>')
content = content.replace('of {stats?.totalErrands || 0} total placed\n          </p>\n        </div>', 'of {stats?.totalErrands || 0} total placed\n          </p>\n        </Card>')
content = content.replace('</div>\n          <p className="text-xs text-white/60 mt-1">20% commission earned</p>\n        </div>', '</div>\n          <p className="text-xs text-white/60 mt-1">20% commission earned</p>\n        </Card>')

# 4. Use Input and Button
content = content.replace('<input\n                type="text"', '<Input\n                type="text"')
content = content.replace('className="input pl-10 w-full text-xs"\n              />', 'className="pl-10 w-full text-xs"\n              />')
content = content.replace('<input\n                          type="text"', '<Input\n                          type="text"')
content = content.replace('className="input w-full text-xs"\n                        />', 'className="w-full text-xs"\n                        />')
content = content.replace('className="input w-full text-xs"', 'className="w-full text-xs"')
content = content.replace('<input type="number"', '<Input type="number"')
content = content.replace('<input\n                          type="text"\n                          placeholder="Admin arbitration notes (Internal)..."', '<Input\n                          type="text"\n                          placeholder="Admin arbitration notes (Internal)..."')

# 5. Buttons
content = content.replace('<button\n                        type="button"\n                        onClick={() => handleReview(app, \'approve\')}', '<Button\n                        type="button"\n                        onClick={() => handleReview(app, \'approve\')}')
content = content.replace('Approve & Verify Runner\n                      </button>', 'Approve & Verify Runner\n                      </Button>')
content = content.replace('<button\n                        type="button"\n                        onClick={() => handleReview(app, \'reject\')}', '<Button\n                        type="button"\n                        onClick={() => handleReview(app, \'reject\')}')
content = content.replace('<XCircle className="w-3.5 h-3.5" />\n                        Reject\n                      </button>', '<XCircle className="w-3.5 h-3.5" />\n                        Reject\n                      </Button>')

# 6. Badges in App Status
old_app_badge = """<span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                            app.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : app.status === 'denied'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {app.status}
                        </span>"""
new_app_badge = """<Badge variant={app.status === 'approved' ? 'success' : app.status === 'denied' ? 'danger' : 'warning'} className="uppercase tracking-wider">
                          {app.status}
                        </Badge>"""
content = content.replace(old_app_badge, new_app_badge)

# 7. Badges in Errand Status
old_errand_badge = """<span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          errand.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : errand.status === 'cancelled'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : errand.status === 'in_progress' || errand.status === 'assigned'
                            ? 'bg-primary-500/20 text-primary-300 border-primary-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {errand.status.replace('_', ' ')}
                      </span>"""
new_errand_badge = """<Badge variant={errand.status === 'completed' ? 'success' : errand.status === 'cancelled' ? 'danger' : errand.status === 'in_progress' || errand.status === 'assigned' ? 'info' : 'warning'} className="uppercase tracking-wider text-[10px]">
                        {errand.status.replace('_', ' ')}
                      </Badge>"""
content = content.replace(old_errand_badge, new_errand_badge)

# Write back
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Refactoring complete.")
