import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import '../../design/tokens.css';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  /** Fire a transient, self-dismissing notification — for outcomes of an action ("Leave request submitted"), never for something the user still needs to act on (validation errors stay inline, next to the field/form that has them). */
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const VARIANT_META: Record<ToastVariant, { icon: React.ReactNode; accent: string }> = {
  success: { icon: <CheckCircle2 size={18} />, accent: 'var(--color-success-500)' },
  error: { icon: <AlertCircle size={18} />, accent: 'var(--color-danger-500)' },
  info: { icon: <Info size={18} />, accent: 'var(--color-info-500)' },
};

const AUTO_DISMISS_MS = 4000;

/**
 * A minimal toast stack — deliberately not a general-purpose notification
 * center (no persistence, no action buttons, no queueing rules beyond
 * "stack and auto-dismiss"). That's the right size for this product: a
 * transient confirmation after a mutation, nothing more.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'fixed',
          top: 'var(--space-lg)',
          right: 'var(--space-lg)',
          zIndex: 'var(--z-toast)' as unknown as number,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-sm)',
          maxWidth: 'min(360px, calc(100vw - 2rem))',
        }}
      >
        {toasts.map((t) => {
          const meta = VARIANT_META[t.variant];
          return (
            <div
              key={t.id}
              role="status"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-sm)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderLeft: `3px solid ${meta.accent}`,
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: 'var(--space-sm) var(--space-md)',
                animation: 'df-toast-in var(--transition-normal) ease-out',
              }}
            >
              <div style={{ color: meta.accent, flexShrink: 0, marginTop: '1px' }}>{meta.icon}</div>
              <div style={{ font: 'var(--font-body)', color: 'var(--text-primary-color)', flexGrow: 1 }}>{t.message}</div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary-color)', flexShrink: 0, padding: 0, display: 'flex' }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
