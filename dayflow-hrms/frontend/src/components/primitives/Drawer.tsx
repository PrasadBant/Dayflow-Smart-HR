import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import '../../design/tokens.css';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Rendered in the drawer's own header area, above the close button — typically an identity block (avatar + name) rather than a plain title string. */
  header?: React.ReactNode;
  width?: string;
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Same accessibility contract as Modal.tsx (Escape closes, focus trap,
 * scroll lock, focus restored on close) in a side-panel shape instead of a
 * centered dialog — used for the HR Employee Context panel, which needs
 * room for several sections (profile/attendance/leave/payroll) that would
 * feel cramped in a centered modal. Full-width on narrow viewports via the
 * .df-drawer-panel rule in tokens.css.
 */
export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, children, header, width = '480px' }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    focusable?.[0]?.focus();

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => !el.hasAttribute('disabled'));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal)' as unknown as number }}
      role="presentation"
    >
      <div
        style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--bg-overlay)', animation: 'df-fade-in var(--transition-fast) ease-out' }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="df-drawer-panel"
        role="dialog"
        aria-modal="true"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width,
          maxWidth: '100%',
          backgroundColor: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'df-slide-in-right var(--transition-slow) ease-out',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)', padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ minWidth: 0 }}>{header}</div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary-color)', padding: '0.25rem', flexShrink: 0 }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: 'var(--space-lg)' }}>{children}</div>
      </div>
    </div>
  );
};
