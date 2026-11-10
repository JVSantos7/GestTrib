import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraPublica, comDestino } from "@/components/publico/BarraPublica";
import { formatarDecimalBr, formatarReais } from "@/lib/decimal";
import { calcularIptu, percentualParaFracao } from "@/lib/iptu";
import { MUNICIPIO } from "@/lib/municipio";
import { dividirEmParcelas } from "@/lib/parcelas";
import { ROTULOS_SITUACAO_FISCAL } from "@/lib/situacao-fiscal";
import { cadastroAberto } from "@/server/cadastro";
import { destinoSeguro, obterSessao } from "@/server/sessao";

export const metadata: Metadata = { title: "Gestão tributária municipal" };

// Exemplo da seção "Como o IPTU é calculado". A conta é feita pelas mesmas funções que o
// sistema usa no lançamento (src/lib/iptu.ts e parcelas.ts): se a regra mudar, o exemplo acompanha.
const EXEMPLO = {
  areaTerreno: "360.00",
  areaConstruida: "132.40",
  valorM2Terreno: "185.00",
  valorM2Construcao: "1320.00",
  aliquotaPercentual: "0.80",
  parcelas: 3,
};

const CAMINHO = [
  {
    titulo: "Cadastro",
    texto: "Contribuinte (CPF ou CNPJ validado) e imóvel, com inscrição, áreas e uso.",
    base: "Quem paga e sobre o quê",
  },
  {
    titulo: "Lançamento",
    texto: "O município calcula o imposto do exercício e guarda a memória do cálculo.",
    base: "CTN, art. 142",
  },
  {
    titulo: "Guia",
    texto: "Cota única ou parcelas, cada uma com o seu vencimento.",
    base: "Até 10 parcelas",
  },
  {
    titulo: "Pagamento",
    texto: "A baixa registra quando e quanto foi pago. Um erro se corrige com estorno, nunca apagando.",
    base: "CTN, art. 156, I",
  },
  {
    titulo: "Certidão",
    texto: "Prova a situação do contribuinte, com código que qualquer pessoa confere.",
    base: "CTN, arts. 205 e 206",
  },
];

const CURIOSIDADES = [
  {
    titulo: "O IPTU é do município",
    texto:
      "A Constituição dá aos municípios o poder de cobrar o imposto sobre a propriedade predial e territorial urbana (art. 156, I). O dinheiro fica na cidade.",
  },
  {
    titulo: "A base é o valor venal",
    texto:
      "O imposto não é calculado pelo preço de mercado, e sim pelo valor venal que o município estima com a sua planta de valores (CTN, art. 33).",
  },
  {
    titulo: "Dever ou estar em dia?",
    texto:
      "Quem tem parcelas a vencer, mas nada atrasado, recebe a certidão positiva com efeito de negativa (CTN, art. 206). Ela vale como a negativa.",
  },
  {
    titulo: "Nenhum centavo some",
    texto:
      "Dividir R$ 100,00 em 3 dá 33,333…. Arredondar todas as parcelas perde um centavo; aqui a última parcela fica com a diferença.",
  },
];

const SITUACOES = [
  { situacao: "REGULAR", certidao: "Certidão negativa", cor: "bg-emerald-500" },
  { situacao: "A_VENCER", certidao: "Positiva com efeito de negativa", cor: "bg-amber-500" },
  { situacao: "IRREGULAR", certidao: "Certidão positiva", cor: "bg-red-500" },
] as const;

function m2(valor: string) {
  return `${formatarDecimalBr(valor)} m²`;
}

