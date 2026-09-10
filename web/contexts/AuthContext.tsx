/**
 * @module AuthContext
 * @description Contexto global de autenticação.
 *
 * POR QUÊ Context API ao invés de Zustand/Redux?
 * - Auth é um estado simples (user + token + loading).
 * - Context API é suficiente para MVP sem overhead de libs externas.
 * - Se crescer (múltiplos stores complexos), migrar para Zustand.
 *
 * POR QUÊ localStorage para o token?
 * - Simplicidade para MVP. Em produção, httpOnly cookie é mais seguro.
 * - localStorage é vulnerável a XSS, mas nosso CSP no Next.js mitiga isso.
 * - Trade-off consciente: facilidade de desenvolvimento vs segurança ideal.
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api } from '@/services/api';

interface User {
  id: string;
  email: string;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

/**
 * Storage key para o token JWT.
 *
 * POR QUÊ prefixo @cleanmail?
 * - Evita colisão com outras aplicações no mesmo domínio (ex: localhost:3000).
 * - Padrão de namespace recomendado para localStorage.
 */
const TOKEN_KEY = '@cleanmail:token';
const USER_KEY = '@cleanmail:user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Restaura sessão do localStorage ao montar o componente.
   *
   * POR QUÊ useEffect e não inicialização direta no useState?
   * - localStorage não existe no servidor (SSR do Next.js).
   * - useEffect roda apenas no cliente, evitando hydration mismatch.
   */
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      } catch {
        // JSON inválido no localStorage — limpa tudo
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }

    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post('/v1/auth/login', { email, password });
    const { token: newToken, user: userData } = response.data;

    setToken(newToken);
    setUser(userData);

    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));

    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await api.post('/v1/auth/register', { email, password });
    // Após cadastro, faz login automaticamente
    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete api.defaults.headers.common['Authorization'];
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para consumir o contexto de autenticação.
 *
 * POR QUÊ hook customizado ao invés de useContext direto?
 * - Encapsula a validação: se usado fora do Provider, lança erro claro.
 * - DX melhor: `useAuth()` vs `useContext(AuthContext)`.
 */
export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider.');
  }
  return context;
}
