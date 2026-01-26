import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      label,
      hint,
      error,
      leftAddon,
      rightAddon,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const hasError = !!error;

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
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
          {leftAddon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400">{leftAddon}</span>
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              // Base styles
              'flex w-full h-10 rounded-lg',
              'bg-white dark:bg-gray-900',
              'border',
              'px-3 py-2 text-sm',
              'text-gray-900 dark:text-gray-100',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
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
              // Addon padding
              leftAddon && 'pl-10',
              rightAddon && 'pr-10',
              className
            )}
            {...props}
          />

          {rightAddon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400">{rightAddon}</span>
            </div>
          )}
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

Input.displayName = 'Input';

// Textarea variant
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      containerClassName,
      label,
      hint,
      error,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const textareaId = id || React.useId();
    const hasError = !!error;

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              'block text-sm font-medium mb-1.5',
              'text-gray-700 dark:text-gray-300',
              disabled && 'text-gray-400 dark:text-gray-600'
            )}
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          className={cn(
            // Base styles
            'flex w-full min-h-[80px] rounded-lg',
            'bg-white dark:bg-gray-900',
            'border',
            'px-3 py-2 text-sm',
            'text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'resize-y',
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
              'cursor-not-allowed resize-none',
            ],
            className
          )}
          {...props}
        />

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

Textarea.displayName = 'Textarea';
