import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import '../../design/tokens.css';

export interface CommandAction {
  id: string;
  label: string;
  group: string;
  icon: React.ReactNode;
  run: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandAction[];
}

/**
 * A real, small "go to X" launcher — not a general command framework. Every
 * entry navigates to an existing route or the one action that route already
 * exposes; there is no fuzzy search over fabricated results and nothing here
 * can fail silently, because every `run()` is either `navigate(realPath)` or
 * a handler the page itself already owns. Ctrl/Cmd+K toggles it (wired in
 * AppShell); Escape or a backdrop click closes it.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, actions }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(q) || a.group.toLowerCase().includes(q));
  }, [actions, query]);

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    setQuery('');
    setActiveIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  const runAndClose = (action: CommandAction) => {
    action.run();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const action = filtered[activeIndex];
      if (action) runAndClose(action);
    }
  };

  if (!isOpen) return null;

  // Group while preserving the incoming order (roughly priority order).
  const groups: { name: string; items: CommandAction[] }[] = [];
  for (const item of filtered) {
    let g = groups.find((x) => x.name === item.group);
    if (!g) { g = { name: item.group, items: [] }; groups.push(g); }
    g.items.push(item);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-overlay)',
        zIndex: 'var(--z-modal)' as unknown as number,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: 'min(15vh, 120px)',
        animation: 'df-fade-in var(--transition-fast) ease-out',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={{
          width: '100%',
          maxWidth: '560px',
          height: 'fit-content',
          maxHeight: '60vh',
          margin: '0 var(--space-md)',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'df-slide-up var(--transition-normal) ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
          <Search size={17} color="var(--text-tertiary-color)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Go to a page or action…"
            aria-label="Search commands"
            style={{ flexGrow: 1, border: 'none', outline: 'none', background: 'none', font: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--text-primary-color)' }}
          />
          <kbd style={{ font: 'var(--font-caption)', color: 'var(--text-tertiary-color)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '0.0625rem 0.375rem', flexShrink: 0 }}>Esc</kbd>
        </div>

        <div style={{ overflowY: 'auto', padding: 'var(--space-sm)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 'var(--space-lg)', textAlign: 'center', font: 'var(--font-body)', color: 'var(--text-tertiary-color)' }}>
              No matching pages or actions.
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.name} style={{ marginBottom: '0.25rem' }}>
                <div style={{ font: 'var(--font-caption)', color: 'var(--text-tertiary-color)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.375rem 0.625rem' }}>
                  {group.name}
                </div>
                {group.items.map((action) => {
                  const index = filtered.indexOf(action);
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={action.id}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => runAndClose(action)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        width: '100%',
                        padding: '0.5rem 0.625rem',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isActive ? 'var(--bg-sunken)' : 'transparent',
                        color: 'var(--text-primary-color)',
                        font: 'var(--font-body)',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ color: 'var(--text-tertiary-color)', display: 'flex', flexShrink: 0 }}>{action.icon}</span>
                      <span style={{ flexGrow: 1 }}>{action.label}</span>
                      {isActive && <CornerDownLeft size={14} color="var(--text-tertiary-color)" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
