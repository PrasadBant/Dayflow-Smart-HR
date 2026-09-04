import React, { useState, useEffect, useCallback } from 'react';
import { User, Mail, Phone, MapPin, Building2, Briefcase, Save } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
import { FormField, Input } from '../components/primitives/FormField';
import { Button } from '../components/primitives/Button';
import { Skeleton } from '../components/primitives/Skeleton';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import { Badge } from '../components/primitives/Badge';
import type { Employee, UpdateProfileRequest } from '@shared/types';
import { getProfile, updateMyProfile } from '../api-client/employees';
import { parseApiError } from '../utils/apiHelper';

export const ProfilePage: React.FC = () => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const emp = await getProfile();
      setEmployee(emp);
      setPhone(emp.phone || '');
      setAddress(emp.address || '');
      setProfilePictureUrl(emp.profilePictureUrl || '');
    } catch (err) {
      setLoadError(parseApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      const payload: UpdateProfileRequest = {
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        profilePictureUrl: profilePictureUrl.trim() || undefined,
      };
      const updated = await updateMyProfile(payload);
      setEmployee(updated);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(parseApiError(err).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <User size={24} color="var(--color-primary-500)" />
            <div>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Personal information, contact details, and organization settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadError && <ErrorBanner variant="error" message={loadError} onRetry={load} />}

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Skeleton height="40px" />
              <Skeleton height="40px" />
              <Skeleton height="40px" />
            </div>
          ) : employee ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-xl)' }}>
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                  <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                    {employee.firstName} {employee.lastName}
                  </div>
                  <Badge variant="employee">{employee.employeeCode}</Badge>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: 'var(--text-sm)', color: 'var(--color-slate-700)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={16} color="var(--color-slate-400)" /> {employee.email}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building2 size={16} color="var(--color-slate-400)" /> {employee.departmentName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Briefcase size={16} color="var(--color-slate-400)" /> {employee.position}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate-500)', marginTop: '0.25rem' }}>
                    Hired {employee.hireDate}
                  </div>
                </div>
              </div>

              <div>
                {saveSuccess && <ErrorBanner variant="success" message="Profile updated successfully." />}
                {saveError && <ErrorBanner variant="error" message={saveError} />}

                <form onSubmit={handleSave}>
                  <FormField label="Phone" htmlFor="profile-phone">
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }} />
                      <Input
                        id="profile-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1-555-0100"
                        style={{ paddingLeft: '34px' }}
                      />
                    </div>
                  </FormField>

                  <FormField label="Address" htmlFor="profile-address">
                    <div style={{ position: 'relative' }}>
                      <MapPin size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }} />
                      <Input
                        id="profile-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="123 Main St, City"
                        style={{ paddingLeft: '34px' }}
                      />
                    </div>
                  </FormField>

                  <FormField label="Profile Picture URL" htmlFor="profile-picture" helperText="Only phone, address, and profile picture can be self-edited">
                    <Input
                      id="profile-picture"
                      value={profilePictureUrl}
                      onChange={(e) => setProfilePictureUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </FormField>

                  <Button type="submit" variant="primary" isLoading={isSaving} leftIcon={<Save size={16} />}>
                    Save Changes
                  </Button>
                </form>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
