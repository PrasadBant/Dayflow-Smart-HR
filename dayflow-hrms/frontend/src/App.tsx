import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth, RequireRole } from './components/guards/RequireRole';
import { AppShell } from './components/layout/AppShell';

import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

import { DashboardPage } from './pages/DashboardPage';
import { LeavePage } from './pages/LeavePage';
import { AttendancePage } from './pages/AttendancePage';
import { ProfilePage } from './pages/ProfilePage';
import { PayrollPage } from './pages/PayrollPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { DocumentsPage } from './pages/DocumentsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Protected Application Routes inside AppShell */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="leave" element={<LeavePage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="documents" element={<DocumentsPage />} />

            {/* HR Only Protected Route */}
            <Route
              path="employees"
              element={
                <RequireRole allowedRole="HR">
                  <EmployeesPage />
                </RequireRole>
              }
            />
          </Route>

          {/* Fallback wildcard route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
