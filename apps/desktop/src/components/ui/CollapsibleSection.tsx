import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { Icons } from './IconButton';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  defaultOpen = true,
  children,
  className,
  headerClassName,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('border-b border-gray-200 dark:border-gray-700', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between',
          'py-3 px-1',
          'text-left',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          'transition-colors duration-fast',
          headerClassName
        )}
      >
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {title}
        </span>
        <span
          className={cn(
            'w-4 h-4 text-gray-400 transition-transform duration-fast',
            isOpen && 'rotate-180'
          )}
        >
          <Icons.ChevronDown />
        </span>
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-normal',
          isOpen ? 'max-h-[2000px] opacity-100 pb-4' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-1 space-y-3">{children}</div>
      </div>
    </div>
  );
};

// Form field wrapper for consistent styling
interface FormFieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  hint,
  children,
  className,
}) => {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
    </div>
  );
};

// Inline field for compact two-column layouts
interface InlineFieldProps {
  label: string;
  children: React.ReactNode;
}

export const InlineField: React.FC<InlineFieldProps> = ({ label, children }) => {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 max-w-[120px]">{children}</div>
    </div>
  );
};

// Color input with label
interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowTransparent?: boolean;
  isTransparent?: boolean;
  onToggleTransparent?: () => void;
}

export const ColorInput: React.FC<ColorInputProps> = ({
  label,
  value,
  onChange,
  allowTransparent = false,
  isTransparent = false,
  onToggleTransparent,
}) => {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isTransparent ? '#ffffff' : value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isTransparent}
          className={cn(
            'w-10 h-8 rounded-md border border-gray-300 dark:border-gray-600',
            'cursor-pointer',
            isTransparent && 'opacity-50 cursor-not-allowed'
          )}
        />
        {allowTransparent && onToggleTransparent && (
          <button
            onClick={onToggleTransparent}
            className={cn(
              'px-2 py-1 text-xs rounded-md border transition-colors',
              isTransparent
                ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700'
            )}
          >
            {isTransparent ? 'Transparent' : 'Solid'}
          </button>
        )}
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
          {isTransparent ? 'none' : value}
        </span>
      </div>
    </div>
  );
};

// Slider with value display
interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
}

export const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  formatValue = (v) => String(v),
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {label}
        </label>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatValue(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={cn(
          'w-full h-2 rounded-full appearance-none cursor-pointer',
          'bg-gray-200 dark:bg-gray-700',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-indigo-600',
          '[&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-webkit-slider-thumb]:transition-transform',
          '[&::-webkit-slider-thumb]:hover:scale-110'
        )}
      />
    </div>
  );
};
