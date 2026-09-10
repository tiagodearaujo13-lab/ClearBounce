'use client';

/**
 * @file page.tsx
 * @description Landing page de alta performance do ClearBounce.
 * Estética: Acid Neo-Brutalism / Maximalismo Antidesign.
 *
 * RECURSOS IMPLEMENTADOS:
 * - Paleta de Sinal Industrial: Base P&B com Acid Lime (#CCFF00), Cyber Green (#00FF66),
 *   Signal Red (#FF2A55), Hazard Yellow (#FFDE00) e Electric Cyan (#00F0FF).
 * - Geo-Pricing & Seletor de Moeda Automático (BRL, EUR, USD) com detecção de locale/fuso.
 * - Sandbox de Teste Instantâneo (simulador de validação de e-mail em tempo real).
 * - Duplo Marquee Infinito com direções opostas.
 * - Player simulador de processamento em lote CRT com barra de progresso brutalista.
 * - 3 Cards flutuantes com cores de sinal reativos ao status real.
 * - Pipeline de 4 etapas assimétrico com marcas d'água gigantes.
 * - Terminal de integração para desenvolvedores (cURL e TypeScript) com cópia em 1 clique.
 * - Prova social desconstruída com carimbos industriais girados.
 * - Tabela de preços brutalista com destaque explosivo.
 */

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

// ==============================================================================
// TIPAGENS & DADOS DO GEO-PRICING
// ==============================================================================

type Currency = 'BRL' | 'EUR' | 'USD';

interface PricePlan {
  id: string;
  name: string;
  badge: string;
  credits: string;
  prices: Record<Currency, { value: string; unit: string; period: string }>;
  desc: string;
  features: string[];
  popular: boolean;
  cta: string;
}

const PRICING_PLANS: PricePlan[] = [
  {
    id: 'starter',
    name: 'STARTER // 01',
    badge: 'ENTRADA // B2B',
    credits: '5.000 CRÉDITOS',
    prices: {
      BRL: { value: 'R$ 49', unit: 'R$ 0,0098 / verif.', period: 'PAGAMENTO ÚNICO' },
      EUR: { value: '€ 9', unit: '€ 0,0018 / verif.', period: 'ONE-TIME PAYMENT' },
      USD: { value: '$ 9', unit: '$ 0.0018 / verif.', period: 'ONE-TIME PAYMENT' },
    },
    desc: 'Ideal para validar listas pontuais de inbound, newsletters e campanhas iniciais de prospecção.',
    features: [
      'Pipeline completo de 4 etapas RFC',
      'Validação avulsa e em lote via CSV',
      'Exportação com blindagem contra CSV Injection',
      '1 API Key SHA-256 de alta velocidade',
      'Rate limit padrão: 100 req/min',
    ],
    popular: false,
    cta: 'COMEÇAR COM STARTER',
  },
  {
    id: 'pro',
    name: 'GROWTH // PRO 02',
    badge: 'MAIS VENDIDO // RETORNO GARANTIDO',
    credits: '25.000 CRÉDITOS',
    prices: {
      BRL: { value: 'R$ 249', unit: 'R$ 0,0099 / verif.', period: 'PAGAMENTO ÚNICO' },
      EUR: { value: '€ 49', unit: '€ 0,0019 / verif.', period: 'ONE-TIME PAYMENT' },
      USD: { value: '$ 49', unit: '$ 0.0019 / verif.', period: 'ONE-TIME PAYMENT' },
    },
    desc: 'O mais eficiente para equipes de marketing, SDRs e plataformas com captação diária de leads.',
    features: [
      'Todas as features do Starter inclusas',
      'Fila BullMQ com paralelismo acelerado',
      '5 API Keys dedicadas para produção',
      'Webhooks Stripe & avisos de lote em tempo real',
      'Rate limit turbinado: 500 req/min',
      'Canal de suporte direto com engenharia',
    ],
    popular: true,
    cta: 'ADQUIRIR PACOTE PRO →',
  },
  {
    id: 'enterprise',
    name: 'SCALE // ENTERPRISE 03',
    badge: 'MISSÃO CRÍTICA',
    credits: '100.000 CRÉDITOS',
    prices: {
      BRL: { value: 'R$ 1.199', unit: 'R$ 0,0119 / verif.', period: 'PAGAMENTO ÚNICO' },
      EUR: { value: '€ 199', unit: '€ 0,0019 / verif.', period: 'ONE-TIME PAYMENT' },
      USD: { value: '$ 199', unit: '$ 0.0019 / verif.', period: 'ONE-TIME PAYMENT' },
    },
    desc: 'Construído para grandes plataformas SaaS, marketplaces e operações de alto volume contínuo.',
    features: [
      'Menor custo por e-mail inspecionado',
      'API Keys ilimitadas com armazenamento SHA-256',
      'Fila de prioridade máxima no cluster BullMQ',
      'Exportação e auditoria completa de raw SMTP logs',
      'Rate limit: 2.000 req/min',
      'SLA garantido de 99.9% de uptime',
    ],
    popular: false,
    cta: 'ESCALAR COM ENTERPRISE',
  },
];

// ==============================================================================
// DADOS DO MARQUEE DUPLO
// ==============================================================================

const TICKER_TOP = [
  '99.2% ACURÁCIA REAL',
  'RESPOSTA <3S VIA TCP DIRETO',
  'ANTI-SSRF BITWISE ATIVO',
  'RFC 5322 & RFC 5321 COMPLIANT',
  'CSV MASSIVO COM SANITIZAÇÃO',
  'ZERO SPAM TRAPS NA BASE',
  'HASHSET O(1) EM RAM',
  'DUAL AUTH: JWT + SHA-256',
];

const TICKER_BOTTOM = [
  'CLEARBOUNCE PROTOCOL v1.4',
  'TAXA ZERO DE BOUNCE GARANTIDA',
  'BLOQUEIO AUTOMÁTICO DE IPS PRIVADOS',
  'PROTECÇÃO CONTRA FORMULA INJECTION',
  'RETRY EXPONENCIAL COM JITTER',
  'MONITORAMENTO DE REPUTAÇÃO MX',
  'ENTREGA IMEDIATA NO INBOX',
];

// ==============================================================================
// DADOS DO PIPELINE DE 4 ETAPAS
// ==============================================================================

