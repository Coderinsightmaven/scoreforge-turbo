import React from 'react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      containerClassName,
      label,
      hint,
      error,
      options,
      placeholder,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || React.useId();
    const hasError = !!error;

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              'block text-sm font-medium mb-1.5',
              'text-gray-700 dark:text-gray-300',
              disabled && 'text-gray-400 dark:text-gray-600'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={cn(
              // Base styles
              'flex w-full h-10 rounded-lg',
              'bg-white dark:bg-gray-900',
              'border',
              'px-3 py-2 pr-10 text-sm',
              'text-gray-900 dark:text-gray-100',
              // Appearance
              'appearance-none cursor-pointer',
              // Transition
              'transition-all duration-fast ease-out',
              // Focus styles
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              // Default border styles
              !hasError && [
                'border-gray-300 dark:border-gray-600',
                'hover:border-gray-400 dark:hover:border-gray-500',
                'focus:border-indigo-500 focus:ring-indigo-500/20',
                'dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20',
              ],
              // Error styles
              hasError && [
                'border-error',
                'focus:border-error focus:ring-error/20',
              ],
              // Disabled styles
              disabled && [
                'bg-gray-50 dark:bg-gray-800',
                'text-gray-400 dark:text-gray-600',
                'border-gray-200 dark:border-gray-700',
                'cursor-not-allowed',
              ],
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Chevron icon */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className={cn(
                'w-4 h-4',
                disabled
                  ? 'text-gray-300 dark:text-gray-600'
                  : 'text-gray-500 dark:text-gray-400'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {(hint || error) && (
          <p
            className={cn(
              'mt-1.5 text-sm',
              error ? 'text-error' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Native select for simple use cases
export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  containerClassName?: string;
}

export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, containerClassName, label, id, disabled, children, ...props }, ref) => {
    const selectId = id || React.useId();

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              'block text-sm font-medium mb-1.5',
              'text-gray-700 dark:text-gray-300',
              disabled && 'text-gray-400 dark:text-gray-600'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={cn(
              'flex w-full h-10 rounded-lg',
              'bg-white dark:bg-gray-900',
              'border border-gray-300 dark:border-gray-600',
              'px-3 py-2 pr-10 text-sm',
              'text-gray-900 dark:text-gray-100',
              'appearance-none cursor-pointer',
              'transition-all duration-fast ease-out',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'focus:border-indigo-500 focus:ring-indigo-500/20',
              'dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20',
              'hover:border-gray-400 dark:hover:border-gray-500',
              disabled && [
                'bg-gray-50 dark:bg-gray-800',
                'text-gray-400 dark:text-gray-600',
                'border-gray-200 dark:border-gray-700',
                'cursor-not-allowed',
              ],
              className
            )}
            {...props}
          >
            {children}
          </select>

          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className={cn(
                'w-4 h-4',
                disabled
                  ? 'text-gray-300 dark:text-gray-600'
                  : 'text-gray-500 dark:text-gray-400'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>
    );
  }
);

NativeSelect.displayName = 'NativeSelect';
