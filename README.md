# GestTrib

Sistema de gestão tributária municipal: cadastro de contribuintes e imóveis, lançamento do IPTU,
emissão de guias, baixa de pagamentos, situação fiscal, certidão de débitos, auditoria e relatórios.

> Projeto de portfólio. O município (**Vila Serena/PB**), as pessoas, os CPFs/CNPJs e os valores são
> fictícios e não representam nenhuma prefeitura real.

<!-- Depois do deploy: link da demonstração e capturas de tela (docs/telas/*.png). -->

## O que o sistema faz

| Módulo | Funcionalidades |
|---|---|
| **Contribuintes** | Cadastro de pessoa física e jurídica com CPF/CNPJ validados no servidor (inclui o CNPJ alfanumérico), busca, filtros, paginação e filtro por situação fiscal. |
| **Imóveis** | Inscrição imobiliária (setor.quadra.lote.unidade), uso, áreas em decimal, vínculo e transferência de proprietário. |
| **IPTU** | Parâmetros por exercício (alíquotas e valores do m²), lançamento individual ou do exercício inteiro, memória de cálculo gravada e cancelamento com motivo. |
| **Guias** | Cota única ou até 10 parcelas sem perder centavos, baixa de pagamento, estorno com motivo e impressão. |
| **Situação fiscal** | Regular, regular com débitos a vencer ou irregular, calculada na hora a partir das guias. |
| **Certidões** | Negativa, positiva com efeito de negativa ou positiva (arts. 205 e 206 do CTN), com código de validação conferido numa página pública. |
| **Relatórios** | Arrecadação por período, inadimplência e lançamentos por exercício, com impressão e exportação em CSV no padrão brasileiro. |
| **Usuários e auditoria** | Login, três perfis de acesso e histórico de quem alterou o quê em cada registro. |

### Perfis de acesso

| Perfil | Pode |
|---|---|
| **Administrador** | Tudo, inclusive gerenciar usuários, editar parâmetros do IPTU e estornar pagamentos. |
| **Operador** | Cadastros, lançamentos, emissão de guias, baixas e certidões. Não estorna nem gerencia usuários. |
| **Consulta** | Só visualiza. |

## Tecnologias

- **Next.js 16** (App Router, Server Components e Server Actions), **React 19**, **TypeScript**
- **Tailwind CSS 4**
- **PostgreSQL 17** (Docker) com **Prisma 7**
- **Zod 4** para validação, **decimal.js** para contas com dinheiro
- **Better Auth** para login, sessões e controle de acesso por perfil
- **Vitest** para os testes das regras de negócio

## Como rodar localmente

Requisitos: **Node.js 20.9+** e **Docker**.

```bash
# 1. Dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env
#    No .env, troque BETTER_AUTH_SECRET por uma chave gerada com:
#    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 3. Banco de dados (Postgres na porta 5434) e tabelas
npm run db:up
npm run db:migrate

# 4. Dados fictícios para demonstração (opcional, só num banco vazio)
npm run db:seed

# 5. Um usuário para entrar
npm run criar-admin

# 6. Sistema em http://localhost:3000
npm run dev
```

Para ter as contas de demonstração (botões "Entrar como..." na tela de login, uma por perfil),
defina `DEMO_HABILITADA="true"` e `DEMO_SENHA` no `.env` e rode `npm run criar-demo`.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Sistema em modo de desenvolvimento. |
| `npm test` | Roda os testes (Vitest). |
| `npm run lint` · `npm run build` | Verificação de código e build de produção. |
| `npm run db:up` · `npm run db:down` | Sobe e derruba o Postgres do Docker. |
| `npm run db:migrate` | Aplica as migrations e gera o client do Prisma. |
| `npm run db:seed` | Carrega os dados fictícios (só com o banco vazio). |
| `npm run db:studio` | Abre o Prisma Studio para olhar o banco. |
| `npm run criar-admin` | Cria um administrador pelo terminal. Não existe tela de cadastro aberta. |
| `npm run criar-demo` | Cria ou restaura as contas de demonstração. |

Para apagar o banco e recomeçar: `npx prisma migrate reset` (apaga **tudo**, inclusive usuários).

### O que vem nos dados fictícios

O `db:seed` monta a história de um município que usa o sistema desde janeiro do ano passado:

- 38 contribuintes e 45 imóveis em 4 bairros, incluindo um prédio de 6 apartamentos no mesmo lote;
- IPTU do ano passado e deste ano, com guias, pagamentos e contribuintes em dia, com débitos a vencer e em atraso;
- um estorno, um lançamento cancelado e refeito, certidões dos três tipos e um contribuinte excluído.

As datas são relativas ao dia em que a carga roda, e o sorteio usa semente fixa: toda carga gera os mesmos dados.

## Arquitetura

Caminho de uma operação, do formulário ao banco:

```
Página (Server Component)       exige permissão e lê dados pelos services
  └─ Formulário (FormAcao)      mostra erros por campo devolvidos pela action
       └─ Server Action         exige permissão → valida com Zod → chama o service
            └─ Service          regra de negócio + transação + auditoria
                 └─ Prisma → PostgreSQL
```

```
src/
├─ app/(sistema)/<módulo>/   páginas e Server Actions de cada módulo
├─ app/validar-certidao/     única página pública: confere a autenticidade de uma certidão
├─ components/               componentes de interface (formulários, tabelas, histórico)
├─ lib/                      funções puras e testadas: cálculo do IPTU, parcelas, datas,
│  │                         decimais pt-BR, CPF/CNPJ, situação fiscal, CSV
│  └─ schemas/               schemas Zod dos formulários e dos filtros
├─ server/
│  ├─ services/              regras de negócio (uma por módulo), só rodam no servidor
│  ├─ sessao.ts              sessão e funções de autorização
│  └─ auth.ts                configuração do Better Auth
└─ proxy.ts                  barra quem não tem sessão (o antigo middleware)
prisma/                      schema e migrations
scripts/                     criar-admin, criar-demo e a carga de dados fictícios
```

## Decisões técnicas

**Dinheiro nunca em `float`.** Em ponto flutuante, `0.1 + 0.2` dá `0.30000000000000004`. Valores
entram como texto pt-BR (`"1.234,56"`), são gravados como `numeric` no Postgres e calculados com
`decimal.js`. O parcelamento divide sem perder centavos: R$ 100,00 em 3 vira 33,33 + 33,33 + 33,34.

**Cálculo do IPTU com memória.** Valor venal = terreno (fração do lote × m² do setor) + construção
(área × m² do uso), e IPTU = valor venal × alíquota. O lançamento grava uma "fotografia" do imóvel,
dos parâmetros e de cada etapa da conta. Se o cadastro ou os parâmetros mudarem depois, o imposto já
lançado continua explicável.

**Transações e travas.** Lançamento, emissão, baixa e estorno rodam dentro de transação, com trava
na linha (`SELECT ... FOR UPDATE`): dois cliques simultâneos não geram guia em dobro nem pagamento
duplicado. Índices únicos no banco são a segunda garantia.

**Nada é apagado.** Contribuintes e imóveis têm exclusão lógica (`excluidoEm`), usuários são
desativados, e lançamentos e pagamentos são cancelados ou estornados com data e motivo.

**Auditoria na mesma transação.** Cada alteração grava quem fez, quando e o retrato do registro. O
registro de auditoria usa a mesma transação da alteração: ou os dois ficam, ou nenhum.

**Situação fiscal calculada, não gravada.** Uma guia que vence hoje fica vencida amanhã sem que nada
mude no banco. Por isso a situação é calculada na consulta, e a mesma regra existe como filtro SQL
para a listagem paginada.

**Autorização em cada página e action.** O `proxy.ts` só confere se existe sessão. A checagem do
perfil acontece em toda página e em toda Server Action, porque uma action pode ser chamada
diretamente, sem passar pela tela.

**Dados pessoais protegidos.** CPF mascarado nas listagens, cabeçalhos de segurança, páginas com
dados pessoais fora do cache, e a validação pública de certidões mostra só o mínimo para conferir a
autenticidade.

## Testes

As regras de negócio puras (cálculo do IPTU, parcelas, vencimentos, CPF/CNPJ, situação fiscal,
certidão, CSV, schemas) têm testes com Vitest, ao lado de cada arquivo em `src/lib`:

```bash
npm test                                    # todos
npx vitest run src/lib/iptu.test.ts         # um arquivo
```
