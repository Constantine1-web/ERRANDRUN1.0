import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface TimelineStep {
  id: string;
  label: string;
  description?: string;
  status: 'done' | 'active' | 'pending' | 'completed' | 'current' | 'upcoming' | 'error';
}

export function Timeline({ steps, className }: { steps: TimelineStep[], className?: string }) {
  return (
    <div className={cn('relative border-l border-slate-200 ml-3 md:ml-4', className)}>
      {steps.map((step, idx) => {
        const isDone    = step.status === 'done' || step.status === 'completed';
        const isActive  = step.status === 'active' || step.status === 'current';
        const isError   = step.status === 'error';
        const isPending = !isDone && !isActive && !isError;

        return (
          <div key={step.id} className="mb-8 last:mb-0 ml-6 md:ml-8 relative">
            <span
              className={cn(
                'absolute -left-[35px] md:-left-[41px] flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full ring-4 ring-slate-50',
                isDone   ? 'bg-green-600 text-white' :
                isActive ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.35)]' :
                isError  ? 'bg-red-600 text-white' :
                           'bg-white border-2 border-slate-300 text-slate-400'
              )}
            >
              {isDone
                ? <Check className="h-4 w-4" />
                : <span className="text-xs font-bold">{idx + 1}</span>}
            </span>
            <h3 className={cn('font-medium text-sm md:text-base', isPending ? 'text-slate-400' : 'text-slate-900')}>
              {step.label}
            </h3>
            {step.description && (
              <p className="text-sm text-slate-500 mt-1">{step.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

