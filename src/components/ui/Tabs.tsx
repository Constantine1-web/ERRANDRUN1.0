import React from 'react';
import { cn } from '@/lib/utils';

export function TabsList({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("inline-flex h-12 items-center justify-center rounded-xl bg-[#121824] p-1 text-white/50 border border-white/5", className)} {...props}>
      {children}
    </div>
  );
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function TabsTrigger({ className, active, children, ...props }: TabsTriggerProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        active ? "bg-white/10 text-white shadow-sm" : "hover:text-white hover:bg-white/5",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