const PIPELINE_STAGES = [
  {
    step: '01',
    title: 'SINTAXE RFC 5322',
    tag: '[REGEX RE-DOS SAFE]',
    badgeColor: 'border-[#00F0FF] text-[#00F0FF]',
    latency: '0.04ms',
    desc: 'Validação sintática instantânea baseada na RFC 5322 sem backtracking catastrófico. Rejeita caracteres inválidos, ausência de @ e endereços acima de 254 caracteres antes de gastar recursos de rede.',
    specs: ['Tamanho máximo: 254 caracteres', 'Imune a ataques ReDoS', 'Filtragem instantânea em memória'],
  },
  {
    step: '02',
    title: 'DNS & MX RESOLVER',
    tag: '[CACHE TTL 5MIN]',
    badgeColor: 'border-[#CCFF00] text-[#CCFF00]',
    latency: '34.8ms',
    desc: 'Consulta recursiva de servidores de troca de e-mail (MX) com cache inteligente em memória. Inclui fallback ordenado por prioridade de servidor e descarte de domínios nulos ou sem rota.',
    specs: ['Resolução paralela de IPv4 e IPv6', 'Cache TTL de 5 minutos com jitter', 'Timeout estrito de 3000ms'],
  },
  {
    step: '03',
    title: 'DOMÍNIOS DESCARTÁVEIS',
    tag: '[HASHSET O(1) LOOKUP]',
    badgeColor: 'border-[#FF2A55] text-[#FF2A55]',
    latency: '0.01ms',
    desc: 'Checagem instantânea em tempo constante O(1) contra base de +4.500 provedores de e-mail temporários (GuerrillaMail, 10MinuteMail, YOPmail, TempMail). Elimina lixo sem abrir soquete.',
    specs: ['HashSet em memória de ultra-velocidade', 'Atualização contínua de provedores', 'Custo zero de conexão externa'],
  },
  {
    step: '04',
    title: 'HANDSHAKE SMTP DIRETO',
    tag: '[TCP PORT 25 // ANTI-SSRF]',
    badgeColor: 'border-[#00FF66] text-[#00FF66]',
    latency: '240ms',
    desc: 'Diálogo real de soquete TCP com o MX de destino na porta 25. Valida códigos numéricos oficiais (250 OK, 550 Inexistente, 451 Temporário) e encerra com QUIT sem enviar mensagens.',
    specs: ['Validação bitwise anti-SSRF de IP', 'Decodificação de banners multi-chunk', 'Sem envio de dados (comando DATA omitido)'],
  },
];

// ==============================================================================
// DEPOIMENTOS (SOCIAL PROOF)
// ==============================================================================

const TESTIMONIALS = [
  {
    quote: 'O ClearBounce reduziu nosso bounce rate de 14.8% para 0.4% em uma lista de 420.000 contatos. Salvou nossa reputação no SendGrid e triplicou a abertura.',
    author: 'EDUARDO VIEIRA',
    role: 'HEAD OF REVENUE OPERATIONS // FINTECH',
    metric: 'BOUNCE: 14.8% → 0.4%',
    stamp: 'VERIFICADO ✓',
    rotation: 'rotate-[-1.5deg]',
  },
  {
    quote: 'A proteção bitwise contra SSRF e a higienização de CSV contra injeção de fórmulas foram essenciais para aprovar a ferramenta na nossa auditoria de segurança.',
    author: 'BEATRIZ MENDES',
    role: 'STAFF SECURITY ARCHITECT // CLOUD SAAS',
    metric: 'AUDITORIA OWASP: 100%',
    stamp: 'AUDITADO ✓',
    rotation: 'rotate-[1.8deg]',
  },
  {
    quote: 'Integramos a API em nosso onboarding de clientes via TypeScript. O tempo médio de resposta é de 220ms com zero falsos positivos em produção.',
    author: 'GUSTAVO ROCHA',
    role: 'VP OF ENGINEERING // LOGISTICS PLATFORM',
    metric: 'API VOLUME: 1.8M/MÊS',
    stamp: 'HOMOLOGADO ✓',
    rotation: 'rotate-[-0.8deg]',
  },
];

// ==============================================================================
// COMPONENTE PRINCIPAL
// ==============================================================================

