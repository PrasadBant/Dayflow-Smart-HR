import React from 'react';
import '../../design/tokens.css';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'pending' | 'approved' | 'rejected' | 'hr' | 'employee' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  style,
  className = '',
  ...props
}) => {
  const getColors = () => {
    switch (variant) {
      case 'pending':
        return {
          bg: 'var(--color-warning-100)',
          color: 'var(--color-warning-700)',
          border: 'var(--color-warning-500)',
        };
      case 'approved':
        return {
          bg: 'var(--color-success-100)',
          color: 'var(--color-success-700)',
          border: 'var(--color-success-500)',
        };
      case 'rejected':
        return {
          bg: 'var(--color-danger-100)',
          color: 'var(--color-danger-700)',
          border: 'var(--color-danger-500)',
        };
      case 'hr':
        return {
          bg: 'var(--color-purple-100)',
          color: 'var(--color-purple-700)',
          border: 'var(--color-purple-500)',
        };
      case 'employee':
        return {
          bg: 'var(--color-primary-100)',
          color: 'var(--color-primary-800)',
          border: 'var(--color-primary-300)',
        };
      case 'info':
        return {
          bg: 'var(--color-primary-50)',
          color: 'var(--color-primary-700)',
          border: 'var(--color-primary-200)',
        };
      case 'default':
      default:
        return {
          bg: 'var(--color-slate-100)',
          color: 'var(--color-slate-700)',
          border: 'var(--color-slate-300)',
        };
    }
  };

  const colors = getColors();

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
    fontWeight: 600,
    borderRadius: 'var(--radius-full)',
    textTransform: 'capitalize',
    padding: size === 'sm' ? '0.125rem 0.5rem' : '0.25rem 0.75rem',
    fontSize: size === 'sm' ? '0.7rem' : 'var(--text-xs)',
    backgroundColor: colors.bg,
    color: colors.color,
    border: `1px solid ${colors.border}`,
    ...style,
  };

  return (
    <span style={badgeStyle} className={className} {...props}>
      {children}
    </span>
  );
};
