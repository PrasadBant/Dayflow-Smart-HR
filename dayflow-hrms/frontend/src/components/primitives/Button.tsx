import React from 'react';
import { Loader2 } from 'lucide-react';
import '../../design/tokens.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

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
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'var(--color-slate-100)',
          color: 'var(--color-slate-800)',
          border: '1px solid var(--color-slate-200)',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-slate-700)',
          border: '1px solid var(--color-slate-300)',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--color-danger-500)',
          color: '#ffffff',
          border: '1px solid transparent',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-slate-600)',
          border: '1px solid transparent',
        };
      case 'primary':
      default:
        return {
          backgroundColor: 'var(--color-primary-600)',
          color: '#ffffff',
          border: '1px solid transparent',
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: '0.375rem 0.75rem',
          fontSize: 'var(--text-xs)',
        };
      case 'lg':
        return {
          padding: '0.75rem 1.5rem',
          fontSize: 'var(--text-lg)',
        };
      case 'md':
      default:
        return {
          padding: '0.5rem 1rem',
          fontSize: 'var(--text-sm)',
        };
    }
  };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontWeight: 500,
    borderRadius: 'var(--radius-md)',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: 'all var(--transition-fast)',
    outline: 'none',
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  return (
    <button
      disabled={disabled || isLoading}
      style={baseStyle}
      className={className}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={16} />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
