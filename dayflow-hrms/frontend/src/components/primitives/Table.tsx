import React from 'react';
import '../../design/tokens.css';

/**
 * A real <table>, not a stack of styled <div> rows — the div-row pattern
 * used throughout the previous version of every list page loses proper
 * column alignment, native table semantics for screen readers, and (below
 * 720px, via the .df-table-responsive rule in tokens.css) the automatic
 * "each cell becomes a labeled row" collapse that's what actually makes a
 * dense table usable on a phone instead of forcing a horizontal scroll.
 */
export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ children, className = '', style, ...props }) => (
  <div style={{ overflowX: 'auto', width: '100%' }}>
    <table
      className={`df-table-responsive ${className}`}
      style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)', ...style }}
      {...props}
    >
      {children}
    </table>
  </div>
);

export const Thead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, ...props }) => (
  <thead {...props}>{children}</thead>
);

export const Tbody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, ...props }) => (
  <tbody {...props}>{children}</tbody>
);

export interface TrProps extends React.HTMLAttributes<HTMLTableRowElement> {
  interactive?: boolean;
}

export const Tr: React.FC<TrProps> = ({ children, interactive = false, style, ...props }) => (
  <tr
    style={{
      borderBottom: '1px solid var(--border-subtle)',
      transition: `background-color ${'var(--transition-fast)'}`,
      cursor: interactive ? 'pointer' : undefined,
      ...style,
    }}
    onMouseEnter={(e) => { if (interactive) e.currentTarget.style.backgroundColor = 'var(--bg-sunken)'; }}
    onMouseLeave={(e) => { if (interactive) e.currentTarget.style.backgroundColor = 'transparent'; }}
    {...props}
  >
    {children}
  </tr>
);

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ children, style, ...props }) => (
  <th
    style={{
      textAlign: 'left',
      padding: '0.625rem var(--space-md)',
      font: 'var(--font-label)',
      color: 'var(--text-tertiary-color)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      borderBottom: '1px solid var(--border-default)',
      whiteSpace: 'nowrap',
      ...style,
    }}
    {...props}
  >
    {children}
  </th>
);

export interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /** Shown as the row label when the table collapses to stacked cards below 720px. */
  label?: string;
  numeric?: boolean;
}

export const Td: React.FC<TdProps> = ({ children, label, numeric = false, style, ...props }) => (
  <td
    data-label={label}
    style={{
      padding: '0.75rem var(--space-md)',
      color: 'var(--text-primary-color)',
      verticalAlign: 'middle',
      textAlign: numeric ? 'right' : 'left',
      fontVariantNumeric: numeric ? 'tabular-nums' : undefined,
      ...style,
    }}
    {...props}
  >
    {children}
  </td>
);
