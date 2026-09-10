/**
 * @module api
 * @description Cliente HTTP Axios configurado para comunicação com a API.
 *
 * POR QUÊ Axios ao invés de fetch?
 * - Interceptors para tratamento global de erros e auth.
 * - Transformação automática de JSON (request e response).
 * - Suporte nativo a upload com progresso (onUploadProgress).
 * - Cancelamento de requests via AbortController integrado.
 */

import axios from 'axios';

/**
 * Instância Axios configurada com base URL da API.
 *
 * POR QUÊ NEXT_PUBLIC_ prefix?
 * - Next.js só expõe variáveis de ambiente ao cliente se tiverem prefixo NEXT_PUBLIC_.
 * - Sem o prefixo, a variável existe apenas no servidor (RSC/API routes).
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333',
  timeout: 30000, // 30s — SMTP pode ser lento
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor de RESPOSTA para tratamento global de erros.
 *
 * POR QUÊ interceptor ao invés de try/catch em cada chamada?
 * - Erros comuns (401, 429, 500) são tratados uma vez, centralmente.
 * - Componentes individuais só precisam tratar erros específicos.
 * - Reduz duplicação de lógica de erro em toda a aplicação.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;

      switch (status) {
        case 401:
          /**
           * POR QUÊ redirecionar ao invés de mostrar erro?
           * - 401 significa que o token expirou ou é inválido.
           * - O usuário precisa fazer login novamente.
           * - Redirecionar para /login é a UX esperada.
           */
          if (typeof window !== 'undefined') {
            localStorage.removeItem('@cleanmail:token');
            localStorage.removeItem('@cleanmail:user');

            // Evita redirect loop: só redireciona se não estiver na página de login
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          }
          break;

        case 429:
          // Rate limit — mostra mensagem amigável
          console.warn('⚠️ Limite de requisições excedido. Aguarde antes de tentar novamente.');
          break;
      }
    }

    return Promise.reject(error);
  }
);
