import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import '../../design/tokens.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Replaces the LeavePage-only inline "fixed inset-0 backdrop + centered
 * Card" pattern with a reusable dialog: Escape closes it, a click on the
 * backdrop closes it, focus moves into the dialog on open and is trapped
 * there (Tab/Shift+Tab cycle within it rather than leaking to the page
 * behind it) and returns to whatever triggered the modal on close, and the
 * page can't scroll behind an open modal.
 */
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, description, children, footer, maxWidth = '520px' }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    focusable?.[0]?.focus();

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialog) {
        const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => !el.hasAttribute('disabled'));
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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--z-modal)' as unknown as number,
        padding: 'var(--space-md)',
        animation: 'df-fade-in var(--transition-fast) ease-out',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="df-modal-title"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth,
          maxHeight: 'calc(100vh - 2 * var(--space-md))',
          display: 'flex',
          flexDirection: 'column',
          animation: 'df-slide-up var(--transition-normal) ease-out',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)', padding: 'var(--space-lg) var(--space-lg) var(--space-md)' }}>
          <div>
            <h2 id="df-modal-title" style={{ font: 'var(--font-section-title)', fontSize: 'var(--text-xl)', color: 'var(--text-primary-color)' }}>{title}</h2>
            {description && <p style={{ font: 'var(--font-body)', color: 'var(--text-secondary-color)', marginTop: '0.25rem' }}>{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary-color)', padding: '0.25rem', flexShrink: 0 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '0 var(--space-lg) var(--space-lg)', overflowY: 'auto' }}>{children}</div>

        {footer && (
          <div style={{ padding: 'var(--space-md) var(--space-lg)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
