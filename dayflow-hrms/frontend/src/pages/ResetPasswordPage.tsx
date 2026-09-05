import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { KeyRound, Lock, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-page)', padding: 'var(--space-md)' }}>
      <Card style={{ maxWidth: '440px', width: '100%', padding: 'var(--space-xl)', boxShadow: 'var(--shadow-lg)' }}>
        <CardHeader style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-md)' }}>
            <KeyRound size={28} color="#ffffff" />
          </div>
          <CardTitle style={{ fontSize: 'var(--text-2xl)' }}>Set a New Password</CardTitle>
          <CardDescription>Choose a new password for your account</CardDescription>
        </CardHeader>

        <CardContent>
          {isSuccess ? (
            <ErrorBanner
              variant="success"
              title="Password Reset Successfully!"
              message="Redirecting you to the login screen..."
            />
          ) : !tokenFromLink ? (
            <ErrorBanner
              variant="error"
              title="Invalid Reset Link"
              message="This link is missing its reset token. Please request a new password reset."
            />
          ) : (
            <>
              {errorMessage && <ErrorBanner variant="error" message={errorMessage} />}

              <form onSubmit={handleSubmit}>
                <FormField label="New Password" required helperText="Must be 8+ characters with at least 1 letter and 1 number" htmlFor="reset-new-password">
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }} />
                    <Input
                      id="reset-new-password"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ paddingLeft: '40px' }}
                      required
                    />
                  </div>
                </FormField>

                <FormField label="Confirm New Password" required htmlFor="reset-confirm-password">
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }} />
                    <Input
                      id="reset-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{ paddingLeft: '40px' }}
                      required
                    />
                  </div>
                </FormField>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  style={{ width: '100%', marginTop: 'var(--space-md)' }}
                  rightIcon={<ArrowRight size={18} />}
                >
                  Reset Password
                </Button>
              </form>
            </>
          )}

          <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-slate-600)' }}>
            <Link to="/login" style={{ fontWeight: 600, color: 'var(--color-primary-600)' }}>
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
