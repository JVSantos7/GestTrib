import DecimalBase from "decimal.js";
import type { AcaoAuditoria } from "@/generated/prisma/enums";

// Funções puras do painel de início (sem banco), testadas em painel.test.ts.

const Decimal = DecimalBase.clone({ precision: 40 });

// ---------------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------------

/** Converte "2026-11-14" numa data UTC: as contas de dia e mês não dependem do fuso do servidor. */
function utc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** "2026-11-14" + 30 → "2026-12-14". Aceita dias negativos. */
export function somarDias(iso: string, dias: number): string {
  const data = utc(iso);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

const porExtenso = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-11-14" → "sábado, 14 de novembro de 2026". */
export function formatarDataPorExtenso(iso: string): string {
  return porExtenso.format(utc(iso));
}

// ---------------------------------------------------------------------------
// Arrecadação por mês (gráfico)
// ---------------------------------------------------------------------------

export type Mes = {
  /** "2026-11" */
  chave: string;
  /** "nov" (eixo do gráfico) */
  rotulo: string;
  /** "novembro de 2026" (dica e tabela para leitores de tela) */
  rotuloLongo: string;
};

const mesCurto = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
const mesLongo = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

/** Os `quantidade` meses que terminam no mês de `hoje`, do mais antigo para o atual. */
export function ultimosMeses(hoje: string, quantidade: number): Mes[] {
  const [ano, mes] = hoje.split("-").map(Number);
  return Array.from({ length: quantidade }, (_, indice) => {
    const data = new Date(Date.UTC(ano, mes - 1 - (quantidade - 1 - indice), 1));
    return {
      chave: data.toISOString().slice(0, 7),
      // O Intl devolve "nov." com ponto; no eixo fica só "nov".
      rotulo: mesCurto.format(data).replace(".", ""),
      rotuloLongo: mesLongo.format(data),
    };
  });
}

/** Primeiro dia do mês ("2026-06" → "2026-06-01"). */
export function inicioDoMes(mes: Mes): string {
  return `${mes.chave}-01`;
}

export type MesComValor = Mes & { valor: string };

/**
 * Soma os totais diários (data ISO + valor em texto decimal) dentro de cada mês.
 * Mês sem pagamento aparece com "0.00", para o gráfico não pular meses.
 */
export function somarPorMes(dias: { data: string; valor: string }[], meses: Mes[]): MesComValor[] {
  const totais = new Map(meses.map((mes) => [mes.chave, new Decimal(0)]));
  for (const dia of dias) {
    const chave = dia.data.slice(0, 7);
    const total = totais.get(chave);
    if (total) totais.set(chave, total.plus(dia.valor));
  }
  return meses.map((mes) => ({ ...mes, valor: totais.get(mes.chave)!.toFixed(2) }));
}

/**
 * Altura da barra em % da maior. É só para desenhar (vira `style.height`), por isso pode
 * ser número; o valor em reais exibido continua vindo do texto decimal.
 */
export function alturaRelativa(valor: string, maximo: string): number {
  const base = new Decimal(maximo);
  if (base.isZero()) return 0;
  return new Decimal(valor).dividedBy(base).times(100).toDecimalPlaces(1).toNumber();
}

// ---------------------------------------------------------------------------
// Atividade recente (auditoria)
// ---------------------------------------------------------------------------

export const ROTULOS_ENTIDADE: Record<string, string> = {
  Contribuinte: "Contribuinte",
  Imovel: "Imóvel",
  ParametroIptu: "Parâmetros do IPTU",
  LancamentoIptu: "Lançamento de IPTU",
  Guia: "Guia",
  Certidao: "Certidão",
  Usuario: "Usuário",
};

/** Páginas de detalhe que abrem pelo id do registro. Parâmetros do IPTU abrem pelo exercício, então ficam sem link. */
const CAMINHOS: Record<string, string> = {
  Contribuinte: "/contribuintes",
  Imovel: "/imoveis",
  LancamentoIptu: "/iptu",
  Guia: "/guias",
  Certidao: "/certidoes",
  Usuario: "/usuarios",
};

export type RegistroAtividade = {
  id: string;
  entidade: string;
  entidadeId: string;
  acao: AcaoAuditoria;
  /** Texto de `descreverDetalhe` (ex.: "Baixa de pagamento"), ou null. */
  detalhe: string | null;
  usuarioId: string | null;
  responsavel: string | null;
  criadoEm: Date;
};

export type ItemAtividade = RegistroAtividade & {
  /** Quantos registros iguais e seguidos este item representa (ex.: lançamento do IPTU de 120 imóveis). */
  quantidade: number;
  /** Página do registro, quando há uma só e ele não foi excluído. */
  href: string | null;
};

/** Registros a menos de 1 minuto um do outro, com o mesmo autor, entidade e ação, viram um item só. */
const JANELA_MS = 60_000;

/**
 * Junta registros seguidos da mesma operação. Sem isso, lançar o IPTU do município inteiro
 * (um registro de auditoria por imóvel) encheria a lista com o mesmo item repetido.
 * `registros` vem do mais recente para o mais antigo.
 */
export function agruparAtividade(registros: RegistroAtividade[], limite: number): ItemAtividade[] {
  const grupos: { primeiro: RegistroAtividade; ultimo: RegistroAtividade; quantidade: number }[] = [];
  for (const registro of registros) {
    const atual = grupos.at(-1);
    const mesmaOperacao =
      atual &&
      atual.primeiro.entidade === registro.entidade &&
      atual.primeiro.acao === registro.acao &&
      atual.primeiro.usuarioId === registro.usuarioId &&
      atual.primeiro.detalhe === registro.detalhe &&
      atual.ultimo.criadoEm.getTime() - registro.criadoEm.getTime() <= JANELA_MS;
    if (mesmaOperacao) {
      atual.ultimo = registro;
      atual.quantidade += 1;
    } else {
      if (grupos.length === limite) break;
      grupos.push({ primeiro: registro, ultimo: registro, quantidade: 1 });
    }
  }
  return grupos.map(({ primeiro, quantidade }) => {
    const caminho = CAMINHOS[primeiro.entidade];
    const temPagina = caminho && quantidade === 1 && primeiro.acao !== "EXCLUSAO";
    return { ...primeiro, quantidade, href: temPagina ? `${caminho}/${primeiro.entidadeId}` : null };
  });
}
