import React, { createContext, useState, useContext, useEffect } from 'react';
import authApi from '../api/auth.api';
import { getErrorMessage } from '../api/errors';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper function to check if token is expired
  const isTokenExpired = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= expirationTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // Treat invalid tokens as expired
    }
  };

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      // Validate token hasn't expired
      if (isTokenExpired(token)) {
        console.log('🔒 Token expired on app load - clearing session');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        try {
          setUser(JSON.parse(savedUser));
        } catch (error) {
          // Corrupt saved session - start clean
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const { token, user } = await authApi.login(email, password);

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(error, 'Login failed')
      };
    }
  };

  const register = async (username, email, password) => {
    try {
      const { token, user } = await authApi.register(username, email, password);

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(error, 'Registration failed')
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
