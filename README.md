# 🏫 Sistema Cantina Escolar

[![Vercel Deploy](https://vercel.com/button)](https://cantinas-escolares-web.vercel.app)
![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel)
![Backend](https://img.shields.io/badge/Backend-Render-brightgreen?style=flat-square&logo=render)
![API Status](https://img.shields.io/badge/API-400-red?style=flat-square&logo=node.js&label=health)

Sistema completo de gestão de cantina escolar com PDV touchscreen, reconhecimento facial, app mobile, portal dos pais, controle financeiro e gestão de estoque.

## 🌐 Acesso

| Ambiente | URL |
|----------|-----|
| **Frontend (Vercel)** | [cantinas-escolares-web.vercel.app](https://cantinas-escolares-web.vercel.app) |
| **Backend API (Render)** | [cantinas-api.onrender.com](https://cantinas-api.onrender.com) |
| **Health Check** | [cantinas-api.onrender.com/api/health](https://cantinas-api.onrender.com/api/health) |

## 📋 Requisitos

- **Node.js** 20+
- **pnpm** 9+
- **Docker** e **Docker Compose**
- **PostgreSQL** 16 (via Docker)
- **Redis** 7 (via Docker)

## 🚀 Instalação Rápida
 
```bash
# 1. Instalar dependências
pnpm install

# 2. Subir infraestrutura (PostgreSQL, Redis, MinIO)
docker-compose up -d

# 3. Rodar migrations
pnpm db:migrate

# 4. Popular banco com dados de demo
pnpm db:seed

# 5. Iniciar backend em modo desenvolvimento
pnpm dev:backend
```

## 📦 Estrutura do Projeto

```
cantina-escolar/
├── backend/          # API REST (Express + TypeScript)
├── web/              # Painel Admin + PDV (React + Vite)
├── app/              # App Mobile (React Native + Expo)
├── shared/           # Tipos compartilhados
└── docker-compose.yml
```

## 🔑 Credenciais de Teste

| Perfil | Email | Senha |
|--------|-------|-------|
| Admin | admin@cantina.com | Admin@123 |
| Operador de Caixa | caixa@cantina.com | Caixa@123 |
| Aluno | joao.aluno@escola.com | Aluno@123 |
| Pai/Responsável | carlos.pai@email.com | Pais@1234 |

## 🛠️ Scripts

| Comando | Descrição |
|---------|-----------|
| `pnpm dev:backend` | Inicia backend em modo dev (hot reload) |
| `pnpm dev:web` | Inicia frontend web |
| `pnpm db:migrate` | Executa migrations |
| `pnpm db:rollback` | Reverte última migration |
| `pnpm db:seed` | Popula banco com dados demo |
| `pnpm test` | Executa testes |
| `pnpm docker:up` | Sobe infraestrutura Docker |
| `pnpm docker:down` | Para infraestrutura Docker |

## 📡 API Endpoints

### Autenticação
- `POST /api/auth/login` — Login
- `POST /api/auth/register` — Registro (admin only)
- `POST /api/auth/refresh` — Refresh token
- `POST /api/auth/logout` — Logout
- `POST /api/auth/2fa/setup` — Configura 2FA
- `POST /api/auth/2fa/verify` — Verifica 2FA
- `GET /api/auth/profile` — Perfil do usuário

### Health Check
- `GET /api/health` — Status da API

## 🔐 Segurança

- JWT com refresh token rotativo
- Senhas com bcrypt (12 rounds)
- Rate limiting (100 req/min geral, 5 req/min auth)
- Dados biométricos criptografados (AES-256-GCM)
- Validação de entrada com Zod
- Headers de segurança (Helmet)
- CORS configurável
