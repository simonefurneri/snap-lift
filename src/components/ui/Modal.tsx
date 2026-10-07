'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
  contentClassName?: string;
  footerClassName?: string;
  className?: string;
  zIndex?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  onSubmit,
  maxWidth = 'md',
  showCloseButton = true,
  contentClassName,
  footerClassName,
  className,
  zIndex = 'z-50',
}: ModalProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
    } else if (isRendered) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsRendered(false);
        setIsClosing(false);
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isRendered]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRendered && !isClosing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRendered, isClosing, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isRendered) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isRendered]);

  // Touch drag-to-dismiss handlers on grab bar / header
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (touchStartY.current !== null && touchCurrentY.current !== null) {
      const deltaY = touchCurrentY.current - touchStartY.current;
      if (deltaY > 60) {
        onClose();
      }
    }
    touchStartY.current = null;
    touchCurrentY.current = null;
  };

  if (!isRendered || !mounted) return null;

  const maxWidthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    full: 'sm:max-w-4xl',
  };

  const modalMarkup = (
    <div className={cn("fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4", zIndex || 'z-50')}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 bg-black/60',
          isClosing ? 'animate-sheet-backdrop-exit' : 'animate-sheet-backdrop-enter'
        )}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet */}
      <div
        className={cn(
          'relative z-10 w-full bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-[28px] sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col pb-safe sm:pb-0',
          isClosing ? 'animate-sheet-exit' : 'animate-sheet-enter',
          maxWidthClasses[maxWidth],
          className
        )}
      >
        {/* Mobile Drag/Grab Bar - Anchored */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="sm:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
        >
          <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* Header - Anchored */}
        {(title || showCloseButton) && (
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex items-center justify-between px-5 pt-3 pb-3 sm:py-4 border-b border-zinc-100 dark:border-zinc-800/80 select-none shrink-0"
          >
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
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                aria-label="Chiudi"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Central scrollable body & Anchored bottom bar */}
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className={cn('p-4 sm:p-5 overflow-y-auto overflow-x-hidden flex-1 min-h-0', contentClassName)}>
              {children}
            </div>
            {footer && (
              <div className={cn('px-4 py-3 sm:px-5 sm:py-4 border-t border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shrink-0', footerClassName)}>
                {footer}
              </div>
            )}
          </form>
        ) : (
          <>
            <div className={cn('p-4 sm:p-5 overflow-y-auto overflow-x-hidden flex-1 min-h-0', contentClassName)}>
              {children}
            </div>
            {footer && (
              <div className={cn('px-4 py-3 sm:px-5 sm:py-4 border-t border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shrink-0', footerClassName)}>
                {footer}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalMarkup, document.body);
}
