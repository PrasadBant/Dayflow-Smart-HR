import React from 'react';
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
        <label
          htmlFor={htmlFor}
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--color-slate-700)',
          }}
        >
          {label} {required && <span style={{ color: 'var(--color-danger-500)' }}>*</span>}
        </label>
      )}

      {children}

      {error ? (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger-500)', fontWeight: 500 }}>
          {error}
        </span>
      ) : helperText ? (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate-500)' }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ isError, style, className = '', ...props }, ref) => {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-slate-900)',
    backgroundColor: '#ffffff',
    border: `1px solid ${isError ? 'var(--color-danger-500)' : 'var(--color-slate-300)'}`,
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all var(--transition-fast)',
    ...style,
  };

  return (
    <input
      ref={ref}
      style={inputStyle}
      className={className}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  isError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ isError, style, children, className = '', ...props }, ref) => {
  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-slate-900)',
    backgroundColor: '#ffffff',
    border: `1px solid ${isError ? 'var(--color-danger-500)' : 'var(--color-slate-300)'}`,
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all var(--transition-fast)',
    cursor: 'pointer',
    ...style,
  };

  return (
    <select ref={ref} style={selectStyle} className={className} {...props}>
      {children}
    </select>
  );
});

Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  isError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ isError, style, className = '', ...props }, ref) => {
  const textareaStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-slate-900)',
    backgroundColor: '#ffffff',
    border: `1px solid ${isError ? 'var(--color-danger-500)' : 'var(--color-slate-300)'}`,
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    boxShadow: 'var(--shadow-sm)',
    minHeight: '80px',
    resize: 'vertical',
    transition: 'all var(--transition-fast)',
    ...style,
  };

  return (
    <textarea ref={ref} style={textareaStyle} className={className} {...props} />
  );
});

Textarea.displayName = 'Textarea';
