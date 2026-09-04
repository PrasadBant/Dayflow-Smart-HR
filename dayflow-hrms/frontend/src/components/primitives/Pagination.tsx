import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/**
 * Drives the real backend pagination contract (`Paginated<T> = { items, total }`,
 * `page`/`pageSize` query params — see shared/types.ts and
 * backend/src/services/pagination.util.ts) rather than any invented fields:
 * `totalPages` and hasNext/hasPrevious are derived here from `total` and the
 * `pageSize` the caller already knows it requested, not read off the response.
 */
export const Pagination: React.FC<PaginationProps> = ({ page, pageSize, total, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  if (total <= pageSize && page === 1) {
    // Everything fits on one page — no controls needed.
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-md)',
        marginTop: 'var(--space-md)',
        paddingTop: 'var(--space-md)',
        borderTop: '1px solid var(--border-color)',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate-500)' }}>
        Page {page} of {totalPages} · {total} total
      </span>
      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrevious}
          onClick={() => onPageChange(page - 1)}
          leftIcon={<ChevronLeft size={14} />}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
          rightIcon={<ChevronRight size={14} />}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