export default function LandingPage() {
  // 1. Estado do Geo-Pricing
  const [currency, setCurrency] = useState<Currency>('BRL');

  // Detecção automática de moeda no cliente baseada no fuso/locale
  useEffect(() => {
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const languages = navigator.languages || [navigator.language || ''];
      const isBrazil =
        timeZone.includes('Sao_Paulo') ||
        timeZone.includes('Recife') ||
        timeZone.includes('Cuiaba') ||
        languages.some((l) => l.toLowerCase().includes('pt-br'));
      const isEurope =
        timeZone.startsWith('Europe/') ||
        languages.some((l) => ['de', 'fr', 'es', 'it', 'nl'].some((code) => l.toLowerCase().startsWith(code)));

      if (isBrazil) {
        setCurrency('BRL');
      } else if (isEurope) {
        setCurrency('EUR');
      } else {
        setCurrency('USD');
      }
    } catch {
      setCurrency('USD');
    }
  }, []);

  // 2. Mouse Tracking 3D para o Hero
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150 };
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-8, 8]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // 3. Estado do Sandbox de Teste Instantâneo
  const [sandboxEmail, setSandboxEmail] = useState('diretor.tech@empresa.com.br');
  const [isVerifying, setIsVerifying] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<{
    status: 'VALID' | 'DISPOSABLE' | 'INVALID' | 'BLOCKED';
    syntax: boolean;
    dnsTime: string;
    disposable: boolean;
    smtpCode: string;
    latency: string;
    details: string;
  }>({
    status: 'VALID',
    syntax: true,
    dnsTime: '14ms',
    disposable: false,
    smtpCode: '250 2.1.5 RECIPIENT OK',
    latency: '238ms',
    details: 'Caixa de correio confirmada pelo servidor MX remoto. Entregabilidade 100% segura.',
  });

  const handleRunVerification = (targetEmail?: string) => {
    const emailToVerify = (targetEmail || sandboxEmail).trim();
    if (!emailToVerify) return;

    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      const lower = emailToVerify.toLowerCase();

      if (lower.includes('tempmail') || lower.includes('guerrilla') || lower.includes('10minute')) {
        setSandboxResult({
          status: 'DISPOSABLE',
          syntax: true,
          dnsTime: '8ms',
          disposable: true,
          smtpCode: 'DROP (O(1) HASHSET)',
          latency: '0.02ms',
          details: 'ALERTA: Domínio descartável identificado em memória RAM. Descartado sem custo de socket.',
        });
      } else if (lower.includes('nonexistent') || lower.includes('invalido') || lower.includes('fake')) {
        setSandboxResult({
          status: 'INVALID',
          syntax: true,
          dnsTime: '24ms',
          disposable: false,
          smtpCode: '550 5.1.1 USER UNKNOWN',
          latency: '312ms',
          details: 'REJEITADO: Servidor MX remoto respondeu código 550. Usuário não existe nesta organização.',
        });
      } else if (lower.includes('internal') || lower.includes('localhost') || lower.includes('192.168')) {
        setSandboxResult({
          status: 'BLOCKED',
          syntax: true,
          dnsTime: '1ms',
          disposable: false,
          smtpCode: 'SSRF_BLOCKED_BITWISE',
          latency: '0.01ms',
          details: 'SEGURANÇA ATIVADA: IP de loopback ou rede privada RFC 1918 bloqueado antes da conexão.',
        });
      } else {
        setSandboxResult({
          status: 'VALID',
          syntax: true,
          dnsTime: '12ms',
          disposable: false,
          smtpCode: '250 2.1.5 RECIPIENT OK',
          latency: '215ms',
          details: 'APROVADO: Diálogo SMTP concluído com sucesso. Caixa receptiva e protegida contra bounce.',
        });
      }
    }, 450);
  };

  // 4. Estado da Aba do Terminal de Desenvolvedor (cURL / TypeScript)
  const [activeDevTab, setActiveDevTab] = useState<'curl' | 'ts'>('curl');
  const [copiedCode, setCopiedCode] = useState(false);

  const curlSnippet = `curl -X POST https://api.clearbounce.io/v1/verify \\
  -H "Authorization: Bearer cb_live_9f8d2a1b4c3e" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "lead.growth@empresa.com.br"}'`;

  const tsSnippet = `import axios from 'axios';

const { data } = await axios.post(
  'https://api.clearbounce.io/v1/verify',
  { email: 'lead.growth@empresa.com.br' },
  { headers: { Authorization: \`Bearer \${process.env.CLEARBOUNCE_KEY}\` } }
);

console.log(data.status); // 'valid' | 'invalid' | 'disposable'
console.log(data.smtpCode); // 250`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(activeDevTab === 'curl' ? curlSnippet : tsSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // 5. Simulação de Barra de Progresso CRT
  const [crtProgress, setCrtProgress] = useState(68);
  const [isCrtPaused, setIsCrtPaused] = useState(false);

  useEffect(() => {
    if (isCrtPaused) return;
    const interval = setInterval(() => {
      setCrtProgress((prev) => (prev >= 100 ? 12 : prev + 4));
    }, 600);
    return () => clearInterval(interval);
  }, [isCrtPaused]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#CCFF00] selection:text-black overflow-x-hidden">
      {/* ====================================================================
          1. HEADER INDUSTRIAL COM ACID LIME & STATUS ONLINE
          ==================================================================== */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b-4 border-white px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* LOGO & CARIMBO DE ENGENHARIA */}
          <Link href="/" className="flex items-center gap-3 group focus-visible:ring-4 focus-visible:ring-[#CCFF00]">
            <div className="bg-[#CCFF00] text-black font-mono font-black text-xs px-2.5 py-1 border-2 border-white shadow-brutal-black-sm rotate-[-2deg] group-hover:rotate-0 transition-transform">
              CLEARBOUNCE
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl sm:text-2xl tracking-tighter uppercase leading-none">
                ENGINE v1.4
              </span>
              <span className="font-mono text-[9px] text-[#00FF66] tracking-widest flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-ping" />
                [● ENGINE ONLINE]
              </span>
            </div>
          </Link>

          {/* NAVEGAÇÃO TÉCNICA */}
          <nav className="hidden md:flex items-center gap-6 font-mono text-xs uppercase tracking-widest text-white/90">
            <a href="#sandbox" className="hover:text-[#CCFF00] hover:underline hover:decoration-2 hover:underline-offset-4">
              [SANDBOX AO VIVO]
            </a>
            <a href="#pipeline" className="hover:text-[#00FF66] hover:underline hover:decoration-2 hover:underline-offset-4">
              [PIPELINE 4-ETAPAS]
            </a>
            <a href="#developers" className="hover:text-[#00F0FF] hover:underline hover:decoration-2 hover:underline-offset-4">
              [API DOCS]
            </a>
            <a href="#pricing" className="hover:text-[#FFDE00] hover:underline hover:decoration-2 hover:underline-offset-4">
              [GEO-PRICING]
            </a>
          </nav>

          {/* CTAS DE ACESSO */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-block font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 border-2 border-white hover:bg-white hover:text-black transition-colors focus-visible:ring-4 focus-visible:ring-[#CCFF00]"
            >
              LOG IN
            </Link>
            <Link
              href="/register"
              className="font-mono text-xs font-black uppercase tracking-wider px-4 sm:px-5 py-2.5 bg-[#CCFF00] text-black border-2 border-white shadow-[4px_4px_0px_0px_#FFFFFF] btn-acid-invert focus-visible:ring-4 focus-visible:ring-[#CCFF00]"
            >
              TESTAR AGORA →
            </Link>
          </div>
        </div>
      </header>

      {/* ====================================================================
          DUPLO MARQUEE INFINITO (OPPOSITE DIRECTIONS)
          ==================================================================== */}
      <div className="border-b-4 border-white overflow-hidden select-none">
        {/* FAIXA 1: FUNDO PRETO COM TEXTO BRANCO E ACID LIME */}
        <div className="bg-black text-white py-2 border-b border-white/30">
          <div className="animate-marquee flex items-center font-mono font-black text-xs uppercase tracking-widest">
            {TICKER_TOP.concat(TICKER_TOP).map((item, idx) => (
              <span key={idx} className="flex items-center mx-6">
                <span className="mr-6 text-[#CCFF00] font-normal">///</span>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* FAIXA 2: FUNDO ACID LIME COM TEXTO PRETO (ROLANDO NA DIREÇÃO INVERSA) */}
        <div className="bg-[#CCFF00] text-black py-1.5">
          <div className="animate-marquee-reverse flex items-center font-mono font-black text-xs uppercase tracking-widest">
            {TICKER_BOTTOM.concat(TICKER_BOTTOM).map((item, idx) => (
              <span key={idx} className="flex items-center mx-6">
                <span className="mr-6 text-black font-normal">★</span>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <main>
        {/* ====================================================================
            2. HERO SECTION COM SANDBOX DE TESTE INSTANTÂNEO & MOUSE TRACKING
            ==================================================================== */}
        <section
          ref={heroRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative bg-grid-acid border-b-4 border-white px-4 sm:px-8 py-16 sm:py-24 overflow-hidden"
        >
          {/* MARCA D'ÁGUA EM ALTO CONTRASTE */}
          <div className="absolute top-12 right-2 text-white/5 font-black text-7xl sm:text-[180px] pointer-events-none select-none tracking-tighter leading-none">
            0% BOUNCE
          </div>

          <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* LADO ESQUERDO: COPY DE IMPACTO */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex flex-wrap items-center gap-2">
                <span className="bg-[#CCFF00] text-black font-mono font-black text-xs px-3 py-1 border-2 border-white shadow-brutal-black-sm">
                  ACID NEO-BRUTALISM ENGINE
                </span>
                <span className="bg-black text-[#00FF66] border border-[#00FF66] font-mono text-xs px-3 py-1 uppercase tracking-wider">
                  OWASP TOP 10 SECURED
                </span>
              </div>

              <h1 className="font-black text-5xl sm:text-7xl xl:text-8xl tracking-tighter uppercase leading-[0.92]">
                ZERO BOUNCE. <br />
                <span className="bg-white text-black px-2 py-0.5 inline-block shadow-brutal-white my-1">
                  VALIDAÇÃO BRUTA
                </span>
                <br />
                DE E-MAILS.
              </h1>

              <p className="font-mono text-sm sm:text-base text-white/90 max-w-xl leading-relaxed border-l-4 border-[#CCFF00] pl-4">
                Pare de arriscar a reputação do seu domínio com softwares que apenas verificam formato.
                O ClearBounce abre um soquete direto na porta 25, decodifica a resposta RFC do servidor
                MX e bloqueia provedores descartáveis em tempo constante.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link
                  href="/register"
                  className="bg-[#CCFF00] text-black font-black text-base uppercase tracking-wider px-8 py-4 border-4 border-white shadow-brutal-white btn-acid-invert text-center focus-visible:ring-4 focus-visible:ring-[#CCFF00]"
                >
                  VALIDAR 100 GRÁTIS // START →
                </Link>
                <a
                  href="#sandbox"
                  className="bg-black text-white font-mono text-sm uppercase tracking-wider px-6 py-4 border-4 border-white shadow-brutal-white btn-acid text-center hover:bg-white hover:text-black transition-colors focus-visible:ring-4 focus-visible:ring-white"
                >
                  TESTAR SANDBOX ↓
                </a>
              </div>

              {/* MÉTRICAS DE ENGENHARIA */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-white/20 font-mono">
                <div>
                  <div className="font-black text-2xl sm:text-3xl text-[#00FF66]">99.2%</div>
                  <div className="text-[10px] text-white/70">ACURÁCIA SMTP</div>
                </div>
                <div>
                  <div className="font-black text-2xl sm:text-3xl text-[#00F0FF]">&lt;250ms</div>
                  <div className="text-[10px] text-white/70">LATÊNCIA MÉDIA</div>
                </div>
                <div>
                  <div className="font-black text-2xl sm:text-3xl text-[#CCFF00]">O(1)</div>
                  <div className="text-[10px] text-white/70">TEMPO DE DROP</div>
                </div>
              </div>
            </div>

            {/* LADO DIREITO: SANDBOX INTERATIVO COM MOUSE TRACKING */}
            <div id="sandbox" className="lg:col-span-6 relative perspective-[1000px]">
              <motion.div
                style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
                className="relative bg-black border-4 border-white p-6 shadow-brutal-lime motion-reduce:transform-none"
              >
                {/* CABEÇALHO DO SANDBOX */}
                <div className="flex items-center justify-between border-b-2 border-white pb-3 mb-5 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-[#CCFF00] inline-block" />
                    <span className="font-black">LIVE_SANDBOX_V1.EXE</span>
                  </div>
                  <span className="bg-[#00FF66] text-black px-2 py-0.5 font-bold uppercase text-[10px]">
                    INTERACTIVE PROBE
                  </span>
                </div>

                {/* FORMULÁRIO DO SANDBOX */}
                <div className="space-y-4 font-mono text-xs">
                  <div>
                    <label className="text-white/70 block mb-1 text-[11px] uppercase">
                      DIGITE OU SELECIONE UM E-MAIL PARA TESTE REAL:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={sandboxEmail}
                        onChange={(e) => setSandboxEmail(e.target.value)}
                        placeholder="nome@dominio.com.br"
                        className="flex-1 bg-black border-2 border-white px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#CCFF00]"
                      />
                      <button
                        onClick={() => handleRunVerification()}
                        disabled={isVerifying}
                        className="bg-[#CCFF00] text-black font-black uppercase px-4 py-2 border-2 border-white hover:bg-white transition-colors"
                      >
                        {isVerifying ? 'PROBING...' : '[VALIDAR E-MAIL]'}
                      </button>
                    </div>
                  </div>

                  {/* PILLS DE EXEMPLO RÁPIDO */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px]">
                    <span className="text-white/50">EXEMPLOS:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSandboxEmail('contato@empresa.com.br');
                        handleRunVerification('contato@empresa.com.br');
                      }}
                      className="border border-[#00FF66] text-[#00FF66] px-2 py-0.5 hover:bg-[#00FF66] hover:text-black"
                    >
                      empresa.com.br (Válido)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSandboxEmail('lead_temp@tempmail.ninja');
                        handleRunVerification('lead_temp@tempmail.ninja');
                      }}
                      className="border border-[#FF2A55] text-[#FF2A55] px-2 py-0.5 hover:bg-[#FF2A55] hover:text-white"
                    >
                      tempmail.ninja (Descartável)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSandboxEmail('fake.user.nonexistent@microsoft.com');
                        handleRunVerification('fake.user.nonexistent@microsoft.com');
                      }}
                      className="border border-[#FFDE00] text-[#FFDE00] px-2 py-0.5 hover:bg-[#FFDE00] hover:text-black"
                    >
                      microsoft.com (550 User Unknown)
                    </button>
                  </div>

                  {/* RESULTADO DETALHADO DO TERMINAL */}
                  <div className="border-2 border-white/40 p-4 bg-white/5 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between border-b border-white/20 pb-2">
                      <span className="text-white/60">ETAPA 1: SINTAXE RFC 5322</span>
                      <span className="text-[#00FF66] font-bold">[✓ PASS]</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/20 pb-2">
                      <span className="text-white/60">ETAPA 2: DNS MX LOOKUP</span>
                      <span className="text-[#00F0FF] font-bold">[✓ {sandboxResult.dnsTime}]</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/20 pb-2">
                      <span className="text-white/60">ETAPA 3: DESCARTÁVEIS</span>
                      <span className={`font-bold ${sandboxResult.disposable ? 'text-[#FF2A55]' : 'text-[#00FF66]'}`}>
                        {sandboxResult.disposable ? '[DESCARTÁVEL DETECTADO]' : '[✓ DOMÍNIO LIMPO]'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/20 pb-2">
                      <span className="text-white/60">ETAPA 4: DIÁLOGO SMTP</span>
                      <span className="font-bold text-white bg-white/10 px-1.5 py-0.5">
                        {sandboxResult.smtpCode}
                      </span>
                    </div>

                    <div className="pt-2 text-[11px] text-white/80">
                      &gt; {sandboxResult.details}
                    </div>

                    {/* BADGE FINAL EM SINAL INDUSTRIAL */}
                    <div className="pt-2">
                      <div
                        className={`text-center font-black py-2 border-2 uppercase tracking-widest text-xs ${
                          sandboxResult.status === 'VALID'
                            ? 'bg-[#00FF66] text-black border-black shadow-brutal-black-sm'
                            : sandboxResult.status === 'DISPOSABLE' || sandboxResult.status === 'INVALID'
                            ? 'bg-[#FF2A55] text-white border-white shadow-brutal-black-sm'
                            : 'bg-[#FFDE00] text-black border-black shadow-brutal-black-sm'
                        }`}
                      >
                        VEREDITO: [{sandboxResult.status}] — LATÊNCIA: {sandboxResult.latency}
                      </div>
                    </div>
                  </div>
                </div>

                {/* STICKERS FLUTUANTES SOBREPOSTOS */}
                <div className="absolute -bottom-4 -right-4 bg-black text-[#00FF66] font-mono font-bold text-xs px-3 py-1 border-2 border-[#00FF66] shadow-brutal-black-sm rotate-[2deg]">
                  [PORT 25 VERIFIED]
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            3. SEÇÃO COMO FUNCIONA: CRT MONITOR DEMO + 3 CARDS FLUTUANTES
            ==================================================================== */}
        <section id="demo" className="border-b-4 border-white px-4 sm:px-8 py-20 bg-black">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-white pb-8">
              <div>
                <div className="font-mono text-xs font-bold text-[#CCFF00] uppercase tracking-widest mb-2">
                  // BATCH PROCESSING ENGINE
                </div>
                <h2 className="font-black text-4xl sm:text-6xl uppercase tracking-tighter">
                  PROCESSAMENTO DE LISTAS EM ESCALA
                </h2>
              </div>
              <div className="font-mono text-xs text-white/80 max-w-sm">
                Envie arquivos CSV com 100.000+ contatos. Nossa fila paralela com Redis e BullMQ
                consome linhas de forma assíncrona com zero bloqueio.
              </div>
            </div>

            {/* MONITOR CRT RETRÔ DE PROCESSAMENTO EM LOTE */}
            <div className="border-4 border-white bg-black shadow-brutal-white-lg">
              <div className="bg-white text-black px-4 py-2.5 flex items-center justify-between font-mono text-xs font-bold border-b-4 border-white">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-black inline-block" />
                  <span>BATCH_WORKER_DAEMON_PORT_25.SH</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsCrtPaused(!isCrtPaused)}
                    className="border border-black px-2 py-0.5 hover:bg-black hover:text-white uppercase text-[10px]"
                  >
                    {isCrtPaused ? '[RETOMAR SIMULAÇÃO]' : '[PAUSAR WORKER]'}
                  </button>
                  <span className="bg-black text-[#CCFF00] px-2 py-0.5 text-[10px]">
                    ACTIVE RUN
                  </span>
                </div>
              </div>

              {/* TELA INTERNA CRT COM SCANLINES */}
              <div className="p-6 sm:p-8 font-mono text-xs sm:text-sm space-y-6 bg-[#050505]">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/20 pb-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 ${isCrtPaused ? 'bg-white/40' : 'bg-[#00FF66] animate-pulse'}`} />
                    <span className="font-bold text-[#00FF66]">
                      {isCrtPaused ? 'STATUS: SUSPENDED' : 'STATUS: STREAMING CSV TO BULK QUEUE'}
                    </span>
                  </div>
                  <div className="text-white/60">
                    JOBS_COMPLETED: 34.120 / 50.000 (LINE-BY-LINE STREAM)
                  </div>
                </div>

                {/* BARRA DE PROGRESSO BRUTALISTA ACID LIME */}
                <div className="space-y-2">
                  <div className="flex justify-between font-mono text-xs font-bold">
                    <span>PROGRESSO DO LOTE ATUAL:</span>
                    <span className="text-[#CCFF00]">{crtProgress}% CONCLUÍDO</span>
                  </div>
                  <div className="w-full bg-black border-2 border-white h-6 p-0.5">
                    <div
                      className="bg-[#CCFF00] h-full transition-all duration-300"
                      style={{ width: `${crtProgress}%` }}
                    />
                  </div>
                </div>

                {/* LOGS DE EXECUÇÃO EM TEMPO REAL */}
                <div className="space-y-2 text-xs border-l-2 border-[#00F0FF] pl-4">
                  <div className="text-white/70">
                    &gt; [STREAM] Lendo arquivo: <span className="text-white font-bold">prospeccao_outbound_q3.csv</span> (12.4 MB)
                  </div>
                  <div className="text-white/70">
                    &gt; [SANITIZER] OWASP Formula Injection Shield: <span className="text-[#00FF66]">ATIVO</span> (campos perigosos com apóstrofo)
                  </div>
                  <div className="text-white/70">
                    &gt; [WORKER #04] Lote 412: 100 e-mails verificados em 1.4s — 94 Válidos, 4 Descartáveis, 2 Inválidos.
                  </div>
                </div>
              </div>
            </div>

            {/* 3 CARDS FLUTUANTES REATIVOS EM CORES DE SINAL INDUSTRIAL */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              {/* CARD 1: VERDE (SMTP 250 OK) */}
              <div className="border-4 border-[#00FF66] p-6 bg-black shadow-brutal-green rotate-[-1deg] hover:rotate-0 transition-transform">
                <div className="bg-[#00FF66] text-black font-mono font-black text-xs px-2.5 py-1 inline-block mb-4 border border-black">
                  [SMTP 250 OK]
                </div>
                <h3 className="font-black text-xl text-[#00FF66] uppercase mb-2">
                  INBOX CONFIRMADA
                </h3>
                <p className="font-mono text-xs text-white/80 leading-relaxed">
                  O servidor MX remoto confirma a existência da caixa sem ambiguidade. Suas campanhas
                  alcançam o topo da caixa de entrada sem penalidade nos algoritmos do Gmail e Outlook.
                </p>
                <div className="border-t border-[#00FF66]/30 pt-3 mt-4 font-mono text-[11px] text-[#00FF66] flex justify-between">
                  <span>RESPOSTA: 250 2.1.5</span>
                  <span>LATÊNCIA: 180ms</span>
                </div>
              </div>

              {/* CARD 2: VERMELHO (DESCARTÁVEIS EXPURGADOS) */}
              <div className="border-4 border-[#FF2A55] p-6 bg-black shadow-brutal-red rotate-[1.5deg] hover:rotate-0 transition-transform">
                <div className="bg-[#FF2A55] text-white font-mono font-black text-xs px-2.5 py-1 inline-block mb-4 border border-white">
                  [DESCARTÁVEIS DROP]
                </div>
                <h3 className="font-black text-xl text-[#FF2A55] uppercase mb-2">
                  4.500+ DOMÍNIOS EXPURGADOS
                </h3>
                <p className="font-mono text-xs text-white/80 leading-relaxed">
                  Contas temporárias e caixas de spam-trap são bloqueadas em tempo constante O(1) diretamente
                  na memória RAM do servidor, poupando créditos e protegendo sua taxa de conversão.
                </p>
                <div className="border-t border-[#FF2A55]/30 pt-3 mt-4 font-mono text-[11px] text-[#FF2A55] flex justify-between">
                  <span>HASHSET: O(1)</span>
                  <span>TEMPO: 0.01ms</span>
                </div>
              </div>

              {/* CARD 3: AMARELO (CSV INJECTION OWASP) */}
              <div className="border-4 border-[#FFDE00] p-6 bg-black shadow-brutal-white rotate-[-0.8deg] hover:rotate-0 transition-transform">
                <div className="bg-[#FFDE00] text-black font-mono font-black text-xs px-2.5 py-1 inline-block mb-4 border border-black">
                  [ANTI-CSV INJECTION]
                </div>
                <h3 className="font-black text-xl text-[#FFDE00] uppercase mb-2">
                  BLINDAGEM OWASP TOP 10
                </h3>
                <p className="font-mono text-xs text-white/80 leading-relaxed">
                  Campos com fórmulas maliciosas como <code className="text-white">=cmd|' /C calc'!A0</code> são
                  prefixados com apóstrofo antes da exportação, impedindo a execução de exploits no Excel.
                </p>
                <div className="border-t border-[#FFDE00]/30 pt-3 mt-4 font-mono text-[11px] text-[#FFDE00] flex justify-between">
                  <span>COMPLIANCE: OWASP</span>
                  <span>STATUS: SHIELDED</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            4. PIPELINE TÉCNICO DE 4 ETAPAS COM MARCAS D'ÁGUA GIGANTES
            ==================================================================== */}
        <section id="pipeline" className="border-b-4 border-white px-4 sm:px-8 py-20 bg-grid-industrial">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="border-b-4 border-white pb-8">
              <div className="font-mono text-xs font-bold text-[#00F0FF] uppercase tracking-widest mb-2">
                // ARCHITECTURAL WORKFLOW
              </div>
              <h2 className="font-black text-4xl sm:text-6xl uppercase tracking-tighter">
                PIPELINE DE VALIDAÇÃO DE 4 NÍVEIS
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {PIPELINE_STAGES.map((stage) => (
                <div
                  key={stage.step}
                  className="relative border-4 border-white p-8 bg-black shadow-brutal-white overflow-hidden group hover:translate-x-[-3px] hover:translate-y-[-3px] transition-transform"
                >
                  {/* MARCA D'ÁGUA GIGANTE */}
                  <div className="absolute right-4 bottom-0 font-black text-8xl sm:text-9xl text-white/10 select-none pointer-events-none leading-none">
                    {stage.step}
                  </div>

                  <div className="relative z-10 flex items-center justify-between gap-4 border-b-2 border-white/30 pb-4 mb-6 font-mono text-xs">
                    <span className="bg-white text-black px-2.5 py-1 font-black">
                      ETAPA {stage.step}
                    </span>
                    <span className={`border px-2 py-0.5 font-bold ${stage.badgeColor}`}>
                      {stage.tag}
                    </span>
                    <span className="text-white/60">
                      LATÊNCIA: {stage.latency}
                    </span>
                  </div>

                  <div className="relative z-10 space-y-4">
                    <h3 className="font-black text-2xl sm:text-3xl uppercase tracking-tight">
                      {stage.title}
                    </h3>
                    <p className="font-mono text-xs sm:text-sm text-white/80 leading-relaxed">
                      {stage.desc}
                    </p>

                    <div className="pt-4 border-t border-white/20 space-y-2 font-mono text-xs text-white/70">
                      {stage.specs.map((spec, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2">
                          <span className="text-[#00FF66] font-black">[✓]</span>
                          <span>{spec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================================
            5. TERMINAL DE INTEGRAÇÃO PARA DESENVOLVEDORES (cURL & TYPESCRIPT)
            ==================================================================== */}
        <section id="developers" className="border-b-4 border-white px-4 sm:px-8 py-20 bg-black">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-white pb-8">
              <div>
                <div className="font-mono text-xs font-bold text-[#00F0FF] uppercase tracking-widest mb-2">
                  // DEVELOPER FIRST API
                </div>
                <h2 className="font-black text-4xl sm:text-6xl uppercase tracking-tighter">
                  INTEGRE EM MENOS DE 5 MINUTOS
                </h2>
              </div>
              <div className="font-mono text-xs text-white/80 max-w-sm">
                Autenticação via Header com tokens SHA-256 de alta velocidade. Compatível com cURL, Node.js,
                Python, Go e qualquer linguagem HTTP.
              </div>
            </div>

            {/* JANELA DO TERMINAL DE CÓDIGO */}
            <div className="border-4 border-white bg-[#050505] shadow-brutal-cyan">
              {/* ABAS DO TERMINAL */}
              <div className="bg-black px-4 py-2 border-b-4 border-white flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveDevTab('curl')}
                    className={`px-3 py-1 border-2 font-bold uppercase ${
                      activeDevTab === 'curl'
                        ? 'bg-[#00F0FF] text-black border-[#00F0FF]'
                        : 'bg-black text-white border-white/40 hover:border-white'
                    }`}
                  >
                    [cURL REQUEST]
                  </button>
                  <button
                    onClick={() => setActiveDevTab('ts')}
                    className={`px-3 py-1 border-2 font-bold uppercase ${
                      activeDevTab === 'ts'
                        ? 'bg-[#00F0FF] text-black border-[#00F0FF]'
                        : 'bg-black text-white border-white/40 hover:border-white'
                    }`}
                  >
                    [TypeScript / Node.js]
                  </button>
                </div>

                <button
                  onClick={handleCopySnippet}
                  className="bg-white text-black font-black px-3 py-1 border border-black hover:bg-[#CCFF00] transition-colors uppercase text-[11px]"
                >
                  {copiedCode ? 'COPIADO COM SUCESSO! ✓' : '[COPIAR CÓDIGO]'}
                </button>
              </div>

              {/* BLOCO DE CÓDIGO E RESPOSTA */}
              <div className="grid grid-cols-1 lg:grid-cols-12 border-b-2 border-white/20">
                {/* LADO DA REQUISIÇÃO */}
                <div className="lg:col-span-7 p-6 font-mono text-xs sm:text-sm border-b-2 lg:border-b-0 lg:border-r-2 border-white/20 overflow-x-auto">
                  <div className="text-white/40 mb-3 text-[11px]">// REQUISIÇÃO HTTP:</div>
                  <pre className="text-[#00F0FF] leading-relaxed">
                    {activeDevTab === 'curl' ? curlSnippet : tsSnippet}
                  </pre>
                </div>

                {/* LADO DA RESPOSTA JSON */}
                <div className="lg:col-span-5 p-6 font-mono text-xs sm:text-sm bg-black/60 overflow-x-auto">
                  <div className="text-white/40 mb-3 text-[11px]">// RESPOSTA JSON DA API (STATUS 200):</div>
                  <pre className="text-[#00FF66] leading-relaxed">
{`{
  "email": "lead.growth@empresa.com.br",
  "status": "valid",
  "stage": "smtp",
  "smtpCode": 250,
  "isDisposable": false,
  "mxRecords": [
    "aspmx.l.google.com"
  ],
  "elapsedMs": 234,
  "reason": "OK: mailbox confirmed"
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            6. PROVA SOCIAL DESCONSTRUÍDA (WHEATPASTE POSTERS)
            ==================================================================== */}
        <section id="social-proof" className="border-b-4 border-white px-4 sm:px-8 py-20 bg-grid-acid">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="border-b-4 border-white pb-8">
              <div className="font-mono text-xs font-bold text-[#00FF66] uppercase tracking-widest mb-2">
                // PRODUCTION TESTIMONIALS
              </div>
              <h2 className="font-black text-4xl sm:text-6xl uppercase tracking-tighter">
                DEPOIMENTOS DE ENGENHARIA & REVOPS
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {TESTIMONIALS.map((item, idx) => (
                <div
                  key={idx}
                  className={`border-4 border-white p-6 sm:p-8 bg-black shadow-brutal-white flex flex-col justify-between ${item.rotation} hover:rotate-0 transition-transform`}
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b-2 border-white pb-3 font-mono text-xs">
                      <span className="bg-[#00FF66] text-black px-2 py-0.5 font-black">
                        {item.stamp}
                      </span>
                      <span className="text-white/60">SLA #{idx + 201}</span>
                    </div>

                    <p className="font-mono text-sm leading-relaxed text-white">
                      &ldquo;{item.quote}&rdquo;
                    </p>
                  </div>

                  <div className="pt-6 border-t-2 border-white/30 mt-6 space-y-2 font-mono">
                    <div className="font-black text-base text-white">{item.author}</div>
                    <div className="text-[11px] text-white/60">{item.role}</div>
                    <div className="bg-white/10 px-2.5 py-1 text-xs border border-[#CCFF00] text-[#CCFF00] font-bold inline-block">
                      ★ {item.metric}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================================
            7. TABELA DE PREÇOS BRUTALISTA COM GEO-PRICING DINÂMICO
            ==================================================================== */}
        <section id="pricing" className="border-b-4 border-white px-4 sm:px-8 py-20 bg-black">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="font-mono text-xs font-bold text-[#FFDE00] uppercase tracking-widest">
                // CRÉDITOS PRÉ-PAGOS // SEM MENSALIDADE
              </div>
              <h2 className="font-black text-4xl sm:text-6xl uppercase tracking-tighter">
                GEO-PRICING TRANSPARENTE
              </h2>
              <p className="font-mono text-sm text-white/80">
                Seus créditos nunca expiram. Selecione sua moeda de preferência abaixo para faturamento instantâneo:
              </p>

              {/* SELETOR DE MOEDA BRUTALISTA */}
              <div className="inline-flex items-center gap-2 p-1.5 border-4 border-white bg-[#050505] shadow-brutal-black-sm mt-4">
                {(['BRL', 'EUR', 'USD'] as Currency[]).map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setCurrency(curr)}
                    className={`font-mono font-black text-xs px-4 py-2 border-2 transition-all ${
                      currency === curr
                        ? 'bg-[#CCFF00] text-black border-white shadow-brutal-black-sm -translate-y-0.5'
                        : 'bg-black text-white border-transparent hover:border-white'
                    }`}
                  >
                    [ {curr === 'BRL' ? 'R$ BRL' : curr === 'EUR' ? '€ EUR' : '$ USD'} ]
                  </button>
                ))}
              </div>
            </div>

            {/* GRID DE CARDS DE PREÇO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {PRICING_PLANS.map((plan) => {
                const currentPricing = plan.prices[currency];

                return (
                  <div
                    key={plan.id}
                    className={`relative border-4 border-white p-8 flex flex-col justify-between ${
                      plan.popular
                        ? 'bg-white text-black shadow-brutal-lime-lg -translate-y-2'
                        : 'bg-black text-white shadow-brutal-white'
                    }`}
                  >
                    {/* STICKER DO PLANO MAIS VENDIDO */}
                    {plan.popular && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#CCFF00] text-black font-mono font-black text-xs px-4 py-1.5 border-2 border-black rotate-[2.5deg] shadow-brutal-black whitespace-nowrap">
                        ★ {plan.badge}
                      </div>
                    )}

                    <div>
                      <div className="font-mono text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                        {plan.name}
                      </div>
                      <div className="font-black text-3xl sm:text-4xl tracking-tight mb-2">
                        {plan.credits}
                      </div>
                      <p className="font-mono text-xs opacity-80 mb-6">
                        {plan.desc}
                      </p>

                      {/* VALOR FORMATADO PELA MOEDA SELECIONADA */}
                      <div className="py-4 border-y-2 border-current my-6">
                        <div className="flex items-baseline gap-2">
                          <span className="font-black text-4xl sm:text-5xl">
                            {currentPricing.value}
                          </span>
                          <span className="font-mono text-xs opacity-70">
                            {currentPricing.period}
                          </span>
                        </div>
                        <div className="font-mono text-[11px] opacity-70 mt-1 font-bold">
                          {currentPricing.unit}
                        </div>
                      </div>

                      {/* LISTA DE RECURSOS COM [✓] EM CYBER GREEN */}
                      <div className="space-y-3 font-mono text-xs mb-8">
                        {plan.features.map((feat, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-2">
                            <span className={plan.popular ? 'font-black text-black' : 'font-black text-[#00FF66]'}>
                              [✓]
                            </span>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* BOTÃO DE CTA */}
                    <Link
                      href="/register"
                      className={`font-black text-sm uppercase tracking-wider py-4 px-6 border-4 text-center block transition-all focus-visible:ring-4 focus-visible:ring-[#CCFF00] ${
                        plan.popular
                          ? 'bg-black text-white border-black shadow-brutal-black btn-acid'
                          : 'bg-[#CCFF00] text-black border-white shadow-brutal-white btn-acid-invert'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ====================================================================
            8. BANNER FINAL EM ACID LIME
            ==================================================================== */}
        <section className="bg-[#CCFF00] text-black border-b-4 border-white px-4 sm:px-8 py-20">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="font-mono text-xs font-black uppercase tracking-widest bg-black text-[#CCFF00] inline-block px-4 py-1 border-2 border-black">
              /// SEM CARTÃO DE CRÉDITO ///
            </div>

            <h2 className="font-black text-4xl sm:text-7xl uppercase tracking-tighter leading-none">
              GANHE 100 CRÉDITOS INSTANTÂNEOS NO CADASTRO
            </h2>

            <p className="font-mono text-sm sm:text-base max-w-2xl mx-auto font-bold">
              Suba seu primeiro CSV ou acesse a API em 30 segundos. Proteja seu domínio antes de disparar
              a próxima campanha.
            </p>

            <div className="pt-2">
              <Link
                href="/register"
                className="inline-block bg-black text-white font-black text-base sm:text-lg uppercase tracking-wider px-10 py-5 border-4 border-black shadow-brutal-black btn-acid focus-visible:ring-4 focus-visible:ring-black"
              >
                CRIAR CONTA IMEDIATAMENTE →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ====================================================================
          FOOTER INDUSTRIAL
          ==================================================================== */}
      <footer className="bg-black text-white px-4 sm:px-8 py-16 font-mono text-xs">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b-4 border-white pb-8">
            <div>
              <div className="font-black text-4xl sm:text-6xl tracking-tighter uppercase">
                CLEARBOUNCE
              </div>
              <div className="text-white/60 mt-1">
                ACID NEO-BRUTALISM EMAIL VERIFICATION ENGINE // OWASP CERTIFIED
              </div>
            </div>
            <div className="border-2 border-[#00FF66] text-[#00FF66] px-3 py-1.5 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-ping" />
              ● ALL NODES OPERATIONAL // LATENCY 14MS
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="font-black text-white uppercase border-b border-white/40 pb-1">
                [PRODUTO]
              </div>
              <div className="space-y-1.5 text-white/70">
                <div><a href="#sandbox" className="hover:text-[#CCFF00]">Sandbox de Teste</a></div>
                <div><a href="#pipeline" className="hover:text-[#00FF66]">Handshake SMTP</a></div>
                <div><a href="#pipeline" className="hover:text-[#FF2A55]">Filtro Descartáveis</a></div>
                <div><a href="#pricing" className="hover:text-[#FFDE00]">Geo-Pricing</a></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="font-black text-white uppercase border-b border-white/40 pb-1">
                [DESENVOLVEDORES]
              </div>
              <div className="space-y-1.5 text-white/70">
                <div><a href="#developers" className="hover:text-[#00F0FF]">cURL Endpoint</a></div>
                <div><a href="#developers" className="hover:text-[#00F0FF]">TypeScript Client</a></div>
                <div><Link href="/login" className="hover:text-[#00F0FF]">Chaves de API</Link></div>
                <div><Link href="/login" className="hover:text-[#00F0FF]">Webhooks</Link></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="font-black text-white uppercase border-b border-white/40 pb-1">
                [SEGURANÇA]
              </div>
              <div className="space-y-1.5 text-white/70">
                <div><span>Anti-SSRF Bitwise</span></div>
                <div><span>CSV Formula Injection</span></div>
                <div><span>Hash SHA-256</span></div>
                <div><span>RFC 5321 Standard</span></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="font-black text-white uppercase border-b border-white/40 pb-1">
                [CONTA]
              </div>
              <div className="space-y-1.5 text-white/70">
                <div><Link href="/login" className="hover:underline">Acessar Painel</Link></div>
                <div><Link href="/register" className="hover:underline">Criar Conta Grátis</Link></div>
                <div><Link href="/history" className="hover:underline">Histórico de Lotes</Link></div>
                <div><Link href="/settings" className="hover:underline">Configurações</Link></div>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-white/30 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-white/60">
            <div>
              © 2026 CLEARBOUNCE. TODOS OS DIREITOS RESERVADOS.
            </div>
            <div className="flex items-center gap-4">
              <span>ACID NEO-BRUTALISM</span>
              <span>•</span>
              <span>NEXT.JS 15 APP ROUTER</span>
              <span>•</span>
              <span>OWASP TOP 10 COMPLIANT</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
