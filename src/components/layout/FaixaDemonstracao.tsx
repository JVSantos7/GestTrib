// Faixa fixa no topo das telas internas quando o sistema está aberto ao público
// (botões de demonstração ou cadastro aberto). Explica de onde vêm os números do painel
// e avisa que tudo o que for digitado fica visível para os outros visitantes.
export function FaixaDemonstracao() {
  return (
    <div
      role="note"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200 print:hidden"
    >
      <strong className="font-semibold">Ambiente de demonstração.</strong> Os dados são fictícios e compartilhados por
      todos que testam o sistema. <strong className="font-semibold">Não cadastre dados reais</strong> (CPF, nome ou
      endereço de pessoas de verdade).
    </div>
  );
}
