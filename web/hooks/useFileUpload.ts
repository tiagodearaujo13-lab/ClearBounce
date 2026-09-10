/**
 * @module useFileUpload
 * @description Hook para gerenciamento de upload de arquivos CSV.
 *
 * POR QUÊ hook customizado?
 * - Encapsula validação de tipo, tamanho, progress tracking.
 * - Reutilizável em qualquer página que precise de upload.
 * - Centraliza regras de negócio (só .csv, máximo 10MB).
 */

'use client';

import { useState, useCallback } from 'react';
import { api } from '@/services/api';

interface UploadState {
  file: File | null;
  progress: number; // 0-100
  isUploading: boolean;
  error: string | null;
  jobId: string | null;
}

interface UseFileUploadReturn extends UploadState {
  selectFile: (file: File) => void;
  upload: () => Promise<void>;
  reset: () => void;
}

/** Tamanho máximo: 10MB (mesmo limite do server) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Tipos MIME aceitos */
const ALLOWED_TYPES = ['text/csv', 'application/csv', 'text/plain'];

export function useFileUpload(): UseFileUploadReturn {
  const [state, setState] = useState<UploadState>({
    file: null,
    progress: 0,
    isUploading: false,
    error: null,
    jobId: null,
  });

  /**
   * Seleciona e valida o arquivo antes do upload.
   *
   * POR QUÊ validar no cliente?
   * - Feedback instantâneo: o usuário sabe ANTES do upload se o arquivo é válido.
   * - Economiza bandwidth: não envia 10MB para o servidor rejeitar.
   * - O servidor TAMBÉM valida (defense in depth) — nunca confie apenas no cliente.
   */
  const selectFile = useCallback((file: File) => {
    // Validação de tipo
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.csv')) {
      setState((prev) => ({
        ...prev,
        error: 'Formato inválido. Selecione um arquivo .csv.',
        file: null,
      }));
      return;
    }

    // Validação de tamanho
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      setState((prev) => ({
        ...prev,
        error: `Arquivo muito grande (${sizeMB}MB). Máximo permitido: 10MB.`,
        file: null,
      }));
      return;
    }

    setState({
      file,
      progress: 0,
      isUploading: false,
      error: null,
      jobId: null,
    });
  }, []);

  /**
   * Envia o arquivo para a API.
   *
   * POR QUÊ FormData?
   * - Multipart/form-data é o padrão para upload de arquivos via HTTP.
   * - O servidor Fastify usa @fastify/multipart para processamento.
   */
  const upload = useCallback(async () => {
    if (!state.file) {
      setState((prev) => ({ ...prev, error: 'Nenhum arquivo selecionado.' }));
      return;
    }

    setState((prev) => ({ ...prev, isUploading: true, error: null, progress: 0 }));

    try {
      const formData = new FormData();
      formData.append('file', state.file);

      const response = await api.post('/v1/verify/batch', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        /**
         * POR QUÊ onUploadProgress?
         * - Mostra ao usuário o progresso do UPLOAD (antes do processamento).
         * - Axios calcula automaticamente % baseado em bytes enviados vs total.
         */
        onUploadProgress: (progressEvent) => {
          const percent = progressEvent.total
            ? Math.round((progressEvent.loaded / progressEvent.total) * 100)
            : 0;
          setState((prev) => ({ ...prev, progress: percent }));
        },
      });

      setState((prev) => ({
        ...prev,
        isUploading: false,
        jobId: response.data.jobId,
        progress: 100,
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isUploading: false,
        error: err.response?.data?.message ?? 'Erro ao fazer upload do arquivo.',
      }));
    }
  }, [state.file]);

  const reset = useCallback(() => {
    setState({
      file: null,
      progress: 0,
      isUploading: false,
      error: null,
      jobId: null,
    });
  }, []);

  return {
    ...state,
    selectFile,
    upload,
    reset,
  };
}
