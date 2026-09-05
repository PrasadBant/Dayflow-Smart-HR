import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import '../../design/tokens.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

interface VariantColors {
  bg: string;
  bgHover: string;
  color: string;
  border: string;
}

const VARIANT: Record<NonNullable<ButtonProps['variant']>, VariantColors> = {
  primary: { bg: 'var(--color-primary-600)', bgHover: 'var(--color-primary-700)', color: '#ffffff', border: 'transparent' },
  secondary: { bg: 'var(--color-slate-100)', bgHover: 'var(--color-slate-200)', color: 'var(--text-primary-color)', border: 'var(--border-default)' },
  outline: { bg: 'transparent', bgHover: 'var(--bg-sunken)', color: 'var(--text-secondary-color)', border: 'var(--border-strong)' },
  // danger-500 with white text measured 3.76:1 (axe) — under WCAG AA's 4.5:1.
  // 700/800 clear it (~6.5:1) while keeping the same darken-on-hover pattern.
  danger: { bg: 'var(--color-danger-700)', bgHover: 'var(--color-danger-800)', color: '#ffffff', border: 'transparent' },
  ghost: { bg: 'transparent', bgHover: 'var(--bg-sunken)', color: 'var(--text-secondary-color)', border: 'transparent' },
};

const SIZE: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
  sm: { padding: '0.375rem 0.75rem', fontSize: 'var(--text-xs)' },
  md: { padding: '0.5rem 1rem', fontSize: 'var(--text-sm)' },
  lg: { padding: '0.75rem 1.5rem', fontSize: 'var(--text-base)' },
};

/**
 * Hover/active states are driven by local component state rather than a CSS
 * :hover rule — every other style here is an inline object too (there's no
 * stylesheet for this component to hook into), so this is the one way to
 * get a real, consistent hover across every variant instead of buttons that
 * visually do nothing until clicked.
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const v = VARIANT[variant];
  const isInactive = disabled || isLoading;

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontWeight: 500,
    borderRadius: 'var(--radius-md)',
    cursor: isInactive ? 'not-allowed' : 'pointer',
    opacity: isInactive ? 0.55 : 1,
    transition: `background-color var(--transition-fast), border-color var(--transition-fast)`,
    backgroundColor: isHovered && !isInactive ? v.bgHover : v.bg,
    color: v.color,
    border: `1px solid ${v.border}`,
    ...SIZE[size],
    ...style,
  };

  return (
    <button
      disabled={isInactive}
      style={baseStyle}
      className={className}
      onMouseEnter={(e) => { setIsHovered(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setIsHovered(false); onMouseLeave?.(e); }}
      {...props}
    >
      {isLoading ? <Loader2 className="animate-spin" size={16} /> : leftIcon}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
