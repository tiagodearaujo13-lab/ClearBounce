'use client';

/**
 * @file page.tsx
 * @description Landing page de alta performance do ClearBounce.
 * Estética: Maximalismo Antidesign / Neo-Brutalismo Puro Monocromático.
 *
 * CARACTERÍSTICAS:
 * - Paleta estrita preto e branco (#000000 / #FFFFFF)
 * - Bordas sólidas grossas (border-2 e border-4), zero arredondamento (rounded-none)
 * - Sombras duras de projeção angular (shadow-[6px_6px_0px_0px_#ffffff])
 * - Tipografia combinada: Sans-serif Display condensada ultra-pesada + Monospace técnica
 * - Interatividade tátil com mouse tracking 3D, terminal simulado ao vivo e marquee infinito
 */

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

// ==============================================================================
// DADOS ESTÁTICOS DO SISTEMA
// ==============================================================================

const TICKER_ITEMS = [
  '99.2% ACCURACY RATIO',
  'SUB-3S SMTP HANDSHAKE',
  'RFC 5322 & RFC 5321 COMPLIANT',
  'BITWISE SSRF PROOF (IP/IPV6)',
  'CSV FORMULA INJECTION NEUTRALIZED',
  'HASHSET O(1) DISPOSABLE DROP',
  'DUAL AUTH: JWT + SHA-256 API KEYS',
  'ZERO FALSE POSITIVES IN PRODUCTION',
  'REAL-TIME DNS MX CACHE (5M TTL)',
];

const PIPELINE_STAGES = [
  {
    step: '01',
    title: 'SINTAXE RFC 5322',
    tag: '[REGEX RE-DOS SAFE]',
    latency: '0.04ms',
    desc: 'Varredura lexical rígida baseada na RFC 5322 simplificada. Rejeita caracteres ilegais, múltiplos @, ausência de domínio e endereços com mais de 254 caracteres antes de qualquer chamada externa.',
    specs: ['Max length: 254 chars', 'Proteção ReDoS', 'Regex sem backtracking catastrófico'],
  },
  {
    step: '02',
    title: 'DNS & MX RESOLVER',
    tag: '[CACHE TTL 5MIN]',
    latency: '38.2ms',
    desc: 'Consulta recursiva de registros MX autoritativos com fallback para registros A. Utiliza cache em memória de alta velocidade com TTL de 5 minutos, retry exponencial e timeout de 3000ms.',
    specs: ['Resolução paralela IPv4/IPv6', 'Ordenação por prioridade MX', 'Detecção de servidores nulos'],
  },
  {
    step: '03',
    title: 'DOMÍNIOS DESCARTÁVEIS',
    tag: '[HASHSET O(1) LOOKUP]',
    latency: '0.01ms',
    desc: 'Verificação em tempo constante O(1) contra base ativa de +400 provedores de e-mail temporários (GuerrillaMail, 10MinuteMail, TempMail). Evita custos de soquete para lixo confirmado.',
    specs: ['HashSet em memória RAM', 'Carga atômica no boot', 'Zero overhead de I/O'],
  },
  {
    step: '04',
    title: 'HANDSHAKE SMTP DIRETO',
    tag: '[TCP PORT 25 // ANTI-SSRF]',
    latency: '280ms',
    desc: 'Conexão real de baixo nível via soquete TCP direto ao servidor MX de destino. Executa o diálogo SMTP (HELO, MAIL FROM, RCPT TO) sem enviar a mensagem (sem comando DATA).',
    specs: ['Blindagem SSRF bitwise pré-socket', 'Parser multi-chunk RFC', 'Encerramento com QUIT graceful'],
  },
];

const TESTIMONIALS = [
  {
    quote: 'O ClearBounce reduziu nossa taxa de bounce de 14.8% para 0.4% em uma base de 420.000 leads. Salvou nossa reputação de envio no SendGrid.',
    author: 'EDUARDO V.',
    role: 'HEAD OF GROWTH // FINTECH SCALE-UP',
    stamp: 'VERIFIED SENDER // 2026',
    metric: 'BOUNCE: 14.8% -> 0.4%',
    rotation: 'rotate-[-1.5deg]',
  },
  {
    quote: 'A proteção contra CSV Injection e a blindagem de SSRF bitwise foram os fatores determinantes para nossa equipe de segurança ofensiva aprovar a contratação.',
    author: 'MARIANA B.',
    role: 'STAFF SECURITY ENGINEER // B2B CLOUD',
    stamp: 'AUDITED // APPROVED',
    metric: 'SSRF MITIGATION: 100%',
    rotation: 'rotate-[1.2deg]',
  },
  {
    quote: 'A API responde em menos de 300ms com API Keys SHA-256 integradas direto na nossa pipeline de cadastro de usuários. Não existe concorrência.',
    author: 'FELIPE K.',
    role: 'VP OF ENGINEERING // LOGISTICS PLATFORM',
    stamp: 'API VOLUME: 2.4M/MÊS',
    metric: 'LATÊNCIA MÉDIA: 210MS',
    rotation: 'rotate-[-0.8deg]',
  },
];

