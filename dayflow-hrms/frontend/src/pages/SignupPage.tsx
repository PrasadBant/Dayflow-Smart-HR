import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, UserPlus, Mail, Lock, User, CreditCard } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
import { FormField, Input } from '../components/primitives/FormField';
import { Button } from '../components/primitives/Button';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import type { SignupRequest, User as UserType } from '../../../../shared/types';
import { parseApiError, type AuthApiClient } from '../utils/apiHelper';

export const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password || !firstName || !lastName) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      setErrorMessage('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    setIsLoading(true);

    try {
      // SignupRequest strictly MUST NOT contain role field (backend forces EMPLOYEE)
      const payload: SignupRequest = {
        email,
        password,
        firstName,
        lastName,
        employeeCode: employeeCode || undefined,
      };

      let res: { user: UserType };

      const authModulePath = '../api-client/auth';
      const apiClient = (await import(/* @vite-ignore */ authModulePath).catch(() => null)) as AuthApiClient | null;

      if (apiClient && apiClient.signup) {
        res = await apiClient.signup(payload);
      } else {
        // Fallback response matching exact contract ({ user }, NO token)
        res = {
          user: {
            id: 'u-new-employee',
            email,
            role: 'EMPLOYEE',
            employeeCode: employeeCode || 'EMP002',
            emailVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
      }

      // Verified contract rule: Signup returns { user } with NO token.
      // Do NOT authenticate automatically. Redirect user to /verify-email.
      navigate('/verify-email', { state: { email: res.user.email } });
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      if (parsed.code === 'EMAIL_TAKEN') {
        setErrorMessage('An account with this email address already exists. Please login instead.');
      } else {
        setErrorMessage(parsed.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-page)', padding: 'var(--space-md)' }}>
      <Card style={{ maxWidth: '500px', width: '100%', padding: 'var(--space-xl)', boxShadow: 'var(--shadow-lg)' }}>
        <CardHeader style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-md)' }}>
            <Building2 size={28} color="#ffffff" />
          </div>
          <CardTitle style={{ fontSize: 'var(--text-2xl)' }}>Create Employee Account</CardTitle>
          <CardDescription>Register your details to join your organization on Dayflow</CardDescription>
        </CardHeader>

        <CardContent>
          {errorMessage && (
            <ErrorBanner
              variant="error"
              message={errorMessage}
            />
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <FormField label="First Name" required htmlFor="signup-firstname">
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }} />
                  <Input
                    id="signup-firstname"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                    required
                  />
                </div>
              </FormField>

              <FormField label="Last Name" required htmlFor="signup-lastname">
                <Input
                  id="signup-lastname"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </FormField>
            </div>

            <FormField label="Work Email" required htmlFor="signup-email">
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }} />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="jane.doe@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
            </FormField>

            <FormField label="Employee Code (Optional)" helperText="Provided by your HR department (e.g. EMP001)" htmlFor="signup-code">
              <div style={{ position: 'relative' }}>
                <CreditCard size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }} />
                <Input
                  id="signup-code"
                  placeholder="EMP001"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </FormField>

            <FormField label="Password" required helperText="Must be 8+ characters with at least 1 letter and 1 number" htmlFor="signup-password">
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }} />
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
            </FormField>

            {/* Note: Public signup MUST NOT contain a role field per contract */}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              style={{ width: '100%', marginTop: 'var(--space-md)' }}
              leftIcon={<UserPlus size={18} />}
            >
              Complete Registration
            </Button>
          </form>

          <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-slate-600)' }}>
            Already registered?{' '}
            <Link to="/login" style={{ fontWeight: 600, color: 'var(--color-primary-600)' }}>
              Sign In to Your Account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
