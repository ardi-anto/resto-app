/**
 * Main App Component with Routes
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SyncProvider } from './contexts/SyncContext';

import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { POSPage } from './pages/POSPage';
import { MenusPage } from './pages/MenusPage';
import { IngredientsPage } from './pages/IngredientsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { RolesPage } from './pages/RolesPage';

import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component with permission-based access
function ProtectedRoute({ children, permission }) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check permission if specified
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/pos" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/pos" replace />} />
        <Route path="pos" element={<POSPage />} />
        <Route 
          path="menus" 
          element={
            <ProtectedRoute permission="page.menus">
              <MenusPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="ingredients" 
          element={
            <ProtectedRoute permission="page.ingredients">
              <IngredientsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="reports" 
          element={
            <ProtectedRoute permission="page.reports">
              <ReportsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="sales" 
          element={
            <ProtectedRoute permission="page.sales_history">
              <SalesHistoryPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="roles" 
          element={
            <ProtectedRoute permission="role.view">
              <RolesPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="settings" 
          element={
            <ProtectedRoute permission="page.settings">
              <SettingsPage />
            </ProtectedRoute>
          } 
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SyncProvider>
            <AppRoutes />
            <Toaster 
              position="top-right" 
              toastOptions={{
                style: {
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                },
              }}
            />
          </SyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
