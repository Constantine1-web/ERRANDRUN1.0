import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary:   'bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80',
      danger:    'bg-rose-600 hover:bg-rose-700 text-white font-semibold',
      success:   'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold',
      ghost:     'hover:bg-slate-100 text-slate-600 hover:text-slate-900',
      outline:   'border border-slate-300 text-slate-700 hover:bg-slate-50',
    };

    const sizes = {
      xs:   'h-7 px-2.5 text-xs rounded-lg',
      sm:   'h-8 px-3 text-xs rounded-lg',
      md:   'h-10 px-4 text-sm rounded-xl',
      lg:   'h-12 px-6 text-base rounded-xl',
      icon: 'h-9 w-9 rounded-xl p-0 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
