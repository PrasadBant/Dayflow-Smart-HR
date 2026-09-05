import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { FormField, Input } from '../components/primitives/FormField';
import { Button } from '../components/primitives/Button';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import type { ResetPasswordRequest } from '@shared/types';
import { resetPassword } from '../api-client/auth';
import { parseApiError } from '../utils/apiHelper';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromLink = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!tokenFromLink) {
      setErrorMessage('This reset link is missing its token. Please request a new one.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const payload: ResetPasswordRequest = { token: tokenFromLink, newPassword };
      await resetPassword(payload);
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: unknown) {
      setErrorMessage(parseApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ font: 'var(--font-page-title)', color: 'var(--text-primary-color)' }}>Set a new password</h1>
        <p style={{ font: 'var(--font-body)', color: 'var(--text-secondary-color)', marginTop: '0.25rem' }}>
          Choose a new password for your account.
        </p>
      </div>

      {isSuccess ? (
        <ErrorBanner variant="success" title="Password reset" message="Redirecting you to sign in…" />
      ) : !tokenFromLink ? (
        <ErrorBanner variant="error" title="Invalid reset link" message="This link is missing its reset token. Please request a new password reset." />
      ) : (
        <>
          {errorMessage && <ErrorBanner variant="error" message={errorMessage} />}
          <form onSubmit={handleSubmit}>
            <FormField label="New password" required helperText="8+ characters with at least 1 letter and 1 number" htmlFor="reset-new-password">
              <div style={{ position: 'relative' }}>
                <Lock size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled-color)' }} />
                <Input id="reset-new-password" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ paddingLeft: '38px' }} required />
              </div>
            </FormField>
            <FormField label="Confirm new password" required htmlFor="reset-confirm-password">
              <div style={{ position: 'relative' }}>
                <Lock size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled-color)' }} />
                <Input id="reset-confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ paddingLeft: '38px' }} required />
              </div>
            </FormField>
            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} style={{ width: '100%', marginTop: 'var(--space-sm)' }} rightIcon={<ArrowRight size={18} />}>
              Reset password
            </Button>
          </form>
        </>
      )}

      <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', font: 'var(--font-body)', color: 'var(--text-secondary-color)' }}>
        <Link to="/login" style={{ fontWeight: 600 }}>Back to sign in</Link>
      </div>
    </AuthLayout>
  );
};
