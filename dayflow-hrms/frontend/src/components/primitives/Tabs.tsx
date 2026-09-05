import React from 'react';
import '../../design/tokens.css';

export interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  /** Optional count shown as a small badge next to the label (e.g. a pending-approvals count) — only rendered when a real number is passed, never a placeholder. */
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

/**
 * A real tab pattern (underline indicator, proper aria-selected roles,
 * keyboard-focusable buttons) replacing the two full-width Buttons that
 * previously stood in for tabs on the Leave page — those worked, but
 * looked like two competing primary actions rather than one segmented view
 * switcher.
 */
export const Tabs: React.FC<TabsProps> = ({ items, activeKey, onChange }) => {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 'var(--space-lg)', borderBottom: '1px solid var(--border-default)' }}>
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${isActive ? 'var(--color-primary-600)' : 'transparent'}`,
              padding: '0.75rem 0.125rem',
              marginBottom: '-1px',
              font: 'var(--font-section-title)',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--text-primary-color)' : 'var(--text-tertiary-color)',
              cursor: 'pointer',
              transition: `color ${'var(--transition-fast)'}, border-color ${'var(--transition-fast)'}`,
            }}
          >
            {item.icon}
            <span>{item.label}</span>
            {typeof item.count === 'number' && (
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: isActive ? 'var(--color-primary-700)' : 'var(--text-tertiary-color)',
                  backgroundColor: isActive ? 'var(--color-primary-50)' : 'var(--bg-sunken)',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.0625rem 0.4375rem',
                }}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
