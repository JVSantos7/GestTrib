"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

/** Encerra a sessão: apaga o registro no banco e o cookie do navegador. */
export async function sair() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
