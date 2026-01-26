import React, { useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const sizeStyles: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  size?: DialogSize;
  children: React.ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  size = 'md',
  children,
  className,
  closeOnBackdrop = true,
  closeOnEscape = true,
}) => {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [onClose, closeOnEscape]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0',
          'bg-black/50 dark:bg-black/70',
          'backdrop-blur-sm',
          'animate-fade-in'
        )}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Dialog container */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full mx-4',
          'bg-white dark:bg-gray-900',
          'rounded-xl',
          'shadow-overlay',
          'animate-scale-in',
          'max-h-[90vh] flex flex-col',
          sizeStyles[size],
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};

// Dialog Header
export interface DialogHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({
  children,
  onClose,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        'px-6 py-4',
        'border-b border-gray-200 dark:border-gray-700',
        'flex-shrink-0',
        className
      )}
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {children}
      </h2>
      {onClose && (
        <button
          onClick={onClose}
          className={cn(
            'p-2 -mr-2 rounded-lg',
            'text-gray-400 hover:text-gray-600',
            'dark:text-gray-500 dark:hover:text-gray-300',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'transition-colors duration-fast'
          )}
          aria-label="Close dialog"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

// Dialog Content
export interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogContent: React.FC<DialogContentProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex-1 overflow-y-auto',
        'px-6 py-4',
        'scrollbar-thin',
        className
      )}
    >
      {children}
    </div>
  );
};

// Dialog Footer
export interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3',
        'px-6 py-4',
        'border-t border-gray-200 dark:border-gray-700',
        'bg-gray-50 dark:bg-gray-800/50',
        'rounded-b-xl',
        'flex-shrink-0',
        className
      )}
    >
      {children}
    </div>
  );
};

// Dialog Description (for accessibility)
export interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogDescription: React.FC<DialogDescriptionProps> = ({
  children,
  className,
}) => {
  return (
    <p
      className={cn(
        'text-sm text-gray-500 dark:text-gray-400',
        'mb-4',
        className
      )}
    >
      {children}
    </p>
  );
};
