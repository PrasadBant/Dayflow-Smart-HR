import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import '../../design/tokens.css';

export interface ErrorBannerProps {
  title?: string;
  message: string;
  variant?: 'error' | 'warning' | 'info' | 'success';
  onRetry?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title,
  message,
  variant = 'error',
  onRetry,
  className = '',
  style,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          bg: 'var(--color-warning-50)',
          border: 'var(--color-warning-500)',
          color: 'var(--color-warning-700)',
          icon: <AlertTriangle size={20} color="var(--color-warning-500)" />,
        };
      case 'success':
        return {
          bg: 'var(--color-success-50)',
          border: 'var(--color-success-500)',
          color: 'var(--color-success-700)',
          icon: <CheckCircle2 size={20} color="var(--color-success-500)" />,
        };
      case 'info':
        return {
          bg: 'var(--color-primary-50)',
          border: 'var(--color-primary-400)',
          color: 'var(--color-primary-800)',
          icon: <Info size={20} color="var(--color-primary-500)" />,
        };
      case 'error':
      default:
        return {
          bg: 'var(--color-danger-50)',
          border: 'var(--color-danger-500)',
          color: 'var(--color-danger-700)',
          icon: <AlertCircle size={20} color="var(--color-danger-500)" />,
        };
    }
  };

  const v = getVariantStyles();

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: 'var(--space-md)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: v.bg,
    borderLeft: `4px solid ${v.border}`,
    color: v.color,
    marginBottom: 'var(--space-md)',
    fontSize: 'var(--text-sm)',
    ...style,
  };

  return (
    <div style={containerStyle} className={className} role="alert">
      <div style={{ flexShrink: 0, marginTop: '2px' }}>{v.icon}</div>
      <div style={{ flexGrow: 1 }}>
        {title && <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{title}</div>}
        <div>{message}</div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: 'none',
            border: 'none',
            color: v.color,
            textDecoration: 'underline',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 'var(--text-xs)',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
};
