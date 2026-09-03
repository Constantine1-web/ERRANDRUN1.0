import React from 'react';
import { CenteredPageLoader } from '@/components/CenteredPageLoader';

export default function DashboardLoading() {
  return (
    <CenteredPageLoader
      text="ERRANDRUN"
      subtext="Syncing campus telemetry & active missions…"
    />
  );
}
