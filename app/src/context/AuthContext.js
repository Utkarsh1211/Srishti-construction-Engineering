import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';

const AuthContext = createContext(null);
const USER_KEY = 'ledger:user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await api.getStoredToken();
      const rawUser = await AsyncStorage.getItem(USER_KEY);
      if (token && rawUser) {
        setUser(JSON.parse(rawUser));
      }
      setLoading(false);
    })();
  }, []);

  const login = async (username, password) => {
    const res = await api.login(username, password); // stores JWT internally
    setUser(res.user);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.user));
  };

  const logout = async () => {
    await api.logout(); // clears stored JWT
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}