export default async function Apresentacao({ searchParams }: PageProps<"/login">) {
  // Para onde voltar depois de entrar (ex.: a página que o usuário tentou abrir).
  const destino = destinoSeguro((await searchParams).destino);

  // Quem já está logado vai direto para o sistema.
  if (await obterSessao()) redirect(destino);

  const cadastro = cadastroAberto();
  const calculo = calcularIptu(
    { uso: "RESIDENCIAL", areaTerreno: EXEMPLO.areaTerreno, areaConstruida: EXEMPLO.areaConstruida, unidadesNoLote: 1 },
    {
      valorM2Terreno: EXEMPLO.valorM2Terreno,
      valorM2Construcao: EXEMPLO.valorM2Construcao,
      aliquota: percentualParaFracao(EXEMPLO.aliquotaPercentual),
    },
  );
  const parcelas = dividirEmParcelas(calculo.valorImposto, EXEMPLO.parcelas);

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-zinc-950">
      <BarraPublica destino={destino} cadastro={cadastro} />

      <main className="flex-1">
        {/* Abertura */}
        <section className="border-b border-zinc-200 bg-gradient-to-b from-emerald-50 to-white dark:border-zinc-800 dark:from-emerald-950/40 dark:to-zinc-950">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.15fr_1fr] md:py-20">
            <div>
              <p className="text-sm font-medium tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
                Gestão tributária municipal
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Do cadastro do imóvel à certidão negativa, num só sistema.
              </h1>
              <p className="mt-4 max-w-xl text-zinc-600 dark:text-zinc-400">
                O GestTrib organiza o caminho do IPTU em {MUNICIPIO.nome}/{MUNICIPIO.uf}: quem deve, quanto, até quando, o
                que já foi pago e quem fez cada alteração.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={comDestino("/login/entrar", destino)}
                  className="rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
                >
                  Entrar no sistema
                </Link>
                {cadastro && (
                  <Link
                    href={comDestino("/login/criar-conta", destino)}
                    className="rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    Criar conta
                  </Link>
                )}
              </div>
            </div>

            {/* Uma guia de IPTU de exemplo, com os mesmos números da seção de cálculo. */}
            <figure aria-label="Exemplo de guia de IPTU" className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-3 border-b border-dashed border-zinc-300 pb-4 dark:border-zinc-700">
                <div>
                  <p className="text-xs text-zinc-500">Prefeitura de {MUNICIPIO.nome}</p>
                  <p className="font-semibold">Guia de IPTU · exemplo</p>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Fictícia
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 py-4 text-sm">
                <div>
                  <dt className="text-xs text-zinc-500">Inscrição</dt>
                  <dd className="font-mono">01.012.0034.001</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Uso</dt>
                  <dd>Residencial</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Valor venal</dt>
                  <dd className="tabular-nums">{formatarReais(calculo.valorVenal)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Alíquota</dt>
                  <dd className="tabular-nums">{formatarDecimalBr(EXEMPLO.aliquotaPercentual)}%</dd>
                </div>
              </dl>
              <ol className="space-y-1.5 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
                {parcelas.map((valor, indice) => (
                  <li key={indice} className="flex justify-between tabular-nums">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Parcela {indice + 1}/{parcelas.length}
                    </span>
                    <span>{formatarReais(valor)}</span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-zinc-200 pt-2 font-semibold tabular-nums dark:border-zinc-800">
                  <span>Total</span>
                  <span>{formatarReais(calculo.valorImposto)}</span>
                </li>
              </ol>
            </figure>
          </div>
        </section>

        {/* O caminho de um tributo */}
        <section aria-labelledby="titulo-caminho" className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="titulo-caminho" className="text-2xl font-semibold tracking-tight">
            O caminho de um tributo
          </h2>
          <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
            Cada etapa depende da anterior, e todas ficam registradas na auditoria.
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {CAMINHO.map((etapa, indice) => (
              <li key={etapa.titulo} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <span
                  aria-hidden
                  className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                >
                  {indice + 1}
                </span>
                <h3 className="mt-3 font-medium">{etapa.titulo}</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{etapa.texto}</p>
                <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">{etapa.base}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Como o IPTU é calculado */}
        <section aria-labelledby="titulo-calculo" className="border-y border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
            <div>
              <h2 id="titulo-calculo" className="text-2xl font-semibold tracking-tight">
                Como o IPTU é calculado
              </h2>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                O município define, a cada ano, quanto vale o metro quadrado de terreno em cada setor e o de construção em
                cada uso, e a alíquota de cada uso. Com isso, a conta é sempre a mesma:
              </p>
              <div className="mt-6 space-y-2 rounded-lg border border-zinc-200 bg-white p-4 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-950">
                <p>valor venal = terreno + construção</p>
                <p>IPTU = valor venal × alíquota</p>
              </div>
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                Num prédio, cada apartamento paga pela sua fração do terreno. E o lançamento guarda a memória do cálculo:
                se o cadastro mudar depois, o imposto já lançado continua explicável.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="font-medium">Exemplo: uma casa residencial</h3>
              <table className="mt-4 w-full text-sm">
                <caption className="sr-only">Memória de cálculo do exemplo</caption>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  <tr>
                    <th scope="row" className="py-2 text-left font-normal text-zinc-600 dark:text-zinc-400">
                      Terreno: {m2(EXEMPLO.areaTerreno)} × {formatarReais(EXEMPLO.valorM2Terreno)}
                    </th>
                    <td className="py-2 text-right tabular-nums">{formatarReais(calculo.valorVenalTerreno)}</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-2 text-left font-normal text-zinc-600 dark:text-zinc-400">
                      Construção: {m2(EXEMPLO.areaConstruida)} × {formatarReais(EXEMPLO.valorM2Construcao)}
                    </th>
                    <td className="py-2 text-right tabular-nums">{formatarReais(calculo.valorVenalConstrucao)}</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-2 text-left font-medium">
                      Valor venal
                    </th>
                    <td className="py-2 text-right font-medium tabular-nums">{formatarReais(calculo.valorVenal)}</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-2 text-left font-normal text-zinc-600 dark:text-zinc-400">
                      Alíquota residencial
                    </th>
                    <td className="py-2 text-right tabular-nums">{formatarDecimalBr(EXEMPLO.aliquotaPercentual)}%</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-2 text-left font-semibold">
                      IPTU do ano
                    </th>
                    <td className="py-2 text-right font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
                      {formatarReais(calculo.valorImposto)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                Em {parcelas.length} parcelas: {parcelas.map(formatarReais).join(" + ")}. A última fica com os centavos que
                sobram da divisão, e a soma fecha exatamente no total.
              </p>
            </div>
          </div>
        </section>

        {/* Situação fiscal e certidões */}
        <section aria-labelledby="titulo-situacao" className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="titulo-situacao" className="text-2xl font-semibold tracking-tight">
            Situação fiscal e certidão
          </h2>
          <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
            A situação é calculada na hora, a partir das guias: uma parcela que vence hoje está atrasada amanhã sem que
            ninguém precise mudar nada. E ela decide qual certidão o contribuinte recebe.
          </p>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {SITUACOES.map(({ situacao, certidao, cor }) => (
              <li key={situacao} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="flex items-center gap-2 font-medium">
                  <span aria-hidden className={`size-2.5 rounded-full ${cor}`} />
                  {ROTULOS_SITUACAO_FISCAL[situacao]}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{certidao}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Você sabia? */}
        <section aria-labelledby="titulo-curiosidades" className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 id="titulo-curiosidades" className="text-2xl font-semibold tracking-tight">
              Você sabia?
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CURIOSIDADES.map((item) => (
                <li key={item.titulo} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <h3 className="font-medium">{item.titulo}</h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{item.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Serviço público e chamada final */}
        <section className="mx-auto grid max-w-6xl gap-4 px-4 py-16 md:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">Recebeu uma certidão?</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Confira se ela é autêntica com o código impresso no documento. Não precisa de login.
            </p>
            <Link href="/validar-certidao" className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
              Validar certidão →
            </Link>
          </div>
          <div className="rounded-lg bg-emerald-700 p-6 text-white">
            <h2 className="text-lg font-semibold">Conheça o sistema por dentro</h2>
            <p className="mt-1 text-sm text-emerald-50">
              {cadastro
                ? "Crie uma conta e experimente: cadastre um imóvel, lance o IPTU, emita a guia e dê baixa no pagamento."
                : "Entre com a sua conta para cadastrar imóveis, lançar o IPTU, emitir guias e dar baixa em pagamentos."}
            </p>
            <Link
              href={comDestino(cadastro ? "/login/criar-conta" : "/login/entrar", destino)}
              className="mt-4 inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
            >
              {cadastro ? "Criar conta" : "Entrar"}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 px-4 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
        GestTrib · projeto de portfólio. O município, as pessoas e os valores são fictícios e não representam nenhuma
        prefeitura real.
      </footer>
    </div>
  );
}
