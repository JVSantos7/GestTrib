const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids vêm da URL; um valor fora do formato UUID faria o banco rejeitar a consulta. */
export function ehUuid(valor: string): boolean {
  return UUID.test(valor);
}
