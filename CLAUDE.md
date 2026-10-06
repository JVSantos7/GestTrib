@AGENTS.md

# GestTrib

Sistema de gestão tributária municipal (projeto de portfólio): contribuintes,
imóveis, lançamento de IPTU, guias, baixa de pagamento, situação fiscal,
auditoria e relatórios. Dados fictícios, não representa nenhuma prefeitura real.

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4
Banco: a definir (PostgreSQL ou MySQL) com Prisma · Validação: Zod
Testes: Vitest (regras de cálculo)

## Regras
- Valores monetários sempre em decimal, nunca float.
- Exclusão lógica (soft delete) nas entidades principais.
- Regras de negócio em `src/server/services`, fora dos componentes.
- Operações de lançamento e baixa dentro de transação.
- Toda alteração relevante gera registro de auditoria.
- Validar CPF/CNPJ no servidor (Zod), não só no formulário.
- Textos da interface em português (pt-BR).

## Fluxo de trabalho
- Uma fase por vez. Mostrar o plano antes de codar e explicar as decisões.
- Um commit por entrega, no padrão Conventional Commits.
- Rodar `npm run lint` e `npm run build` antes de commitar.

## Fases
1 Contribuintes (CRUD) · 2 Busca/filtro/paginação · 3 Imóveis · 4 IPTU ·
5 Guias e baixa · 6 Situação do contribuinte · 7 Login/perfis/auditoria ·
8 Relatórios (PDF/CSV) · 9 Seeds, README e deploy
