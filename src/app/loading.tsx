import React from 'react';
import { RunnerLogo } from '@/components/RunnerLogo';

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-dark-base z-[100] flex flex-col items-center justify-center">
      <div className="w-32 h-32 mb-6">
        <RunnerLogo animate={true} className="w-full h-full drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
      </div>
      <h1 className="text-2xl font-black tracking-widest uppercase">
        <span className="text-primary-400">Errand</span>
        <span className="text-white">Run</span>
      </h1>
      <div className="mt-8 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
