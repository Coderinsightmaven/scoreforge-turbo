import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  count = 1,
}) => {
  const baseClasses = cn(
    'skeleton',
    'bg-gray-200 dark:bg-gray-700',
    'animate-pulse',
    variant === 'circular' && 'rounded-full',
    variant === 'rectangular' && 'rounded-lg',
    variant === 'text' && 'rounded h-4',
    className
  );

  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  if (count === 1) {
    return <div className={baseClasses} style={style} />;
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={baseClasses} style={style} />
      ))}
    </div>
  );
};

// Pre-built skeleton patterns
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-4 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" height={16} />
        <Skeleton variant="text" width="40%" height={12} />
      </div>
    </div>
  </div>
);

export const SkeletonList: React.FC<{ count?: number; className?: string }> = ({
  count = 3,
  className,
}) => (
  <div className={cn('space-y-3', className)}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
      >
        <Skeleton variant="rectangular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="70%" height={14} />
          <Skeleton variant="text" width="50%" height={12} />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number; className?: string }> = ({
  rows = 5,
  cols = 4,
  className,
}) => (
  <div className={cn('space-y-2', className)}>
    {/* Header */}
    <div className="flex gap-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} variant="text" className="flex-1" height={14} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 p-3">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} variant="text" className="flex-1" height={12} />
        ))}
      </div>
    ))}
  </div>
);
