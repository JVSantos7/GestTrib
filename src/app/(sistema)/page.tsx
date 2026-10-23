import { exigirPermissaoPagina } from "@/server/sessao";

export default async function Inicio() {
  const usuario = await exigirPermissaoPagina();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Olá, {usuario.nome.split(" ")[0]}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Bem-vindo ao GestTrib, sistema de gestão tributária municipal. Os
        módulos serão liberados no menu conforme forem implementados.
      </p>
    </div>
  );
}
