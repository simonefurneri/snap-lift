'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
  contentClassName?: string;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  showCloseButton = true,
  contentClassName,
  className,
}: ModalProps) {
  const shouldReduceMotion = useReducedMotion();

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const maxWidthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    full: 'sm:max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal / Bottom Sheet */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0.5 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={cn(
              'relative z-10 w-full bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-[28px] sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col pb-safe sm:pb-0',
              maxWidthClasses[maxWidth],
              className
            )}
          >
            {/* Mobile Drag/Grab Bar */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-5 pt-3 pb-3 sm:py-4 border-b border-zinc-100 dark:border-zinc-800/80">
                <div>
                  {title && (
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    aria-label="Chiudi"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content body */}
            <div className="p-4 sm:p-5 overflow-y-auto overflow-x-hidden flex-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
