# Kallas Conectar Mobi

Plataforma web para gestão e consulta de **paradas de ônibus** (abrigos/totens), com integração à API **Produttivo** para acompanhamento de inspeções de implantação e manutenção.

## Visão Geral

| Perfil | Acesso |
|--------|--------|
| **Usuário** | Consulta de paradas com filtros e visualização de rotas no mapa |
| **Administrador** | Tudo acima + painel de KPIs, gerenciamento de usuários e relatórios do Produttivo |

## Funcionalidades

- **Autenticação** — login com e-mail e senha via [Better Auth](https://better-auth.com), controle de sessão com timeout por inatividade.
- **Paradas** — listagem paginada com filtros por código, status, município, bairro, logradouro e tipologia.
- **Rotas no mapa** — visualização geoespacial das paradas usando [Leaflet](https://leafletjs.com).
- **Dashboard admin** — KPIs de abrigos/totens (ativos, reativados, sem informação) e distribuição por tipologia atual/nova.
- **Produttivo** — acompanhamento de preenchimentos de formulários de manutenção, implantação e instalação elétrica por período e responsável.
- **Gerenciamento de usuários** — criação, listagem e controle de permissões no painel admin.
- **Importação de paradas** — script de importação a partir de planilha Excel (`prisma/import-parada.ts`).

## Tecnologias

- [Next.js 16](https://nextjs.org) — App Router, React Server Components
- [React 19](https://react.dev) com React Compiler
- [Prisma 7](https://www.prisma.io) + PostgreSQL
- [Better Auth](https://better-auth.com) — autenticação + plugin admin
- [Leaflet](https://leafletjs.com) — mapas interativos
- [Tailwind CSS 4](https://tailwindcss.com)
- [TypeScript 5](https://www.typescriptlang.org)

## Pré-requisitos

- Node.js ≥ 18
- PostgreSQL
- Credenciais de acesso à API Produttivo

## Configuração

**1. Instale as dependências:**

```bash
npm install
```

**2. Configure as variáveis de ambiente** — crie um arquivo `.env` na raiz:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/kconectar"
BETTER_AUTH_SECRET="sua_chave_secreta"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# API Produttivo
PRODUTTIVO_BASE_URL="https://api.produttivo.com.br/api/v1"
PRODUTTIVO_LOGIN="seu_login"
PRODUTTIVO_REGISTER="seu_registro"
PRODUTTIVO_TOKEN="seu_token"
```

**3. Execute as migrations e gere o Prisma Client:**

```bash
npx prisma migrate deploy
npx prisma generate
```

**4. (Opcional) Importe as paradas a partir de planilha Excel:**

```bash
npm run import:parada
```

## Executando

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm run start
```

Acesse [http://localhost:3000](http://localhost:3000). O sistema redireciona automaticamente para `/login`.

## Estrutura de Rotas

```
/                              → redireciona conforme perfil do usuário
/login                         → autenticação
/dashboard                     → painel do usuário
/paradas                       → consulta de paradas (usuário e admin)
/paradas/rotas                 → mapa de rotas
/admin                         → painel admin com KPIs de paradas
/admin/produttivo              → analytics Produttivo (comparativo mensal)
/admin/produttivo/manutencao   → registros de manutenção
/admin/produttivo/implantacao  → registros de implantação
/admin/produttivo/instalacao-eletrica → registros de instalação elétrica
/admin/usuarios                → gerenciamento de usuários
```

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Gera Prisma Client e faz build de produção |
| `npm run start` | Inicia o servidor de produção |
| `npm run lint` | Verificação estática com ESLint |
| `npm run import:parada` | Importa paradas de planilha Excel para o banco |