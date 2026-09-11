/**
 * @module api
 * @description Cliente HTTP relativo em produção e apontando para a API local em desenvolvimento.
 */

import axios from 'axios';

export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? '/api'
  : process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('@cleanmail:token');
      localStorage.removeItem('@cleanmail:user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    if (error.response?.status === 429) {
      console.warn('Limite de requisições excedido. Aguarde antes de tentar novamente.');
    }
    return Promise.reject(error);
  },
);
