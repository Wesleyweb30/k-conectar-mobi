# Kallas Conectar Mobi

Aplicação web para gestão e consulta de paradas de ônibus (abrigos/totens), com autenticação por perfil e integração com a API Produttivo.

## Visão Geral

| Perfil | Acesso |
|--------|--------|
| Usuário | Consulta de paradas com filtros e visualização no mapa |
| Administrador | Tudo acima + painel administrativo, gestão de usuários e módulos Produttivo |

## Principais Funcionalidades

- Login com e-mail e senha usando Better Auth.
- Controle de acesso por papel (user e admin).
- Lista de paradas com filtros por código, status, município, bairro, logradouro e tipologia.
- Mapa de rotas/paradas com Leaflet.
- Painel administrativo com indicadores de paradas.
- Módulos Produttivo para manutenção, implantação, instalação elétrica e ligação de paradas.
- Cadastro de usuários no painel administrativo.
- Importação de paradas por planilha Excel.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Prisma 7 + PostgreSQL
- Better Auth
- Leaflet

## Pré-requisitos

- Node.js 18 ou superior
- Banco PostgreSQL disponível
- Credenciais da API Produttivo (para funcionalidades de integração)

## Configuração do Ambiente

1. Instale as dependências:

```bash
npm install
```

2. Crie o arquivo .env na raiz do projeto:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/kconectar"
BETTER_AUTH_SECRET="sua_chave_secreta"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

PRODUTTIVO_BASE_URL="https://api.produttivo.com.br/api/v1"
PRODUTTIVO_LOGIN="seu_login"
PRODUTTIVO_REGISTER="seu_registro"
PRODUTTIVO_TOKEN="seu_token"
```

3. Aplique as migrations no banco local (desenvolvimento):

```bash
npx prisma migrate dev
```

4. Opcional: gere um admin inicial via seed:

```bash
npx tsx prisma/seed.ts
```

Credenciais padrão do seed:

- E-mail: admin@admin.com
- Senha: admin123

## Rodando a Aplicação

Desenvolvimento:

```bash
npm run dev
```

Produção:

```bash
npm run build
npm run start
```

URL local: http://localhost:3000

## Importação de Paradas (Excel)

Script disponível:

```bash
npm run import:parada
```

Detalhes da importação:

- Arquivo esperado: doc/Parque.xlsx
- Aba esperada: Parque
- Operação: upsert por código da parada

## Rotas Principais

- /: redireciona para login, dashboard ou admin conforme sessão/perfil.
- /login: autenticação.
- /dashboard: área do usuário comum.
- /paradas: consulta de paradas.
- /paradas/mapa: mapa geral de paradas com legenda por tipo de equipamento.
- /paradas/rotas: visualização no mapa.
- /admin: home administrativa (hub operacional).
- /admin/analytics: analytics de paradas.
- /admin/produttivo: visão geral Produttivo.
- /admin/produttivo/manutencao: registros de manutenção.
- /admin/produttivo/implantacao: registros de implantação.
- /admin/produttivo/instalacao-eletrica: registros de instalação elétrica.
- /admin/produttivo/ligacao-paradas: ligação entre atividades e paradas.
- /admin/usuarios: gerenciamento de usuários.
- /api/auth/[...all]: endpoints do Better Auth.

## Scripts

| Comando | Descrição |
|---------|-----------|
| npm run dev | Inicia o servidor de desenvolvimento |
| npm run build | Gera Prisma Client e build de produção |
| npm run start | Sobe a aplicação em modo produção |
| npm run lint | Executa verificação com ESLint |
| npm run import:parada | Importa/atualiza paradas a partir da planilha |

## Observações

- O middleware protege as rotas principais e redireciona usuários sem sessão para /login.
- Rotas /admin exigem perfil admin.