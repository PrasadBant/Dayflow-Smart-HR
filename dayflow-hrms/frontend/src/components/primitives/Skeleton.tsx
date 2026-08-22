import React from 'react';
import '../../design/tokens.css';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1.25rem',
  borderRadius = 'var(--radius-md)',
  style,
  className = '',
  ...props
}) => {
  const skeletonStyle: React.CSSProperties = {
    width,
    height,
    borderRadius,
    backgroundColor: 'var(--color-slate-200)',
    ...style,
  };

  return (
    <div
      style={skeletonStyle}
      className={`animate-pulse ${className}`}
      {...props}
    />
  );
};
