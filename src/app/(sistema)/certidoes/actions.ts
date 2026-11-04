"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoAcao } from "@/components/form/FormAcao";
import { emitirCertidao } from "@/server/services/certidoes";
import { ContribuinteNaoEncontradoError } from "@/server/services/contribuintes";
import { AcessoNegadoError, exigirPermissaoAcao } from "@/server/sessao";

// Usada com `useActionState`, que também passa o estado anterior e o FormData; a emissão não precisa deles.
export async function emitirCertidaoAcao(contribuinteId: string): Promise<EstadoAcao> {
  let certidaoId: string;
  try {
    const responsavel = await exigirPermissaoAcao({ certidao: ["emitir"] });
    certidaoId = (await emitirCertidao(contribuinteId, responsavel)).id;
  } catch (erro) {
    if (erro instanceof AcessoNegadoError || erro instanceof ContribuinteNaoEncontradoError) return { erro: erro.message };
    throw erro;
  }

  revalidatePath(`/contribuintes/${contribuinteId}`);
  // Fora do try: o redirect funciona lançando um erro especial, que o catch não pode engolir.
  redirect(`/certidoes/${certidaoId}`);
}
