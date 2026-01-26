import React from 'react';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-indigo-600 text-white',
    'hover:bg-indigo-700',
    'active:bg-indigo-800',
    'focus-visible:ring-indigo-500',
    'disabled:bg-indigo-400'
  ),
  secondary: cn(
    'bg-gray-100 text-gray-900',
    'hover:bg-gray-200',
    'active:bg-gray-300',
    'focus-visible:ring-gray-400',
    'disabled:bg-gray-100 disabled:text-gray-400',
    'dark:bg-gray-800 dark:text-gray-100',
    'dark:hover:bg-gray-700',
    'dark:active:bg-gray-600',
    'dark:disabled:bg-gray-800 dark:disabled:text-gray-600'
  ),
  outline: cn(
    'border border-gray-300 bg-transparent text-gray-700',
    'hover:bg-gray-50 hover:border-gray-400',
    'active:bg-gray-100',
    'focus-visible:ring-gray-400',
    'disabled:border-gray-200 disabled:text-gray-400',
    'dark:border-gray-600 dark:text-gray-300',
    'dark:hover:bg-gray-800 dark:hover:border-gray-500',
    'dark:active:bg-gray-700',
    'dark:disabled:border-gray-700 dark:disabled:text-gray-600'
  ),
  ghost: cn(
    'bg-transparent text-gray-700',
    'hover:bg-gray-100',
    'active:bg-gray-200',
    'focus-visible:ring-gray-400',
    'disabled:text-gray-400',
    'dark:text-gray-300',
    'dark:hover:bg-gray-800',
    'dark:active:bg-gray-700',
    'dark:disabled:text-gray-600'
  ),
  destructive: cn(
    'bg-error text-white',
    'hover:bg-error-dark',
    'active:bg-red-700',
    'focus-visible:ring-error',
    'disabled:bg-error-light disabled:text-white/70'
  ),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-lg',
  icon: 'h-10 w-10 rounded-lg',
};

// Icon sizes matching button sizes
const iconSizeStyles: Record<ButtonSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  icon: 'w-5 h-5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center',
          'font-medium',
          'transition-all duration-fast ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:cursor-not-allowed',
          // Interaction animations
          'btn-press',
          // Variant styles
          variantStyles[variant],
          // Size styles
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <LoadingSpinner className="mr-2" />
            {children}
          </>
        ) : (
          <>
            {leftIcon && (
              <span className={cn('flex-shrink-0', iconSizeStyles[size])}>
                {leftIcon}
              </span>
            )}
            {children}
            {rightIcon && (
              <span className={cn('flex-shrink-0', iconSizeStyles[size])}>
                {rightIcon}
              </span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Loading spinner component
const LoadingSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('h-4 w-4 animate-spin', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);
