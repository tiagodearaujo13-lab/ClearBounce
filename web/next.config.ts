/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * POR QUÊ output: 'standalone'?
   * - Gera um bundle standalone que não precisa do node_modules em runtime.
   * - Ideal para deploy em Docker/Render — imagem menor e mais rápida.
   */
  // output: 'standalone', // Descomentar para deploy em container

  /**
   * POR QUÊ poweredByHeader: false?
   * - Remove o header "X-Powered-By: Next.js" das respostas.
   * - Reduz superfície de ataque — atacantes não sabem o framework usado.
   * - Prática de segurança recomendada (security through obscurity como camada extra).
   */
  poweredByHeader: false,
};

export default nextConfig;
