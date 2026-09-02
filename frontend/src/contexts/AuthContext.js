/**
 * Auth Context - manages authentication state with permissions
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('kedaiops_token');
    const savedUser = localStorage.getItem('kedaiops_user');
    
    if (token && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setPermissions(parsedUser.permissions || []);
      
      // Verify token is still valid
      authAPI.getMe()
        .then(res => {
          const userData = res.data.user;
          setUser(userData);
          setPermissions(userData.permissions || []);
          localStorage.setItem('kedaiops_user', JSON.stringify(userData));
        })
        .catch(() => {
          // Token invalid, clear auth
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await authAPI.login(email, password);
      const { token, user: userData } = response.data;
      
      localStorage.setItem('kedaiops_token', token);
      localStorage.setItem('kedaiops_user', JSON.stringify(userData));
      setUser(userData);
      setPermissions(userData.permissions || []);
      
      return userData;
    } catch (err) {
      const message = err.response?.data?.detail || 'Login gagal';
      setError(message);
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('kedaiops_token');
    localStorage.removeItem('kedaiops_user');
    setUser(null);
    setPermissions([]);
  };

  const hasRole = useCallback((...roles) => {
    return user && roles.includes(user.role);
  }, [user]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permission) => {
    return permissions.includes(permission);
  }, [permissions]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((...perms) => {
    return perms.some(p => permissions.includes(p));
  }, [permissions]);

  // Check if user has all of the specified permissions
  const hasAllPermissions = useCallback((...perms) => {
    return perms.every(p => permissions.includes(p));
  }, [permissions]);

  // Helper for page access
  const canAccessPage = useCallback((page) => {
    return hasPermission(`page.${page}`);
  }, [hasPermission]);

  // Helper for module actions (view, create, edit, delete)
  const can = useCallback((action, module) => {
    return hasPermission(`${module}.${action}`);
  }, [hasPermission]);

  // Refresh user data (e.g., after role change)
  const refreshUser = async () => {
    try {
      const res = await authAPI.getMe();
      const userData = res.data.user;
      setUser(userData);
      setPermissions(userData.permissions || []);
      localStorage.setItem('kedaiops_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      console.error('Failed to refresh user:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      permissions,
      loading, 
      error, 
      login, 
      logout, 
      hasRole,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canAccessPage,
      can,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;
