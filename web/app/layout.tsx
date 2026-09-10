/**
 * @file layout.tsx
 * @description Root layout do Next.js — wrapper de toda a aplicação.
 *
 * POR QUÊ layout raiz?
 * - No App Router, layout.tsx é o template que envolve TODAS as páginas.
 * - Ideal para: fontes, metadata SEO, providers globais (auth, tema).
 * - Renderiza uma vez e persiste entre navegações (sem re-render).
 */

import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

/**
 * Metadata SEO global.
 *
 * POR QUÊ metadata aqui e não em cada página?
 * - Valores definidos aqui são herdados por todas as páginas.
 * - Páginas individuais podem sobrescrever com metadata própria.
 * - Evita duplicação de title/description em cada arquivo.
 */
export const metadata: Metadata = {
  title: {
    default: 'ClearBounce — Validação Bruta de E-mails',
    template: '%s | ClearBounce',
  },
  description:
    'Plataforma SaaS para validação e limpeza de listas de e-mails em escala. ' +
    'Detecte e-mails inválidos, descartáveis e inexistentes com nosso motor SMTP seguro.',
  keywords: [
    'validação de e-mail',
    'limpeza de lista',
    'verificação SMTP',
    'email validation',
    'email verification',
    'e-mail descartável',
  ],
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'ClearBounce',
    title: 'ClearBounce — Validação Bruta de E-mails',
    description:
      'Valide e limpe suas listas de e-mails em escala com verificação SMTP segura.',
  },
};

/**
 * POR QUÊ carregamento de fonte via CSS @import ao invés de next/font?
 * - next/font é ideal para auto-hospedagem, mas requer config adicional.
 * - @import do Google Fonts é mais simples para MVP e funciona em Vercel.
 * - Em produção, migrar para next/font para melhor performance (preload).
 */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        {/* Google Fonts — Inter para tipografia moderna */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#050505] text-white antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
