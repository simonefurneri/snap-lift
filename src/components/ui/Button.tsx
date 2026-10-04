'use client';

import React, { forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();

    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer';

    const variants = {
      primary:
        'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 font-semibold shadow-sm',
      secondary:
        'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
      outline:
        'border border-zinc-200 bg-transparent hover:bg-zinc-100 text-zinc-900 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800/80',
      ghost:
        'bg-transparent hover:bg-zinc-100 text-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100',
      danger:
        'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70 border border-red-200/50 dark:border-red-900/50',
    };

    const sizes = {
      sm: 'min-h-[36px] px-3 py-1.5 text-xs rounded-lg gap-1.5',
      md: 'min-h-[44px] px-4 py-2.5 text-sm rounded-xl gap-2',
      lg: 'min-h-[50px] px-6 py-3 text-base rounded-2xl gap-2.5 font-semibold',
      icon: 'min-h-[44px] min-w-[44px] p-2.5 rounded-xl',
    };

    return (
      <motion.button
        ref={ref}
        whileTap={shouldReduceMotion || disabled || isLoading ? undefined : { scale: 0.97 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...(props as any)}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current" />
            <span className="opacity-80">{children}</span>
          </>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
