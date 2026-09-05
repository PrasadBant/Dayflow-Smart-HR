import React from 'react';
import '../../design/tokens.css';

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Primary/secondary action buttons, right-aligned on desktop, wrapping below the title on narrow viewports. */
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * Every page used to bury its own title inside a Card's CardHeader — the
 * page title, the card title, and AppShell's topbar title all said the same
 * thing three different ways. This is the one real page-level heading now;
 * AppShell's topbar dropped its duplicate (see AppShell.tsx).
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, icon }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-xl)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)', minWidth: 0 }}>
        {icon && (
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ font: 'var(--font-page-title)', color: 'var(--text-primary-color)', margin: 0 }}>{title}</h1>
          {description && (
            <p style={{ font: 'var(--font-body)', color: 'var(--text-secondary-color)', marginTop: '0.25rem', maxWidth: '640px' }}>
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexShrink: 0, flexWrap: 'wrap' }}>{actions}</div>
      )}
    </div>
  );
};
