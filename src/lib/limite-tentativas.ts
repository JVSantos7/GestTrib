/**
 * Limite de tentativas por chave (ex.: o IP de quem cria conta), numa janela de tempo deslizante.
 *
 * Fica na memória do servidor: se o sistema rodar em várias instâncias, cada uma conta as suas.
 * Para uma demonstração isso basta para frear um robô criando contas em série.
 */
export function criarLimitador({ maximo, janelaMs }: { maximo: number; janelaMs: number }) {
  const tentativas = new Map<string, number[]>();

  function limparAntigas(agora: number) {
    for (const [chave, horarios] of tentativas) {
      if (horarios.every((horario) => agora - horario >= janelaMs)) tentativas.delete(chave);
    }
  }

  return {
    /** Registra a tentativa e diz se ela pode seguir. `agora` existe para os testes. */
    permitir(chave: string, agora = Date.now()): boolean {
      // Sem limpeza, cada IP novo ficaria guardado para sempre.
      if (tentativas.size > 1000) limparAntigas(agora);

      const recentes = (tentativas.get(chave) ?? []).filter((horario) => agora - horario < janelaMs);
      if (recentes.length >= maximo) {
        tentativas.set(chave, recentes);
        return false;
      }
      recentes.push(agora);
      tentativas.set(chave, recentes);
      return true;
    },
  };
}
