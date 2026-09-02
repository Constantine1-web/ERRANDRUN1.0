'use client';
import dynamic from 'next/dynamic';
const UserDashboardContent = dynamic(() => import('./UserDashboardContent'), { ssr: false });
export default function Page() { return <UserDashboardContent />; }
