import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { certidaoValida, formatarNumeroCertidao, normalizarCodigoValidacao, TITULOS_CERTIDAO } from "@/lib/certidao";
import { dataParaIso, formatarDataIso, hojeIso } from "@/lib/datas";
import { mascararDocumento } from "@/lib/documento";
import { formatarDataHora } from "@/lib/formatacao";
import { MUNICIPIO } from "@/lib/municipio";
import { buscarCertidaoPorCodigo } from "@/server/services/certidoes";

export const metadata: Metadata = { title: "Validar certidão" };

/**
 * Página PÚBLICA (sem login, liberada no `src/proxy.ts`): quem recebeu uma certidão confere aqui
 * se ela é autêntica. Por isso mostra só o mínimo: tipo, datas, nome e CPF mascarado. Os débitos não.
 * Não dá para "chutar" códigos: são 80 bits aleatórios (ver `gerarCodigoValidacao`).
 */
export default async function ValidarCertidao({ searchParams }: PageProps<"/validar-certidao">) {
  const { codigo: parametro } = await searchParams;
  const digitado = typeof parametro === "string" ? parametro.slice(0, 40) : "";
  const codigo = digitado ? normalizarCodigoValidacao(digitado) : null;
  const certidao = codigo ? await buscarCertidaoPorCodigo(codigo) : null;

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-4 dark:bg-black">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-lg font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">GestTrib</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Gestão Tributária · Município de {MUNICIPIO.nome}/{MUNICIPIO.uf}
        </p>
        <h1 className="mt-6 text-xl font-semibold">Validar certidão</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Informe o código de validação impresso na certidão.</p>

        <Form action="/validar-certidao" className="mt-4 flex gap-2">
          <label htmlFor="codigo" className="sr-only">
            Código de validação
          </label>
          <input
            id="codigo"
            name="codigo"
            defaultValue={codigo ?? digitado}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
            required
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm uppercase shadow-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button type="submit" className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            Validar
          </button>
        </Form>

        {digitado && !codigo && (
          <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Código em formato inválido. Ele tem 16 letras e números, como ABCD-EFGH-JKLM-NPQR.
          </p>
        )}
        {codigo && !certidao && (
          <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Nenhuma certidão encontrada com este código. Confira se foi digitado corretamente.
          </p>
        )}
        {certidao && <Resultado certidao={certidao} />}

        <p className="mt-6 text-xs text-zinc-500">
          Sistema de demonstração com dados fictícios. <Link href="/login" className="underline">Entrar no sistema</Link>
        </p>
      </div>
    </main>
  );
}

type Encontrada = NonNullable<Awaited<ReturnType<typeof buscarCertidaoPorCodigo>>>;

function Resultado({ certidao }: { certidao: Encontrada }) {
  const validaAte = dataParaIso(certidao.validaAte);
  const valida = certidaoValida(validaAte, hojeIso());

  return (
    <div
      role="status"
      className={`mt-4 rounded-md border px-4 py-3 text-sm ${
        valida
          ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
      }`}
    >
      <p className="font-semibold">
        {valida ? "Certidão autêntica e dentro da validade." : `Certidão autêntica, mas vencida em ${formatarDataIso(validaAte)}.`}
      </p>
      <dl className="mt-3 space-y-1">
        <div>
          <dt className="inline font-medium">Tipo: </dt>
          <dd className="inline">{TITULOS_CERTIDAO[certidao.tipo]}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Número: </dt>
          <dd className="inline tabular-nums">{formatarNumeroCertidao(certidao.numero, certidao.ano)}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Contribuinte: </dt>
          <dd className="inline">
            {certidao.nome} · <span className="tabular-nums">{mascararDocumento(certidao.documento)}</span>
          </dd>
        </div>
        <div>
          <dt className="inline font-medium">Emitida em: </dt>
          <dd className="inline tabular-nums">{formatarDataHora(certidao.emitidaEm)}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Válida até: </dt>
          <dd className="inline tabular-nums">{formatarDataIso(validaAte)}</dd>
        </div>
      </dl>
    </div>
  );
}
