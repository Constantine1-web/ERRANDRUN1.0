import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface TimelineStep {
  id: string;
  label: string;
  description?: string;
  status: 'completed' | 'current' | 'upcoming' | 'error';
}

export function Timeline({ steps, className }: { steps: TimelineStep[], className?: string }) {
  return (
    <div className={cn("relative border-l border-white/10 ml-3 md:ml-4", className)}>
      {steps.map((step, idx) => (
        <div key={step.id} className="mb-8 last:mb-0 ml-6 md:ml-8 relative">
          <span
            className={cn(
              "absolute -left-[35px] md:-left-[41px] flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full ring-4 ring-dark-base",
              step.status === 'completed' ? 'bg-emerald-500 text-white' :
              step.status === 'current' ? 'bg-primary-500 text-white shadow-[0_0_15px_rgba(56,189,248,0.5)]' :
              step.status === 'error' ? 'bg-rose-500 text-white' :
              'bg-[#121824] border border-white/20 text-white/50'
            )}
          >
            {step.status === 'completed' ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{idx + 1}</span>}
          </span>
          <h3 className={cn("font-medium text-sm md:text-base", step.status === 'upcoming' ? 'text-white/50' : 'text-white')}>
            {step.label}
          </h3>
          {step.description && (
            <p className="text-sm text-white/50 mt-1">{step.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
