/**
 * @module useBatchProgress
 * @description Hook para polling do progresso de batch jobs.
 *
 * POR QUÊ polling ao invés de WebSocket?
 * - WebSocket adiciona complexidade de infra (conexão persistente, reconexão, etc).
 * - Polling com setInterval a cada 2s é suficiente para UX de progresso.
 * - Para MVP, simplicidade > real-time perfeito.
 * - Migrar para SSE (Server-Sent Events) quando escalar.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/services/api';

interface BatchProgress {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  totalEmails: number;
  processedEmails: number;
  progress: number; // 0-100
  createdAt: string;
  completedAt: string | null;
}

interface UseBatchProgressReturn {
  data: BatchProgress | null;
  isLoading: boolean;
  error: string | null;
  /** Para o polling manualmente */
  stop: () => void;
  /** Reinicia o polling */
  restart: () => void;
}

/**
 * @param jobId - ID do batch job para monitorar
 * @param intervalMs - Intervalo de polling em ms (padrão: 2000)
 *
 * POR QUÊ 2000ms?
 * - 1000ms é agressivo demais — gera muitas requests sem benefício perceptível.
 * - 5000ms é lento demais — o usuário fica ansioso sem ver mudança.
 * - 2000ms é o sweet spot: responsivo sem sobrecarregar a API.
 */
export function useBatchProgress(
  jobId: string | null,
  intervalMs: number = 2000
): UseBatchProgressReturn {
  const [data, setData] = useState<BatchProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!jobId) return;

    try {
      setIsLoading(true);
      const response = await api.get(`/v1/verify/batch/${jobId}`);
      setData(response.data);
      setError(null);

      /**
       * POR QUÊ parar o polling quando completo/falho?
       * - Não faz sentido continuar consultando um job que já terminou.
       * - Economiza requests e largura de banda.
       * - O status final é imutável — não vai mudar mais.
       */
      if (
        response.data.status === 'completed' ||
        response.data.status === 'failed'
      ) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao buscar progresso.');
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const restart = useCallback(() => {
    stop();
    if (jobId) {
      fetchProgress();
      intervalRef.current = setInterval(fetchProgress, intervalMs);
    }
  }, [jobId, fetchProgress, intervalMs, stop]);

  useEffect(() => {
    if (!jobId) return;

    // Fetch imediato + polling
    fetchProgress();
    intervalRef.current = setInterval(fetchProgress, intervalMs);

    /**
     * POR QUÊ cleanup no return?
     * - Se o componente desmontar (navegação), o interval precisa ser limpo.
     * - Sem cleanup, o polling continua rodando em background → memory leak.
     */
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [jobId, fetchProgress, intervalMs]);

  return { data, isLoading, error, stop, restart };
}
