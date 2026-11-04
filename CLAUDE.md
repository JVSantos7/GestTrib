# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

# GestTrib

Sistema de gestão tributária municipal (projeto de portfólio): contribuintes,
imóveis, lançamento de IPTU, guias, baixa de pagamento, situação fiscal,
auditoria e relatórios. Dados fictícios, não representa nenhuma prefeitura real.

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4
Banco: PostgreSQL 17 (Docker) com Prisma 7 (`@prisma/adapter-pg`) · Validação: Zod 4
Login/perfis: better-auth (plugin admin + access control) · Testes: Vitest

## Comandos
- `npm run db:up` / `npm run db:down` — sobe/derruba o Postgres do `docker-compose.yml` (porta **5434**).
- `npm run db:migrate` — `prisma migrate dev` + regenera o client. Copie `.env.example` para `.env` antes.
- `npm run criar-admin` — cria um usuário Administrador pelo terminal (não há tela de cadastro aberta).
- `npm run dev` · `npm run build` · `npm run lint`
- `npm test` — roda todos os testes (`src/**/*.test.ts`).
- Um arquivo: `npx vitest run src/lib/iptu.test.ts` · Um caso: `npx vitest run -t "trecho do nome"`

O client do Prisma é gerado em `src/generated/prisma` (não editar; importar de
`@/generated/prisma/client`). Configuração do Prisma em `prisma.config.ts`.

## Arquitetura
Fluxo de uma operação, do formulário ao banco:

1. **Página** (`src/app/(sistema)/<modulo>/.../page.tsx`, Server Component) chama
   `exigirPermissaoPagina` e lê dados pelos services. `pode(...)` só decide se um botão aparece.
2. **Formulário** usa `FormAcao` (`src/components/form`), que recebe um `EstadoAcao`
   (`{ sucesso }` ou `{ erro, erros }` por campo) devolvido pela action.
3. **Server Action** (`<modulo>/actions.ts`): `exigirPermissaoAcao` na primeira linha →
   `safeParse` com Zod → chama o service → `revalidatePath`. Erros de negócio conhecidos
   (lista `ERROS_CONHECIDOS`) viram mensagem no `EstadoAcao`; o resto é relançado.
4. **Service** (`src/server/services`, `import "server-only"`): regra de negócio, `prisma.$transaction`
   e auditoria. Erros de negócio são subclasses de `Error` exportadas pelo próprio service.
5. **Auditoria**: `registrarAuditoria(tx, {..., responsavel})` recebe o client **da transação**,
   para ser confirmada ou desfeita junto com a alteração. `listarHistorico` alimenta o componente `Historico`.

Onde fica cada coisa:
- `src/lib` — funções puras e testáveis sem banco: cálculo do IPTU (`iptu.ts`), parcelas e
  vencimentos (`parcelas.ts`, `guias.ts`, `datas.ts`), decimais pt-BR (`decimal.ts`), CPF/CNPJ
  (`documento.ts`), paginação. Os testes Vitest ficam ao lado (`*.test.ts`); services não têm teste.
- `src/lib/schemas` — schemas Zod de entidades e de filtros de listagem (lidos de `searchParams`).
- `src/server/sessao.ts` — sessão (com `cache` do React) e as funções de autorização.
- `src/lib/permissoes.ts` — recursos/ações e perfis (`administrador`, `operador`, `consulta`).
  Recurso novo precisa entrar em `recursos` **e** nos perfis.
- `src/proxy.ts` — (o antigo `middleware` no Next 16) só confere se o cookie de sessão existe;
  a checagem real é feita em cada página/action.
- `src/server/auth.ts` + `src/app/api/auth/[...all]` — configuração e rotas do better-auth.

Valores monetários: entram como texto pt-BR (`lerDecimalBr("1.234,56")` → `"1234.56"`), são
gravados como `Decimal` no Postgres e exibidos com `formatarReais`. Contas usam `decimal.js`.
Soft delete via coluna `excluidoEm` (filtrar `excluidoEm: null` nas consultas).

## Regras
- Valores monetários sempre em decimal, nunca float.
- Exclusão lógica (soft delete) nas entidades principais. Usuários são desativados (ban), não apagados.
- Regras de negócio em `src/server/services`, fora dos componentes.
- Operações de lançamento e baixa dentro de transação.
- Toda alteração relevante gera registro de auditoria.
- Validar CPF/CNPJ no servidor (Zod), não só no formulário.
- Textos da interface em português (pt-BR); nomes no código também em português.

## Fluxo de trabalho
- Uma fase por vez. Mostrar o plano antes de codar e explicar as decisões.
- Um commit por entrega, no padrão Conventional Commits.
- Rodar `npm run lint` e `npm run build` antes de commitar.

## Fases
1 Contribuintes (CRUD) · 2 Busca/filtro/paginação · 3 Imóveis · 4 IPTU ·
5 Guias e baixa · 6 Situação do contribuinte · 7 Login/perfis/auditoria ·
8 Relatórios (PDF/CSV) · 9 Seeds, README e deploy

Ordem de execução: 1, 2, 3, **7**, 4, 5, 6, 8, 9. A Fase 7 (login) foi antecipada
para o sistema não crescer sem controle de acesso. Toda página nova chama
`exigirPermissaoPagina` e toda Server Action chama `exigirPermissaoAcao`
(`src/server/sessao.ts`); permissões por perfil ficam em `src/lib/permissoes.ts`.
