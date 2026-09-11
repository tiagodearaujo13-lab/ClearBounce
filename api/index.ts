import type { IncomingMessage, ServerResponse } from 'node:http';
import { getApp } from '../server/src/index.js';

let readyApp: Awaited<ReturnType<typeof getApp>> | undefined;

/**
 * Adaptador Vercel para a instância Fastify compartilhada.
 * O prefixo /api é removido porque as rotas da aplicação são versionadas em /v1.
 */
export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  readyApp ??= await getApp();
  await readyApp.ready();

  if (request.url?.startsWith('/api/')) {
    request.url = request.url.slice('/api'.length) || '/';
  }

  await new Promise<void>((resolve, reject) => {
    const onFinish = () => {
      response.off('finish', onFinish);
      response.off('close', onClose);
      resolve();
    };
    const onClose = () => {
      response.off('finish', onFinish);
      response.off('close', onClose);
      resolve();
    };
    response.once('finish', onFinish);
    response.once('close', onClose);
    readyApp!.server.emit('request', request, response);
    response.once('error', reject);
  });
}
