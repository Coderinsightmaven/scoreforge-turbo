import React from 'react';
import { cn } from '../../utils/cn';

export type IconButtonVariant = 'ghost' | 'outline' | 'solid';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  label: string; // Required for accessibility
  badge?: number | string;
  isActive?: boolean;
}

const variantStyles: Record<IconButtonVariant, string> = {
  ghost: cn(
    'bg-transparent',
    'text-gray-600 dark:text-gray-400',
    'hover:bg-gray-100 hover:text-gray-900',
    'dark:hover:bg-gray-800 dark:hover:text-gray-100',
    'active:bg-gray-200 dark:active:bg-gray-700'
  ),
  outline: cn(
    'bg-transparent',
    'border border-gray-300 dark:border-gray-600',
    'text-gray-600 dark:text-gray-400',
    'hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900',
    'dark:hover:bg-gray-800 dark:hover:border-gray-500 dark:hover:text-gray-100',
    'active:bg-gray-100 dark:active:bg-gray-700'
  ),
  solid: cn(
    'bg-gray-100 dark:bg-gray-800',
    'text-gray-700 dark:text-gray-300',
    'hover:bg-gray-200 hover:text-gray-900',
    'dark:hover:bg-gray-700 dark:hover:text-gray-100',
    'active:bg-gray-300 dark:active:bg-gray-600'
  ),
};

const activeStyles: Record<IconButtonVariant, string> = {
  ghost: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  outline: 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-400',
  solid: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
};

const sizeStyles: Record<IconButtonSize, { button: string; icon: string }> = {
  sm: { button: 'h-8 w-8 rounded-md', icon: 'w-4 h-4' },
  md: { button: 'h-10 w-10 rounded-lg', icon: 'w-5 h-5' },
  lg: { button: 'h-12 w-12 rounded-lg', icon: 'w-6 h-6' },
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'ghost',
      size = 'md',
      label,
      badge,
      isActive = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        aria-label={label}
        title={label}
        className={cn(
          // Base styles
          'relative inline-flex items-center justify-center',
          'transition-all duration-fast ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          // Interaction
          'btn-press',
          // Size styles
          sizeStyles[size].button,
          // Variant styles
          isActive ? activeStyles[variant] : variantStyles[variant],
          className
        )}
        {...props}
      >
        {/* Icon wrapper to ensure consistent sizing */}
        <span className={cn('flex items-center justify-center', sizeStyles[size].icon)}>
          {children}
        </span>

        {/* Badge */}
        {badge !== undefined && badge !== 0 && (
          <span
            className={cn(
              'absolute -top-1 -right-1',
              'min-w-[18px] h-[18px] px-1',
              'flex items-center justify-center',
              'text-xs font-medium',
              'bg-indigo-600 text-white',
              'rounded-full',
              'ring-2 ring-white dark:ring-gray-900'
            )}
          >
            {typeof badge === 'number' && badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

// Common icon components for convenience
// Icons use w-4 h-4 as default size, which works well in most contexts
// When used inside IconButton, the parent wrapper constrains the size
export const Icons = {
  Copy: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Paste: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  FitScreen: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  ),
  Properties: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
    </svg>
  ),
  Save: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  ),
  Download: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  ),
  Upload: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
    </svg>
  ),
  Plus: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Folder: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  Trash: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Grid: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Settings: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Close: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Eye: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  EyeOff: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ),
  MoreVertical: () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  ),
};
