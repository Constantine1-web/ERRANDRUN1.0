import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    
    const variants = {
      primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20 border border-primary-400/50',
      secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/5 backdrop-blur-sm',
      danger: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20',
      ghost: 'hover:bg-white/10 text-white/70 hover:text-white',
      outline: 'border border-white/20 text-white hover:bg-white/10',
      glass: 'bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-white',
    };
    
    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-11 px-5 text-sm',
      lg: 'h-14 px-8 text-base',
      icon: 'h-10 w-10 p-2 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
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
