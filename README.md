# 🧹 ClearBounce — SaaS de Validação e Limpeza de E-mails

> Plataforma B2B de autoatendimento para validar e limpar listas de e-mails em escala.
> Detecta e-mails inválidos, domínios descartáveis e endereços inexistentes via pipeline SMTP seguro.

---

## 📦 Estrutura do Monorepo

```
ClearBounce/
├── server/    # API Fastify (TypeScript) — Lógica de negócio, validação SMTP, billing
└── web/       # Frontend Next.js App Router (TypeScript) — Interface de autoatendimento
```

---

## 🚀 Setup Local

### Pré-requisitos

- **Node.js** ≥ 20 LTS
- **PostgreSQL** ≥ 15
- **Redis** ≥ 7 (necessário para filas BullMQ)
- **npm** ≥ 10

### 1. Clonar ou Inicializar o repositório

```bash
git clone https://github.com/tiagodearaujo13-lab/ClearBounce.git
cd ClearBounce
```

### 2. Configurar variáveis de ambiente

```bash
# Server
cp server/.env.example server/.env
# Edite server/.env com suas credenciais reais

# Web
cp web/.env.example web/.env
# Edite web/.env com a URL da API
```

### 3. Instalar dependências

```bash
# Server
cd server && npm install

# Web (em outro terminal)
cd web && npm install
```

### 4. Executar migrations do banco

```bash
cd server && npm run migrate
```

### 5. Iniciar em desenvolvimento

```bash
# Terminal 1 — API (porta 3333)
cd server && npm run dev

# Terminal 2 — Frontend (porta 3000)
cd web && npm run dev
```

Acesse: **http://localhost:3000**

---

## 🔑 Variáveis de Ambiente

### Server (`server/.env`)

| Variável | Descrição | Exemplo |
|---|---|---|
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://user:pass@localhost:5432/cleanmail` |
| `JWT_SECRET` | Chave secreta para assinatura JWT (mín. 32 chars) | `sua-chave-super-secreta-aqui-32+` |
| `JWT_EXPIRES_IN` | Tempo de expiração do token JWT | `7d` |
| `STRIPE_SECRET_KEY` | Chave secreta da API Stripe | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook Stripe | `whsec_...` |
| `REDIS_URL` | Connection string Redis | `redis://localhost:6379` |
| `SMTP_HELO_DOMAIN` | Domínio usado no HELO SMTP | `cleanmail.com.br` |
| `SMTP_FROM_EMAIL` | E-mail usado no MAIL FROM | `verify@cleanmail.com.br` |
| `SMTP_TIMEOUT_MS` | Timeout de conexão SMTP (ms) | `7500` |
| `PORT` | Porta do servidor | `3333` |
| `CORS_ORIGIN` | Origem permitida para CORS | `http://localhost:3000` |

### Web (`web/.env`)

| Variável | Descrição | Exemplo |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL base da API | `http://localhost:3333` |

---

## 🧪 Testes

```bash
# Testes unitários e integração (Server — Vitest)
cd server && npm test

# Testes E2E (Web — Playwright)
cd web && npx playwright test
```

---

## 🌐 Deploy

### Frontend → Vercel

1. Conecte o repositório no [Vercel Dashboard](https://vercel.com).
2. Configure o **Root Directory** como `web/`.
3. Defina as variáveis de ambiente (`NEXT_PUBLIC_API_URL`).
4. Deploy automático a cada push na branch `main`.

### Backend → Render

1. Crie um **Web Service** no [Render Dashboard](https://render.com).
2. Configure:
   - **Root Directory**: `server/`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
3. Adicione todas as variáveis de ambiente do `server/.env`.
4. Crie um **Redis** addon para o BullMQ.
5. Crie um **PostgreSQL** addon para o banco de dados.

---

## 🔒 Segurança

- **OWASP Top 10** aplicado em todas as camadas.
- **SSRF Protection**: IPs privados e loopback bloqueados antes de qualquer conexão SMTP.
- **Rate Limiting**: Por IP (100 req/min) e por API Key (1000 req/min).
- **API Keys**: Armazenadas como SHA-256 — texto puro nunca persiste no banco.
- **CSV Injection**: Campos perigosos sanitizados na exportação.
- **Stripe Webhooks**: Validação criptográfica de assinatura obrigatória.
- **Headers**: Helmet + CORS estrito configurados.

---

## 📄 Licença

Proprietário — Todos os direitos reservados.
