import { useState, useEffect, type ReactNode } from "react";
import { apiClient } from "../../lib/api-client";
import { getToken, setToken, removeToken } from "../../lib/token";
import type { Account, LoginResponse, RegisterResponse } from "../types";
import { AuthContext } from "./auth-context";

export { AuthContext, type AuthContextType } from "./auth-context";

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<Account | null>(null);
  const [authLoading, setAuthLoading] = useState(() => !!getToken());

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    apiClient.get<{ account: Account }>("/auth/me").then((result) => {
      if (result.ok) {
        setUser(result.data.account);
      }
      setAuthLoading(false);
    });
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const result = await apiClient.post<LoginResponse>("/auth/login", {
      email,
      password,
    });
    if (result.ok) {
      setToken(result.data.token);
      setUser(result.data.account);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
  ): Promise<void> => {
    const result = await apiClient.post<RegisterResponse>("/auth/register", {
      name,
      email,
      password,
    });
    if (result.ok) {
      setToken(result.data.token);
      setUser(result.data.account);
    }
  };

  const logout = (): void => {
    removeToken();
    setUser(null);
  };

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, authLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
