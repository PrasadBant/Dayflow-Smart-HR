import React from 'react';
import '../../design/tokens.css';

export interface AvatarProps {
  /** First + last name, or any two-part name — initials are derived from it. Falls back to a single-letter avatar if only one word is given (e.g. an email). */
  name: string;
  size?: 'sm' | 'md' | 'lg';
  /** Role-based tint — HR gets the restrained purple accent, everyone else the brand color. Defaults to 'employee'. */
  tone?: 'employee' | 'hr';
  style?: React.CSSProperties;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZE_MAP: Record<NonNullable<AvatarProps['size']>, { box: number; font: string }> = {
  sm: { box: 28, font: 'var(--text-xs)' },
  md: { box: 38, font: 'var(--text-sm)' },
  lg: { box: 56, font: 'var(--text-lg)' },
};

/**
 * The initials-circle used to be duplicated ad hoc in AppShell (sidebar
 * footer) and the profile/employee-context screens, each with slightly
 * different sizing and a hardcoded HR-purple-vs-primary color branch. One
 * component now owns that logic — see AppShell.tsx's original comment about
 * the purple-500/white contrast fix, preserved here as the tone default.
 */
export const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', tone = 'employee', style }) => {
  const { box, font } = SIZE_MAP[size];
  return (
    <div
      style={{
        width: box,
        height: box,
        minWidth: box,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: font,
        color: '#ffffff',
        backgroundColor: tone === 'hr' ? 'var(--color-purple-700)' : 'var(--color-primary-600)',
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </div>
  );
};
