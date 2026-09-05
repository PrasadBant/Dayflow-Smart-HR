import React from 'react';
import '../../design/tokens.css';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'pending' | 'approved' | 'rejected' | 'hr' | 'employee' | 'info';
  size?: 'sm' | 'md';
  /** Leading status dot instead of a border — the soft-pill-with-dot pattern used by most mature SaaS status indicators (Linear, Attio) rather than a fully outlined chip. Defaults on; pass false for a plain tinted label (e.g. a role code) that isn't really "a status". */
  dot?: boolean;
}

const VARIANT_COLOR: Record<NonNullable<BadgeProps['variant']>, { bg: string; color: string; dot: string }> = {
  pending: { bg: 'var(--color-warning-100)', color: 'var(--color-warning-700)', dot: 'var(--color-warning-500)' },
  approved: { bg: 'var(--color-success-100)', color: 'var(--color-success-700)', dot: 'var(--color-success-500)' },
  rejected: { bg: 'var(--color-danger-100)', color: 'var(--color-danger-700)', dot: 'var(--color-danger-500)' },
  hr: { bg: 'var(--color-purple-100)', color: 'var(--color-purple-700)', dot: 'var(--color-purple-500)' },
  employee: { bg: 'var(--color-primary-100)', color: 'var(--color-primary-800)', dot: 'var(--color-primary-500)' },
  info: { bg: 'var(--color-info-100)', color: 'var(--color-info-700)', dot: 'var(--color-info-500)' },
  default: { bg: 'var(--color-slate-100)', color: 'var(--color-slate-700)', dot: 'var(--color-slate-400)' },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = true,
  style,
  className = '',
  ...props
}) => {
  const colors = VARIANT_COLOR[variant];

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: dot ? '0.375rem' : '0.25rem',
    fontWeight: 600,
    borderRadius: 'var(--radius-full)',
    padding: size === 'sm' ? '0.125rem 0.5rem' : '0.25rem 0.625rem',
    fontSize: size === 'sm' ? '0.6875rem' : 'var(--text-xs)',
    backgroundColor: colors.bg,
    color: colors.color,
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
    ...style,
  };

  return (
    <span style={badgeStyle} className={className} {...props}>
      {dot && (
        <span
          aria-hidden="true"
          style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colors.dot, flexShrink: 0 }}
        />
      )}
      {children}
    </span>
  );
};
