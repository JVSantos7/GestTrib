export type Paginacao = {
  /** Página atual, já ajustada para existir (1 quando não há registros). */
  pagina: number;
  totalPaginas: number;
  total: number;
  /** Posição do primeiro e do último item da página, contando a partir de 1. */
  inicio: number;
  fim: number;
  /** Quantos registros pular na consulta. */
  pular: number;
};

export function calcularPaginacao(total: number, paginaPedida: number, porPagina: number): Paginacao {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  // Uma página além da última (ex.: link antigo após exclusões) cai na última.
  const pagina = Math.min(Math.max(1, paginaPedida), totalPaginas);
  const pular = (pagina - 1) * porPagina;

  return {
    pagina,
    totalPaginas,
    total,
    inicio: total === 0 ? 0 : pular + 1,
    fim: Math.min(pular + porPagina, total),
    pular,
  };
}
