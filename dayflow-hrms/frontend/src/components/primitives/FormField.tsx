import React, { useState } from 'react';
import '../../design/tokens.css';

export interface FormFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  helperText,
  required = false,
  children,
  htmlFor,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', width: '100%', marginBottom: 'var(--space-md)' }}>
      {label && (
        <label htmlFor={htmlFor} style={{ font: 'var(--font-label)', color: 'var(--text-secondary-color)' }}>
          {label} {required && <span style={{ color: 'var(--color-danger-500)' }}>*</span>}
        </label>
      )}

      {children}

      {error ? (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger-700)', fontWeight: 500 }}>{error}</span>
      ) : helperText ? (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary-color)' }}>{helperText}</span>
      ) : null}
    </div>
  );
};

/**
 * Every field control (Input/Select/Textarea) shares this focus/error
 * treatment. Implemented via onFocus/onBlur state rather than relying on
 * the global :focus-visible rule in tokens.css, because these components
 * already set an inline `boxShadow` for their resting shadow — an inline
 * style always wins over a stylesheet rule of any specificity, so the
 * global focus ring would otherwise never actually appear.
 */
function useFieldFocusStyle(isError: boolean | undefined): {
  focusProps: { onFocus: () => void; onBlur: () => void };
  computedStyle: React.CSSProperties;
} {
  const [isFocused, setIsFocused] = useState(false);
  const borderColor = isError ? 'var(--color-danger-500)' : isFocused ? 'var(--focus-ring-color)' : 'var(--border-strong)';
  return {
    focusProps: { onFocus: () => setIsFocused(true), onBlur: () => setIsFocused(false) },
    computedStyle: {
      border: `1px solid ${borderColor}`,
      boxShadow: isFocused ? 'var(--focus-ring)' : 'var(--shadow-xs)',
    },
  };
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ isError, style, className = '', onFocus, onBlur, ...props }, ref) => {
  const { focusProps, computedStyle } = useFieldFocusStyle(isError);
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5625rem 0.875rem',
    fontSize: 'var(--text-sm)',
    color: 'var(--text-primary-color)',
    backgroundColor: props.disabled ? 'var(--bg-sunken)' : '#ffffff',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    transition: `border-color var(--transition-fast), box-shadow var(--transition-fast)`,
    ...computedStyle,
    ...style,
  };

  return (
    <input
      ref={ref}
      style={inputStyle}
      className={className}
      onFocus={(e) => { focusProps.onFocus(); onFocus?.(e); }}
      onBlur={(e) => { focusProps.onBlur(); onBlur?.(e); }}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  isError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ isError, style, children, className = '', onFocus, onBlur, ...props }, ref) => {
  const { focusProps, computedStyle } = useFieldFocusStyle(isError);
  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5625rem 0.875rem',
    fontSize: 'var(--text-sm)',
    color: 'var(--text-primary-color)',
    backgroundColor: '#ffffff',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    cursor: 'pointer',
    transition: `border-color var(--transition-fast), box-shadow var(--transition-fast)`,
    ...computedStyle,
    ...style,
  };

  return (
    <select
      ref={ref}
      style={selectStyle}
      className={className}
      onFocus={(e) => { focusProps.onFocus(); onFocus?.(e); }}
      onBlur={(e) => { focusProps.onBlur(); onBlur?.(e); }}
      {...props}
    >
      {children}
    </select>
  );
});

Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  isError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ isError, style, className = '', onFocus, onBlur, ...props }, ref) => {
  const { focusProps, computedStyle } = useFieldFocusStyle(isError);
  const textareaStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    fontSize: 'var(--text-sm)',
    color: 'var(--text-primary-color)',
    backgroundColor: '#ffffff',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: `border-color var(--transition-fast), box-shadow var(--transition-fast)`,
    ...computedStyle,
    ...style,
  };

  return (
    <textarea
      ref={ref}
      style={textareaStyle}
      className={className}
      onFocus={(e) => { focusProps.onFocus(); onFocus?.(e); }}
      onBlur={(e) => { focusProps.onBlur(); onBlur?.(e); }}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';