const PRICING_PLANS = [
  {
    id: 'starter',
    name: 'STARTER // 01',
    credits: '5.000 CRÉDITOS',
    price: 'R$ 49',
    unitPrice: 'R$ 0,0098 por validação',
    desc: 'Ideal para validação de listas pontuais e validação de cadastros em sites em estágio inicial.',
    features: [
      'Pipeline completo de 4 etapas',
      'Validação avulsa e em lote via CSV',
      'Exportação com sanitização contra CSV Injection',
      '1 API Key de acesso direto',
      'Rate limit: 60 req/min',
    ],
    popular: false,
    cta: 'ADQUIRIR PACOTE',
  },
  {
    id: 'pro',
    name: 'GROWTH // PRO 02',
    credits: '25.000 CRÉDITOS',
    price: 'R$ 149',
    unitPrice: 'R$ 0,0059 por validação',
    desc: 'O mais eficiente para equipes de marketing e vendas com prospecção ativa e campanhas contínuas.',
    features: [
      'Todas as features do Starter',
      'Processamento em paralelo acelerado',
      '5 API Keys de alta performance',
      'Webhooks de conclusão de lotes CSV',
      'Rate limit: 300 req/min',
      'Suporte prioritário via canal direto',
    ],
    popular: true,
    cta: 'ADQUIRIR PACOTE PRO',
  },
  {
    id: 'scale',
    name: 'SCALE // ENTERPRISE 03',
    credits: '100.000 CRÉDITOS',
    price: 'R$ 399',
    unitPrice: 'R$ 0,0039 por validação',
    desc: 'Desenvolvido para plataformas SaaS com alto volume diário de cadastros e integrações de missão crítica.',
    features: [
      'Menor custo por e-mail validado',
      'API Keys ilimitadas com hash SHA-256',
      'Fila de prioridade máxima no BullMQ',
      'Auditoria completa de logs SMTP',
      'Rate limit: 1.000 req/min',
      'SLA de disponibilidade 99.9%',
    ],
    popular: false,
    cta: 'ADQUIRIR ESCALA',
  },
];

// ==============================================================================
// COMPONENTE PRINCIPAL: LANDING PAGE
// ==============================================================================

