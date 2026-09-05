import React from 'react';
import '../../design/tokens.css';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Slightly smaller footprint for use inside a compact panel/table cell rather than a whole page section. */
  compact?: boolean;
}

/**
 * A consistent "nothing here yet, here's what to do about it" pattern —
 * replaces the differently-worded, differently-styled empty <div> that used
 * to live inline in every page (some said "No data", some had an icon, most
 * had no action). Every empty state should say what's missing AND what the
 * user can do next; a bare "No data" is exactly what this exists to avoid.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, compact = false }) => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: compact ? 'var(--space-xl) var(--space-md)' : 'var(--space-3xl) var(--space-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-xs)',
      }}
    >
      {icon && (
        <div
          style={{
            width: compact ? '40px' : '48px',
            height: compact ? '40px' : '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-sunken)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-disabled-color)',
            marginBottom: 'var(--space-sm)',
          }}
        >
          {icon}
        </div>
      )}
      <h3 style={{ font: 'var(--font-section-title)', color: 'var(--text-primary-color)' }}>{title}</h3>
      {description && (
        <p style={{ font: 'var(--font-body)', color: 'var(--text-tertiary-color)', maxWidth: '360px' }}>{description}</p>
      )}
      {action && <div style={{ marginTop: 'var(--space-sm)' }}>{action}</div>}
    </div>
  );
};
