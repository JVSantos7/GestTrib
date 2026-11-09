// Mostrado na hora em que o usuário clica num link, enquanto o servidor busca os dados da página.
// Um só arquivo aqui no grupo (sistema) vale para todas as telas internas: o cabeçalho e o menu
// continuam na tela, e só a área do conteúdo vira este "esqueleto" até a página chegar.
export default function Carregando() {
  return (
    <div className="max-w-6xl animate-pulse" role="status" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="h-7 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="h-9 min-w-56 flex-1 rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-32 rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-24 rounded-md bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="mt-6 space-y-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        {Array.from({ length: 8 }, (_, linha) => (
          <div key={linha} className="h-5 rounded bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    </div>
  );
}