export default function LandingPage() {
  // Estado para o terminal interativo simulado
  const [terminalIndex, setTerminalIndex] = useState(0);
  const [isTerminalPaused, setIsTerminalPaused] = useState(false);
  const [copiedLog, setCopiedLog] = useState(false);

  // Efeito de Mouse Tracking 3D para o Hero
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150 };
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [10, -10]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-10, 10]), springConfig);

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

  // Simulação de fluxo do terminal interativo
  const TERMINAL_LOGS = [
    {
      email: 'alexandre.silva@nubank.com.br',
      mx: 'aspmx.l.google.com',
      ip: '142.250.185.27',
      code: '250',
      status: 'VALID',
      stage: 'smtp',
      latency: '245ms',
      raw: '250 2.1.5 Recipient OK. Mailbox accepted for delivery.',
    },
    {
      email: 'fake.lead_992@guerrillamail.com',
      mx: 'mx.guerrillamail.com',
      ip: '198.51.100.4',
      code: '---',
      status: 'DISPOSABLE',
      stage: 'disposable',
      latency: '0.02ms',
      raw: 'DISPOSABLE DETECTED: GuerrillaMail matched in memory HashSet O(1). Dropped.',
    },
    {
      email: 'nonexistent.user.test@microsoft.com',
      mx: 'microsoft-com.mail.protection.outlook.com',
      ip: '104.47.53.36',
      code: '550',
      status: 'INVALID',
      stage: 'smtp',
      latency: '310ms',
      raw: '550 5.1.1 User unknown. The recipient mailbox does not exist.',
    },
    {
      email: 'security.lead@internal.corp.local',
      mx: '192.168.1.10',
      ip: '192.168.1.10',
      code: 'SSRF',
      status: 'BLOCKED',
      stage: 'ssrf',
      latency: '0.01ms',
      raw: 'SECURITY_ALERT: RFC 1918 Private IP address rejected by bitwise IPv4 validator.',
    },
  ];

  useEffect(() => {
    if (isTerminalPaused) return;
    const interval = setInterval(() => {
      setTerminalIndex((prev) => (prev + 1) % TERMINAL_LOGS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [isTerminalPaused]);

  const currentLog = TERMINAL_LOGS[terminalIndex]!;

  const handleCopyLog = () => {
    navigator.clipboard.writeText(JSON.stringify(currentLog, null, 2));
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black overflow-x-hidden">
      {/* ====================================================================
          NAVBAR: NEO-BRUTALISTA MONOCROMÁTICA
          ==================================================================== */}
      <header className="sticky top-0 z-50 bg-black border-b-4 border-white px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-3 group focus-visible:ring-4 focus-visible:ring-white">
            <div className="bg-white text-black font-mono font-black text-sm px-2.5 py-1 border-2 border-white rotate-[-2deg] group-hover:rotate-0 transition-transform">
              RAW // 01
            </div>
            <span className="font-black text-xl sm:text-2xl tracking-tighter uppercase">
              CLEARBOUNCE
            </span>
          </Link>

          {/* LINKS DE NAVEGAÇÃO TÉCNICA */}
          <nav className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-widest">
            <a href="#pipeline" className="hover:underline hover:decoration-3 hover:underline-offset-4">
              [PIPELINE 4-STEPS]
            </a>
            <a href="#interactive-demo" className="hover:underline hover:decoration-3 hover:underline-offset-4">
              [TERMINAL SIMULATOR]
            </a>
            <a href="#social-proof" className="hover:underline hover:decoration-3 hover:underline-offset-4">
              [DISPATCH LOGS]
            </a>
            <a href="#pricing" className="hover:underline hover:decoration-3 hover:underline-offset-4">
              [PRICING // B2B]
            </a>
          </nav>

          {/* CTAS DE ACESSO */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-block font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 border-2 border-white hover:bg-white hover:text-black transition-colors focus-visible:ring-4 focus-visible:ring-white"
            >
              LOG IN
            </Link>
            <Link
              href="/register"
              className="font-mono text-xs font-black uppercase tracking-wider px-4 sm:px-6 py-2.5 bg-white text-black border-2 border-white shadow-brutal-sm btn-brutal-invert focus-visible:ring-4 focus-visible:ring-white"
            >
              START FREE // 100 CREDITS
            </Link>
          </div>
        </div>
      </header>

      {/* ====================================================================
          TICKER CONTÍNUO (MARQUEE INFINITO SUPERIOR)
          ==================================================================== */}
      <div className="bg-white text-black border-b-4 border-white py-2.5 overflow-hidden select-none">
        <div className="animate-marquee flex items-center font-mono font-black text-xs uppercase tracking-widest">
          {TICKER_ITEMS.concat(TICKER_ITEMS).map((item, idx) => (
            <span key={idx} className="flex items-center mx-6">
              <span className="mr-6 font-mono font-normal">///</span>
              {item}
            </span>
          ))}
        </div>
      </div>

      <main>
        {/* ====================================================================
            HERO SECTION: COM MOUSE TRACKING, PARALLAX & CAMADAS ASSIMÉTRICAS
            ==================================================================== */}
        <section
          ref={heroRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative bg-grid-industrial border-b-4 border-white px-4 sm:px-8 py-16 sm:py-24 overflow-hidden"
        >
          {/* WATERMARK INDUSTRIAL NO FUNDO */}
          <div className="absolute top-10 right-4 text-white/5 font-black text-8xl sm:text-[180px] pointer-events-none select-none tracking-tighter leading-none">
            BOUNCE:0
          </div>

          <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* LADO ESQUERDO: HEADLINES PESADAS & STICKERS */}
            <div className="lg:col-span-7 space-y-8">
              {/* STICKER METADATA */}
              <div className="inline-flex flex-wrap items-center gap-3">
                <span className="bg-white text-black font-mono font-black text-xs px-3 py-1 border-2 border-white shadow-brutal-sm">
                  RFC 5321 DIRECT PROTOCOL
                </span>
                <span className="font-mono text-xs text-white/70 tracking-widest border border-white/40 px-3 py-1 uppercase">
                  ANTI-SSRF BITWISE ENGINE
                </span>
              </div>

              {/* HEADLINE PRINCIPAL GIGANTE */}
              <div className="relative">
                <h1 className="font-black text-5xl sm:text-7xl xl:text-8xl tracking-tighter uppercase leading-[0.92]">
                  VALIDAÇÃO <br />
                  <span className="bg-white text-black px-2 py-0 inline-block shadow-brutal-sm my-1">
                    BRUTA.
                  </span>
                  <br />
                  BOUNCE ZERO.
                </h1>
              </div>

              {/* DESCRIÇÃO DIRETA E AGRESSIVA */}
              <p className="font-mono text-sm sm:text-base text-white/90 max-w-xl leading-relaxed border-l-4 border-white pl-4">
                Pare de queimar seu domínio com suposições. O ClearBounce estabelece handshakes
                SMTP diretos na porta 25, decodifica respostas numéricas reais (250, 550, 451)
                e expurga domínios descartáveis em tempo constante.
              </p>

              {/* CTAS DE AÇÃO */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link
                  href="/register"
                  className="bg-white text-black font-black text-sm sm:text-base uppercase tracking-wider px-8 py-4 border-4 border-white shadow-brutal btn-brutal-invert text-center focus-visible:ring-4 focus-visible:ring-white"
                >
                  LIMPAR LISTA AGORA // GRÁTIS →
                </Link>
                <a
                  href="#interactive-demo"
                  className="bg-black text-white font-mono text-sm uppercase tracking-wider px-6 py-4 border-4 border-white shadow-brutal btn-brutal text-center hover:bg-white hover:text-black transition-colors focus-visible:ring-4 focus-visible:ring-white"
                >
                  VER TESTE AO VIVO ↓
                </a>
              </div>

              {/* MÉTRICAS DE IMPACTO INDUSTRIAL */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t-2 border-white/20 max-w-lg font-mono">
                <div>
                  <div className="font-black text-2xl sm:text-3xl">99.2%</div>
                  <div className="text-[10px] text-white/60 tracking-wider">PRECISÃO SMTP</div>
                </div>
                <div>
                  <div className="font-black text-2xl sm:text-3xl">&lt;300ms</div>
                  <div className="text-[10px] text-white/60 tracking-wider">LATÊNCIA MÉDIA</div>
                </div>
                <div>
                  <div className="font-black text-2xl sm:text-3xl">O(1)</div>
                  <div className="text-[10px] text-white/60 tracking-wider">DISPOSABLE DROP</div>
                </div>
              </div>
            </div>

            {/* LADO DIREITO: CONTAINER 3D INTERATIVO (MOUSE TRACKING & TILT) */}
            <div className="lg:col-span-5 relative perspective-[1000px]">
              <motion.div
                style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
                className="relative bg-black border-4 border-white p-6 shadow-brutal-lg motion-reduce:transform-none"
              >
                {/* CABEÇALHO DO CARD */}
                <div className="flex items-center justify-between border-b-2 border-white pb-4 mb-6 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-white block" />
                    <span className="font-bold">INSPECTION_FEED_V1</span>
                  </div>
                  <span className="bg-white text-black px-2 py-0.5 font-black">
                    LIVE SOCKET
                  </span>
                </div>

                {/* VISOR DO E-MAIL EM ANÁLISE */}
                <div className="space-y-4 font-mono text-xs">
                  <div className="bg-white/10 p-3 border-2 border-white/40">
                    <div className="text-white/60 text-[10px] uppercase">TARGET ADDRESS:</div>
                    <div className="font-bold text-sm text-white break-all">
                      director.ops@enterprise-corp.com
                    </div>
                  </div>

                  <div className="space-y-2 border-l-2 border-white pl-3">
                    <div className="flex justify-between">
                      <span className="text-white/60">SYNTAX PARSER:</span>
                      <span className="font-bold text-white">[OK: RFC 5322]</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">MX RECORD:</span>
                      <span className="font-bold text-white">mail.protection.outlook.com</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">SSRF VALIDATOR:</span>
                      <span className="font-bold text-white">[PASSED: PUBLIC_IP]</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">SMTP HANDSHAKE:</span>
                      <span className="bg-white text-black px-1 font-bold">250 2.1.5 ACCEPTED</span>
                    </div>
                  </div>

                  {/* CARIMBO DE RESULTADO BRUTALISTA */}
                  <div className="pt-2">
                    <div className="bg-white text-black font-black text-center py-3 border-2 border-black text-sm uppercase tracking-widest shadow-brutal-invert">
                      ★ DELIVERABLE // 100% INBOX READY
                    </div>
                  </div>
                </div>

                {/* STICKERS FLUTUANTES SOBREPOSTOS */}
                <div className="absolute -bottom-5 -right-5 bg-black text-white font-mono font-bold text-xs px-3 py-1.5 border-2 border-white shadow-brutal rotate-[-4deg]">
                  [LATENCY: 142MS]
                </div>
                <div className="absolute -top-4 -left-4 bg-white text-black font-mono font-black text-xs px-3 py-1 border-2 border-black shadow-brutal-invert rotate-[3deg]">
                  RAW PROTOCOL
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            SEÇÃO HOW IT WORKS: TERMINAL SIMULADOR RETRÔ + 3 CARDS FLUTUANTES
            ==================================================================== */}
        <section id="interactive-demo" className="border-b-4 border-white px-4 sm:px-8 py-20 bg-black">
          <div className="max-w-7xl mx-auto space-y-16">
            {/* TÍTULO DA SEÇÃO */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-white pb-8">
              <div>
                <div className="font-mono text-xs font-bold text-white/70 uppercase tracking-widest mb-2">
                  // REAL-TIME SYSTEM INSPECTOR
                </div>
                <h2 className="font-black text-4xl sm:text-6xl uppercase tracking-tighter">
                  COMO FUNCIONA NA PRÁTICA
                </h2>
              </div>
              <div className="font-mono text-xs text-white/80 max-w-sm">
                Conectamos diretamente ao soquete TCP dos servidores MX mundiais. Veja a simulação interativa
                do motor em execução.
              </div>
            </div>

            {/* JANELA DE SISTEMA RETRÔ / PLAYER DE TERMINAL */}
            <div className="border-4 border-white bg-black shadow-brutal-lg">
              {/* BARRA SUPERIOR RETRÔ DA JANELA */}
              <div className="bg-white text-black px-4 py-2 flex items-center justify-between font-mono text-xs font-bold border-b-4 border-white">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-black inline-block" />
                  <span>CLEARBOUNCE_TERMINAL_V1.EXE</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsTerminalPaused(!isTerminalPaused)}
                    className="border border-black px-2 py-0.5 hover:bg-black hover:text-white uppercase text-[10px]"
                    title="Pausar ou continuar o loop do simulador"
                  >
                    {isTerminalPaused ? '[RESUME]' : '[PAUSE]'}
                  </button>
                  <button
                    onClick={() => setTerminalIndex((prev) => (prev + 1) % TERMINAL_LOGS.length)}
                    className="border border-black px-2 py-0.5 hover:bg-black hover:text-white uppercase text-[10px]"
                  >
                    [NEXT SAMPLE]
                  </button>
                  <button
                    onClick={handleCopyLog}
                    className="border border-black px-2 py-0.5 hover:bg-black hover:text-white uppercase text-[10px]"
                  >
                    {copiedLog ? '[COPIED!]' : '[COPY LOG]'}
                  </button>
                </div>
              </div>

              {/* CONTEÚDO DO TERMINAL COM LOGS EM TEMPO REAL */}
              <div className="p-6 sm:p-8 font-mono text-xs sm:text-sm space-y-6">
                {/* STATUS BAR SUPERIOR */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/20 pb-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 ${isTerminalPaused ? 'bg-white/40' : 'bg-white animate-pulse'}`} />
                    <span className="font-bold uppercase tracking-wider">
                      {isTerminalPaused ? 'ENGINE: PAUSED' : 'ENGINE: ACTIVE MONITORING'}
                    </span>
                  </div>
                  <div className="text-white/60">
                    SAMPLE #{terminalIndex + 1} OF {TERMINAL_LOGS.length}
                  </div>
                </div>

                {/* LOGS ESTRUTURADOS */}
                <div className="space-y-3">
                  <div className="text-white/60">
                    &gt; TARGET EVALUATION: <span className="text-white font-bold">{currentLog.email}</span>
                  </div>
                  <div className="text-white/60">
                    &gt; RESOLVED MX HOST : <span className="text-white">{currentLog.mx}</span>
                  </div>
                  <div className="text-white/60">
                    &gt; MX IP VALIDATION: <span className="text-white">{currentLog.ip} [BITWISE SSRF SAFE]</span>
                  </div>
                  <div className="text-white/60">
                    &gt; RAW SOCKET LOG  : <span className="text-white font-bold">{currentLog.raw}</span>
                  </div>
                  <div className="text-white/60">
                    &gt; LATENCY REPORT  : <span className="text-white">{currentLog.latency}</span>
                  </div>
                </div>

                {/* BADGE DE VEREDITO FINAL */}
                <div className="pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/60 uppercase">VEREDITO:</span>
                    <span
                      className={`font-black text-sm px-3 py-1 border-2 ${
                        currentLog.status === 'VALID'
                          ? 'bg-white text-black border-white'
                          : 'bg-black text-white border-white'
                      }`}
                    >
                      [{currentLog.status}] — STAGE: {currentLog.stage.toUpperCase()}
                    </span>
                  </div>

                  {/* BARRA DE PROGRESSO ASCII */}
                  <div className="font-mono text-xs">
                    PROGRESS: [████████████████████░░] 91%
                  </div>
                </div>
              </div>
            </div>

            {/* 3 CARDS FLUTUANTES SOBREPOSTOS COM BADGES REAIS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
              {/* CARD 1: 250 OK */}
              <div className="border-4 border-white p-6 bg-black shadow-brutal rotate-[-1deg] hover:rotate-0 transition-transform">
                <div className="bg-white text-black font-mono font-black text-xs px-2 py-1 inline-block mb-4">
                  250 OK // VALID
                </div>
                <h3 className="font-black text-xl uppercase mb-2">CAIXA EXISTENTE</h3>
                <p className="font-mono text-xs text-white/80 leading-relaxed mb-4">
                  Servidor MX remoto respondeu com status positivo para o comando RCPT TO. Caixa de entrada
                  ativa, receptiva e apta para envio seguro sem bounce.
                </p>
                <div className="border-t border-white/30 pt-3 font-mono text-[11px] text-white/60 flex justify-between">
                  <span>RESPONSE: 250 2.1.5</span>
                  <span>TIME: 142ms</span>
                </div>
              </div>

              {/* CARD 2: SMTP CONNECTED */}
              <div className="border-4 border-white p-6 bg-black shadow-brutal rotate-[1.5deg] hover:rotate-0 transition-transform">
                <div className="bg-white text-black font-mono font-black text-xs px-2 py-1 inline-block mb-4">
                  SMTP CONNECTED
                </div>
                <h3 className="font-black text-xl uppercase mb-2">ANTI-SSRF BITWISE</h3>
                <p className="font-mono text-xs text-white/80 leading-relaxed mb-4">
                  Antes de abrir o soquete TCP na porta 25, o IP resolvido é submetido ao validador bitwise
                  bloqueando loopback (127.0.0.0/8), IPs privados (RFC 1918) e AWS metadata.
                </p>
                <div className="border-t border-white/30 pt-3 font-mono text-[11px] text-white/60 flex justify-between">
                  <span>PORT: 25 / DIRECT</span>
                  <span>TLS: NEGOTIATED</span>
                </div>
              </div>

              {/* CARD 3: DISPOSABLE DETECTED */}
              <div className="border-4 border-white p-6 bg-black shadow-brutal rotate-[-0.8deg] hover:rotate-0 transition-transform">
                <div className="bg-white text-black font-mono font-black text-xs px-2 py-1 inline-block mb-4">
                  DISPOSABLE: DROP
                </div>
                <h3 className="font-black text-xl uppercase mb-2">LIXO DETECTADO</h3>
                <p className="font-mono text-xs text-white/80 leading-relaxed mb-4">
                  E-mails de domínios como 10MinuteMail e GuerrillaMail são bloqueados em 0.01ms na memória
                  RAM, sem desperdiçar limite de conexão de soquete do servidor.
                </p>
                <div className="border-t border-white/30 pt-3 font-mono text-[11px] text-white/60 flex justify-between">
                  <span>HASHSET: MATCHED</span>
                  <span>COST: 0 CREDITS</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            PIPELINE DE 4 ETAPAS: BLOCOS ASSIMÉTRICOS COM NUMERAÇÃO GIGANTE
            ==================================================================== */}
        <section id="pipeline" className="border-b-4 border-white px-4 sm:px-8 py-20 bg-black">
          <div className="max-w-7xl mx-auto space-y-16">
            {/* CABEÇALHO DA SEÇÃO */}
            <div className="border-b-4 border-white pb-8">
              <div className="font-mono text-xs font-bold text-white/70 uppercase tracking-widest mb-2">
                // ZERO COMPROMISES PIPELINE
              </div>
              <h2 className="font-black text-4xl sm:text-6xl uppercase tracking-tighter">
                PIPELINE INDUSTRIAL EM 4 ETAPAS
              </h2>
            </div>

            {/* GRID DE CARDS COM MARCAS D'ÁGUA GIGANTES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {PIPELINE_STAGES.map((stage) => (
                <div
                  key={stage.step}
                  className="relative border-4 border-white p-8 bg-black shadow-brutal overflow-hidden group hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
                >
                  {/* NUMERAÇÃO GIGANTE EM MARCA D'ÁGUA */}
                  <div className="absolute right-4 bottom-0 font-black text-8xl sm:text-9xl text-white/10 select-none pointer-events-none leading-none">
                    {stage.step}
                  </div>

                  {/* HEADER DO CARD */}
                  <div className="relative z-10 flex items-center justify-between gap-4 border-b-2 border-white/40 pb-4 mb-6 font-mono text-xs">
                    <span className="bg-white text-black px-2.5 py-1 font-black">
                      ETAPA {stage.step}
                    </span>
                    <span className="text-white/60">{stage.tag}</span>
                    <span className="border border-white/40 px-2 py-0.5 text-white/80">
                      LATÊNCIA: {stage.latency}
                    </span>
                  </div>

                  {/* TÍTULO E DESCRIÇÃO */}
                  <div className="relative z-10 space-y-4">
                    <h3 className="font-black text-2xl sm:text-3xl uppercase tracking-tight">
                      {stage.title}
                    </h3>
                    <p className="font-mono text-xs sm:text-sm text-white/80 leading-relaxed">
                      {stage.desc}
                    </p>

                    {/* SPECS TÉCNICAS */}
                    <div className="pt-4 border-t border-white/20 space-y-2 font-mono text-xs text-white/70">
                      {stage.specs.map((spec, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2">
                          <span className="font-black text-white">[✓]</span>
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
            SOCIAL PROOF: DEPOIMENTOS DESTRUTURADOS ESTILO CARTAZES COLADOS
            ==================================================================== */}
        <section id="social-proof" className="border-b-4 border-white px-4 sm:px-8 py-20 bg-grid-industrial">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="border-b-4 border-white pb-8">
              <div className="font-mono text-xs font-bold text-white/70 uppercase tracking-widest mb-2">
                // PROVEN RESULTS IN PRODUCTION
              </div>
              <h2 className="font-black text-4xl sm:text-6xl uppercase tracking-tighter">
                QUEM CONFIA NA NOSSA API
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {TESTIMONIALS.map((t, idx) => (
                <div
                  key={idx}
                  className={`border-4 border-white p-6 sm:p-8 bg-black shadow-brutal flex flex-col justify-between ${t.rotation} hover:rotate-0 transition-transform`}
                >
                  <div className="space-y-6">
                    {/* CARIMBO SUPERIOR */}
                    <div className="flex items-center justify-between border-b-2 border-white pb-3 font-mono text-xs">
                      <span className="bg-white text-black px-2 py-0.5 font-bold">
                        {t.stamp}
                      </span>
                      <span className="text-white/60">DISPATCH #{idx + 104}</span>
                    </div>

                    {/* TEXTO DO DEPOIMENTO */}
                    <p className="font-mono text-sm leading-relaxed text-white">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </div>

                  {/* AUTOR & MÉTRICA */}
                  <div className="pt-6 border-t-2 border-white/30 mt-6 space-y-2 font-mono">
                    <div className="font-black text-base">{t.author}</div>
                    <div className="text-[11px] text-white/60">{t.role}</div>
                    <div className="bg-white/10 px-2 py-1 text-xs border border-white/30 font-bold inline-block">
                      ★ {t.metric}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================================
            TABELA DE PREÇOS BRUTALISTA: BORDAS 4PX, STICKER POPULAR E CTAS
            ==================================================================== */}
        <section id="pricing" className="border-b-4 border-white px-4 sm:px-8 py-20 bg-black">
          <div className="max-w-7xl mx-auto space-y-16">
            {/* CABEÇALHO */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="font-mono text-xs font-bold text-white/70 uppercase tracking-widest">
                // PAY-AS-YOU-GO // SEM MENSALIDADE
              </div>
              <h2 className="font-black text-4xl sm:text-6xl uppercase tracking-tighter">
                CRÉDITOS QUE NUNCA EXPIRAM
              </h2>
              <p className="font-mono text-sm text-white/80">
                Pague apenas pelo que verificar. Sem assinaturas surpresa ou planos recorrentes obrigatórios.
              </p>
            </div>

            {/* GRID DE CARDS DE PREÇO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {PRICING_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative border-4 border-white p-8 flex flex-col justify-between ${
                    plan.popular
                      ? 'bg-white text-black shadow-brutal-lg -translate-y-2'
                      : 'bg-black text-white shadow-brutal'
                  }`}
                >
                  {/* STICKER DO PLANO POPULAR */}
                  {plan.popular && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-black text-white font-mono font-black text-xs px-4 py-1.5 border-2 border-black rotate-[2.5deg] shadow-brutal-invert whitespace-nowrap">
                      [POPULAR // BEST DEAL]
                    </div>
                  )}

                  <div>
                    {/* NOME & CRÉDITOS */}
                    <div className="font-mono text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                      {plan.name}
                    </div>
                    <div className="font-black text-3xl sm:text-4xl tracking-tight mb-2">
                      {plan.credits}
                    </div>
                    <p className="font-mono text-xs opacity-80 mb-6">
                      {plan.desc}
                    </p>

                    {/* VALOR */}
                    <div className="py-4 border-y-2 border-current my-6">
                      <div className="flex items-baseline gap-2">
                        <span className="font-black text-4xl sm:text-5xl">{plan.price}</span>
                        <span className="font-mono text-xs opacity-70">PAGAMENTO ÚNICO</span>
                      </div>
                      <div className="font-mono text-[11px] opacity-70 mt-1">
                        {plan.unitPrice}
                      </div>
                    </div>

                    {/* RECURSOS */}
                    <div className="space-y-3 font-mono text-xs mb-8">
                      {plan.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2">
                          <span className="font-black">[+]</span>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* BOTÃO DE CTA */}
                  <Link
                    href="/register"
                    className={`font-black text-sm uppercase tracking-wider py-4 px-6 border-4 text-center block transition-all focus-visible:ring-4 focus-visible:ring-white ${
                      plan.popular
                        ? 'bg-black text-white border-black shadow-brutal-invert btn-brutal'
                        : 'bg-white text-black border-white shadow-brutal btn-brutal-invert'
                    }`}
                  >
                    {plan.cta} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================================
            BANNER DE FECHAMENTO (CALL TO ACTION FINAL BRUTALISTA)
            ==================================================================== */}
        <section className="bg-white text-black border-b-4 border-white px-4 sm:px-8 py-20">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="font-mono text-xs font-black uppercase tracking-widest bg-black text-white inline-block px-4 py-1">
              /// PRONTO PARA COMEÇAR ///
            </div>

            <h2 className="font-black text-4xl sm:text-7xl uppercase tracking-tighter leading-none">
              TESTE 100 E-MAILS GRÁTIS SEM CARTÃO DE CRÉDITO
            </h2>

            <p className="font-mono text-sm sm:text-base max-w-2xl mx-auto font-medium">
              Crie sua conta em 30 segundos, gere sua chave de API ou faça upload de um CSV.
              Receba o relatório completo de entregabilidade imediatamente.
            </p>

            <div className="pt-4">
              <Link
                href="/register"
                className="inline-block bg-black text-white font-black text-base sm:text-lg uppercase tracking-wider px-10 py-5 border-4 border-black shadow-brutal-invert btn-brutal focus-visible:ring-4 focus-visible:ring-black"
              >
                CRIAR CONTA IMEDIATAMENTE →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ====================================================================
          FOOTER BRUTALISTA MONOCROMÁTICO
          ==================================================================== */}
      <footer className="bg-black text-white px-4 sm:px-8 py-16 font-mono text-xs">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* HEADER DO FOOTER COM MARCA GIGANTE */}
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b-4 border-white pb-8">
            <div>
              <div className="font-black text-4xl sm:text-6xl tracking-tighter uppercase">
                CLEARBOUNCE
              </div>
              <div className="text-white/60 mt-1">
                MAXIMALIST EMAIL VALIDATION PROTOCOL // MONOCHROME ENGINE
              </div>
            </div>
            <div className="border-2 border-white px-3 py-1.5 font-bold">
              ● ALL NODES OPERATIONAL // LATENCY 14MS
            </div>
          </div>

          {/* GRID DE LINKS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="font-black text-white uppercase border-b border-white/40 pb-1">
                [PRODUTO]
              </div>
              <div className="space-y-1.5 text-white/70">
                <div><a href="#pipeline" className="hover:underline">Validação SMTP</a></div>
                <div><a href="#pipeline" className="hover:underline">Filtro Descartáveis</a></div>
                <div><a href="#pipeline" className="hover:underline">Proteção SSRF</a></div>
                <div><a href="#pricing" className="hover:underline">Tabela de Preços</a></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="font-black text-white uppercase border-b border-white/40 pb-1">
                [DESENVOLVEDORES]
              </div>
              <div className="space-y-1.5 text-white/70">
                <div><Link href="/login" className="hover:underline">Documentação API</Link></div>
                <div><Link href="/login" className="hover:underline">Chaves de API</Link></div>
                <div><Link href="/login" className="hover:underline">Webhooks Stripe</Link></div>
                <div><Link href="/login" className="hover:underline">Status da API</Link></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="font-black text-white uppercase border-b border-white/40 pb-1">
                [SEGURANÇA]
              </div>
              <div className="space-y-1.5 text-white/70">
                <div><span>OWASP Top 10</span></div>
                <div><span>Anti-CSV Injection</span></div>
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

          {/* COPYRIGHT & METADADOS DE SISTEMA */}
          <div className="border-t-2 border-white/30 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-white/60">
            <div>
              © 2026 CLEARBOUNCE. TODOS OS DIREITOS RESERVADOS.
            </div>
            <div className="flex items-center gap-4">
              <span>STACK: NEXT.JS 15 + TAILWIND V4</span>
              <span>•</span>
              <span>SECURITY FIRST</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
