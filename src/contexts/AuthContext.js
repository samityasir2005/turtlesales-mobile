import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isManager, setIsManager] = useState(false);

  // Bootstrap — read token from SecureStore on mount
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync("auth_token");
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (e) {
        console.error("Failed to read token:", e);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []);

  // Whenever the token changes, fetch user profile
  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsOwner(false);
      setIsManager(false);
      return;
    }
    const fetchUser = async () => {
      try {
        const res = await authAPI.dashboard();
        const userData = res.data?.user || res.data;
        setUser(userData);
      } catch (error) {
        if (error.response?.status === 401) {
          await signOut();
        }
      }
    };
    fetchUser();
  }, [token]);

  const signIn = useCallback(async (newToken) => {
    await SecureStore.setItemAsync("auth_token", newToken);
    setToken(newToken);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (_) {
      // best-effort
    }
    await SecureStore.deleteItemAsync("auth_token");
    setToken(null);
    setUser(null);
    setIsOwner(false);
    setIsManager(false);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authAPI.dashboard();
      const userData = res.data?.user || res.data;
      setUser(userData);
    } catch (_) {}
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        isLoading,
        isOwner,
        setIsOwner,
        isManager,
        setIsManager,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};

export default AuthContext;
